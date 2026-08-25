import 'server-only';

import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractPdfText } from './pdf-text';
import { buildSystemPrompt, MODEL_ID, PROMPT_VERSION } from './brief-prompt';
import { containsMoneyPattern } from './brief-guard';

const MAX_ATTEMPTS = 2; // one try, one retry on a guard rejection

// Called after a document's Drive write and metadata row have already
// succeeded. Never throws, and the caller does not await anything past
// this that could roll the upload back -- the document stays uploaded,
// visible, and downloadable no matter what happens in here. The only
// externally visible effect of a failure is documents.brief_generation_status.
export async function generateDocumentBrief(params: {
  documentId: string;
  fileBuffer: Buffer;
  mimeType: string;
  language: string;
}): Promise<void> {
  const admin = createAdminClient();

  try {
    const text = await extractPdfText(params.fileBuffer, params.mimeType);
    if (!text) {
      await admin
        .from('documents')
        .update({ brief_generation_status: 'no_text_layer' })
        .eq('id', params.documentId);
      return;
    }

    const sourceTextSha256 = createHash('sha256').update(text, 'utf8').digest('hex');
    const systemPrompt = buildSystemPrompt(params.language);
    const client = new Anthropic();

    let body: string | undefined;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !body; attempt += 1) {
      const response = await client.messages.create({
        model: MODEL_ID,
        max_tokens: 4096,
        output_config: { effort: 'low' },
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
      });

      let candidate: string | undefined;
      for (const block of response.content) {
        if (block.type === 'text') {
          candidate = block.text.trim();
          break;
        }
      }

      if (candidate && !containsMoneyPattern(candidate)) {
        body = candidate;
      }
    }

    if (!body) {
      await admin
        .from('documents')
        .update({ brief_generation_status: 'brief_unavailable' })
        .eq('id', params.documentId);
      return;
    }

    const { error: insertError } = await admin.from('document_briefs').insert({
      document_id: params.documentId,
      language: params.language,
      body,
      model_id: MODEL_ID,
      prompt_version: PROMPT_VERSION,
      source_text_sha256: sourceTextSha256,
    });

    await admin
      .from('documents')
      .update({ brief_generation_status: insertError ? 'brief_unavailable' : 'generated' })
      .eq('id', params.documentId);
  } catch {
    await admin
      .from('documents')
      .update({ brief_generation_status: 'brief_unavailable' })
      .eq('id', params.documentId);
  }
}

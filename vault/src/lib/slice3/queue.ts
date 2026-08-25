import 'server-only';

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { streamDocumentFromDrive } from '@/lib/google/drive';
import { extractPdfText } from './pdf-text';

export interface DraftBriefRow {
  id: string;
  document_id: string;
  language: string;
  body: string;
  model_id: string;
  prompt_version: string;
  source_text_sha256: string;
  generated_at: string;
  document_title: string;
  drive_file_id: string;
  property_address: string;
  client_name: string;
}

export async function loadDraftBriefs(admin: SupabaseClient): Promise<DraftBriefRow[]> {
  const { data } = await admin
    .from('document_briefs')
    .select(
      `id, document_id, language, body, model_id, prompt_version, source_text_sha256, generated_at,
       documents(title, drive_file_id, properties(address, clients(name)))`
    )
    .eq('status', 'draft')
    .order('generated_at', { ascending: false });

  return (data ?? []).map((row) => {
    const doc = row.documents as unknown as {
      title: string;
      drive_file_id: string;
      properties: { address: string; clients: { name: string } | null } | null;
    } | null;
    return {
      id: row.id,
      document_id: row.document_id,
      language: row.language,
      body: row.body,
      model_id: row.model_id,
      prompt_version: row.prompt_version,
      source_text_sha256: row.source_text_sha256,
      generated_at: row.generated_at,
      document_title: doc?.title ?? 'Unknown',
      drive_file_id: doc?.drive_file_id ?? '',
      property_address: doc?.properties?.address ?? 'Unknown',
      client_name: doc?.properties?.clients?.name ?? 'Unknown',
    };
  });
}

// document_briefs stores a hash of the source text, not the text itself
// (see the 0007 migration comment) -- this re-extracts it from Drive for
// side-by-side display and checks it against source_text_sha256, which
// is what that hash is actually for.
export async function extractSourceTextFromDrive(
  driveFileId: string,
  expectedHash: string
): Promise<{ text: string | null; hashMatches: boolean }> {
  const stream = await streamDocumentFromDrive(driveFileId);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const fileBuffer = Buffer.concat(chunks);
  const text = await extractPdfText(fileBuffer, 'application/pdf');
  if (!text) {
    return { text: null, hashMatches: false };
  }
  const actualHash = createHash('sha256').update(text, 'utf8').digest('hex');
  return { text, hashMatches: actualHash === expectedHash };
}

'use server';

import { revalidatePath } from 'next/cache';
import { requireClient } from '@/lib/portal';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensurePropertyFolder, uploadDocumentToDrive } from '@/lib/google/drive';
import { CLIENT_DOC_TYPES } from '@/lib/copy';
import { generateDocumentBrief } from '@/lib/slice3/generate-brief';

export type UploadResult = { ok: true } | { ok: false; error: string };

// Mirrors the operator upload path in admin/actions.ts: verify ownership
// with the session-scoped client (RLS means this simply returns nothing
// if the property isn't the signed-in client's), then do the actual Drive
// upload and metadata write with the admin client, exactly as an operator
// upload would. doc_type is restricted to the client-facing subset --
// clients can't file their own upload as, say, an operator-issued invoice.
export async function uploadClientDocument(propertyId: string, formData: FormData): Promise<UploadResult> {
  const { supabase, user, client } = await requireClient();

  const { data: property } = await supabase
    .from('properties')
    .select('id, external_crm_ref, prop_ref, address, drive_folder_id')
    .eq('id', propertyId)
    .eq('client_id', client.id)
    .single();

  if (!property) {
    return { ok: false, error: 'Asset not found.' };
  }

  const docType = String(formData.get('doc_type') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const file = formData.get('file') as File | null;

  if (!CLIENT_DOC_TYPES.includes(docType as (typeof CLIENT_DOC_TYPES)[number])) {
    return { ok: false, error: 'Choose a document type.' };
  }
  if (!title || !file || file.size === 0) {
    return { ok: false, error: 'Title and file are required.' };
  }

  const admin = createAdminClient();

  let folderId = property.drive_folder_id as string | null;
  if (!folderId) {
    folderId = await ensurePropertyFolder(
      property.external_crm_ref ?? property.prop_ref,
      property.address
    );
    await admin.from('properties').update({ drive_folder_id: folderId }).eq('id', property.id);
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const driveFileId = await uploadDocumentToDrive({
    folderId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileBuffer,
  });

  const { data: document, error: insertError } = await admin
    .from('documents')
    .insert({
      property_id: property.id,
      doc_type: docType,
      title,
      drive_file_id: driveFileId,
      mime_type: file.type || 'application/octet-stream',
      uploaded_by: user.id,
    })
    .select('id')
    .single();

  if (insertError || !document) {
    return { ok: false, error: insertError?.message ?? 'Upload failed.' };
  }

  // Enhancement layer, not a gate -- see the comment in admin/actions.ts's
  // uploadDocument for why this is awaited rather than fire-and-forget.
  await generateDocumentBrief({
    documentId: document.id,
    fileBuffer,
    mimeType: file.type || 'application/octet-stream',
    language: client.language,
  });

  revalidatePath(`/portal/properties/${property.id}`);
  return { ok: true };
}

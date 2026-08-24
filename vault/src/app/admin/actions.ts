'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isOperatorEmail } from '@/lib/operators';
import { ensurePropertyFolder, uploadDocumentToDrive } from '@/lib/google/drive';
import { syncFromCrm, type CrmSyncResult } from '@/lib/crm-sync/sync';

const TEST_DOMAIN = 'klehomerie.com';

async function requireOperator() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isOperatorEmail(user.email)) {
    throw new Error('Not authorized.');
  }
  return user;
}

export async function runCrmSync(): Promise<CrmSyncResult> {
  await requireOperator();
  const result = await syncFromCrm();
  revalidatePath('/admin');
  return result;
}

export type InviteResult = { ok: true } | { ok: false; error: string };

// Sends a portal invite to an existing (CRM-synced) client row. This does
// not create a client -- the CRM sync is the only thing that does that.
// Never invites a klehomerie.com address, independent of whatever the sync
// already filtered out, per the "enforce this at the invite function, not
// only at sync" instruction.
export async function inviteClient(clientId: string): Promise<InviteResult> {
  await requireOperator();
  const admin = createAdminClient();

  const { data: client, error } = await admin
    .from('clients')
    .select('id, email, auth_user_id')
    .eq('id', clientId)
    .single();

  if (error || !client) {
    return { ok: false, error: 'Client not found.' };
  }
  if (client.email.trim().toLowerCase().endsWith(`@${TEST_DOMAIN}`)) {
    return { ok: false, error: 'Internal test domain: portal invites are blocked for klehomerie.com addresses.' };
  }
  if (client.auth_user_id) {
    return { ok: false, error: 'This client already has portal access.' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    client.email,
    { redirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined }
  );

  if (inviteError || !invited.user) {
    return { ok: false, error: inviteError?.message ?? 'Invite failed.' };
  }

  await admin.from('clients').update({ auth_user_id: invited.user.id }).eq('id', client.id);
  revalidatePath('/admin');
  return { ok: true };
}

export type UploadResult = { ok: true } | { ok: false; error: string };

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const propertyId = String(formData.get('property_id') ?? '');
  const docType = String(formData.get('doc_type') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const file = formData.get('file') as File | null;

  if (!propertyId || !docType || !title || !file || file.size === 0) {
    return { ok: false, error: 'All fields are required.' };
  }

  const { data: property, error: propertyError } = await admin
    .from('properties')
    .select('id, external_crm_ref, prop_ref, address, drive_folder_id')
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    return { ok: false, error: 'Asset not found.' };
  }

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

  const { error: insertError } = await admin.from('documents').insert({
    property_id: property.id,
    doc_type: docType,
    title,
    drive_file_id: driveFileId,
    mime_type: file.type || 'application/octet-stream',
    uploaded_by: operator.id,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidatePath(`/admin/properties/${property.id}`);
  return { ok: true };
}

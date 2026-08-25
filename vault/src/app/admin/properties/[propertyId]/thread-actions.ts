'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOperator } from '../../actions';
import {
  insertMessage,
  toggleReaction as toggleReactionMutation,
  editMessageBody,
  withdrawMessage as withdrawMessageMutation,
  type MutationResult,
} from '@/lib/slice2/mutations';

export async function postOperatorMessage(
  propertyId: string,
  threadId: string,
  formData: FormData
): Promise<MutationResult> {
  const operator = await requireOperator();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { ok: false, error: 'Message cannot be empty.' };

  const result = await insertMessage(createAdminClient(), {
    threadId,
    authorId: operator.id,
    authorRole: 'operator',
    body,
  });
  if (result.ok) revalidatePath(`/admin/properties/${propertyId}`);
  return result;
}

export type CreateAuthorizationResult = { ok: true } | { ok: false; error: string };

// Operator raises a pending ask. This is the FIRST row in an authorization
// lineage -- item_id defaults to the row's own id, status defaults to
// 'pending' (both handled by the table's own defaults). A message with
// ref_type='authorization' is posted right after so the ask renders inline
// in the chat as a card.
export async function createAuthorization(
  propertyId: string,
  threadId: string,
  formData: FormData
): Promise<CreateAuthorizationResult> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const assetClass = String(formData.get('asset_class') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const amountEuros = String(formData.get('amount_euros') ?? '').trim();
  const docId = String(formData.get('doc_id') ?? '').trim();

  if (!assetClass || !title || !amountEuros) {
    return { ok: false, error: 'Asset class, title, and amount are required.' };
  }

  const amountNetCents = Math.round(Number(amountEuros) * 100);
  if (!Number.isFinite(amountNetCents) || amountNetCents < 0) {
    return { ok: false, error: 'Enter a valid amount.' };
  }

  const { data: authorization, error } = await admin
    .from('authorizations')
    .insert({
      thread_id: threadId,
      property_id: propertyId,
      asset_class: assetClass,
      title,
      description: description || null,
      amount_net_cents: amountNetCents,
      doc_id: docId || null,
      created_by: operator.id,
    })
    .select('item_id')
    .single();

  if (error || !authorization) {
    return { ok: false, error: error?.message ?? 'Could not create the authorization.' };
  }

  await insertMessage(admin, {
    threadId,
    authorId: operator.id,
    authorRole: 'operator',
    body: null,
    refType: 'authorization',
    refId: authorization.item_id,
  });

  revalidatePath(`/admin/properties/${propertyId}`);
  return { ok: true };
}

export async function toggleReaction(
  propertyId: string,
  messageId: string,
  emoji: string
): Promise<MutationResult> {
  const operator = await requireOperator();
  const result = await toggleReactionMutation(createAdminClient(), {
    messageId,
    userId: operator.id,
    emoji,
  });
  if (result.ok) revalidatePath(`/admin/properties/${propertyId}`);
  return result;
}

// The admin client bypasses RLS entirely, so unlike the portal side
// (where "authors edit or withdraw their own messages" is enforced by
// policy), authorship has to be checked by hand here before mutating --
// otherwise any operator action could edit or withdraw a client's message.
async function requireOwnMessage(operatorId: string, messageId: string): Promise<MutationResult> {
  const { data: message } = await createAdminClient()
    .from('messages')
    .select('author_id')
    .eq('id', messageId)
    .single();
  if (!message || message.author_id !== operatorId) {
    return { ok: false, error: 'You can only edit or withdraw your own messages.' };
  }
  return { ok: true };
}

export async function editMessage(
  propertyId: string,
  messageId: string,
  body: string
): Promise<MutationResult> {
  const operator = await requireOperator();
  const ownership = await requireOwnMessage(operator.id, messageId);
  if (!ownership.ok) return ownership;
  const result = await editMessageBody(createAdminClient(), { messageId, body });
  if (result.ok) revalidatePath(`/admin/properties/${propertyId}`);
  return result;
}

export async function withdrawMessage(propertyId: string, messageId: string): Promise<MutationResult> {
  const operator = await requireOperator();
  const ownership = await requireOwnMessage(operator.id, messageId);
  if (!ownership.ok) return ownership;
  const result = await withdrawMessageMutation(createAdminClient(), { messageId });
  if (result.ok) revalidatePath(`/admin/properties/${propertyId}`);
  return result;
}

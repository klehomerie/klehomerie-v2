'use server';

import { revalidatePath } from 'next/cache';
import { requireClient } from '@/lib/portal';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDecisionContext } from '@/lib/slice2/request-context';
import {
  insertMessage,
  toggleReaction as toggleReactionMutation,
  editMessageBody,
  withdrawMessage as withdrawMessageMutation,
  type MutationResult,
} from '@/lib/slice2/mutations';

export async function postClientMessage(
  propertyId: string,
  threadId: string,
  formData: FormData
): Promise<MutationResult> {
  const { supabase, user } = await requireClient();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { ok: false, error: 'Message cannot be empty.' };

  // Row Level Security ("clients post in their own thread") is what
  // actually enforces that threadId belongs to this client -- this call
  // uses the session-scoped client, not the admin client, so a forged
  // threadId for someone else's property is rejected by Postgres, not just
  // by application code.
  const result = await insertMessage(supabase, {
    threadId,
    authorId: user.id,
    authorRole: 'client',
    body,
  });
  if (result.ok) revalidatePath(`/portal/properties/${propertyId}`);
  return result;
}

export type DecisionResult = { ok: true } | { ok: false; error: string };

// Ledger row first, then a system message -- if the message insert fails,
// the decision still stands. Never the reverse order.
export async function decideAuthorization(
  propertyId: string,
  threadId: string,
  itemId: string,
  decision: 'approved' | 'declined'
): Promise<DecisionResult> {
  const { supabase, user } = await requireClient();
  const { ip, userAgent } = await getDecisionContext();

  const { error } = await supabase.from('authorizations').insert({
    item_id: itemId,
    thread_id: threadId,
    property_id: propertyId,
    // asset_class/title/amount_net_cents/vat_rate/doc_id are required
    // columns, but "current state" is read from the latest row per
    // item_id -- copy them forward from the ask so this decision row is
    // self-describing without needing a join to reconstruct it.
    ...(await copyForwardFromLatest(supabase, itemId)),
    status: decision,
    decided_at: new Date().toISOString(),
    decided_by: user.id,
    decided_ip: ip,
    decided_user_agent: userAgent,
    created_by: user.id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Bypasses RLS deliberately: no client-facing policy allows
  // author_role='system', and this is a controlled, server-only write.
  await insertMessage(createAdminClient(), {
    threadId,
    authorId: user.id,
    authorRole: 'system',
    body: decision === 'approved' ? 'Authorization approved.' : 'Authorization declined.',
  });

  revalidatePath(`/portal/properties/${propertyId}`);
  return { ok: true };
}

async function copyForwardFromLatest(
  supabase: Awaited<ReturnType<typeof requireClient>>['supabase'],
  itemId: string
) {
  const { data } = await supabase
    .from('authorizations')
    .select('asset_class, title, description, amount_net_cents, vat_rate, vendor_id, doc_id')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data ?? {};
}

export async function toggleReaction(
  propertyId: string,
  messageId: string,
  emoji: string
): Promise<MutationResult> {
  const { supabase, user } = await requireClient();
  const result = await toggleReactionMutation(supabase, { messageId, userId: user.id, emoji });
  if (result.ok) revalidatePath(`/portal/properties/${propertyId}`);
  return result;
}

export async function editMessage(
  propertyId: string,
  messageId: string,
  body: string
): Promise<MutationResult> {
  const { supabase } = await requireClient();
  const result = await editMessageBody(supabase, { messageId, body });
  if (result.ok) revalidatePath(`/portal/properties/${propertyId}`);
  return result;
}

export async function withdrawMessage(propertyId: string, messageId: string): Promise<MutationResult> {
  const { supabase } = await requireClient();
  const result = await withdrawMessageMutation(supabase, { messageId });
  if (result.ok) revalidatePath(`/portal/properties/${propertyId}`);
  return result;
}

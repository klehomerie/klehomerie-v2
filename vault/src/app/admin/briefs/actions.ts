'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOperator } from '../actions';

export type QueueActionResult = { ok: true } | { ok: false; error: string };

export async function releaseBrief(briefId: string): Promise<QueueActionResult> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const { error } = await admin
    .from('document_briefs')
    .update({ status: 'released', released_at: new Date().toISOString(), released_by: operator.id })
    .eq('id', briefId)
    .eq('status', 'draft');

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/briefs');
  return { ok: true };
}

// Batch release is permitted; batch edit is not -- this is the only bulk
// action, and it never touches edited_body.
export async function releaseBriefs(briefIds: string[]): Promise<QueueActionResult> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const { error } = await admin
    .from('document_briefs')
    .update({ status: 'released', released_at: new Date().toISOString(), released_by: operator.id })
    .in('id', briefIds)
    .eq('status', 'draft');

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/briefs');
  return { ok: true };
}

export async function editAndReleaseBrief(briefId: string, editedBody: string): Promise<QueueActionResult> {
  const operator = await requireOperator();
  const admin = createAdminClient();

  const trimmed = editedBody.trim();
  if (!trimmed) {
    return { ok: false, error: 'Edited summary cannot be empty.' };
  }

  const { error } = await admin
    .from('document_briefs')
    .update({
      edited_body: trimmed,
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: operator.id,
    })
    .eq('id', briefId)
    .eq('status', 'draft');

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/briefs');
  return { ok: true };
}

// Terminal. Does not retry, does not notify.
export async function rejectBrief(briefId: string): Promise<QueueActionResult> {
  await requireOperator();
  const admin = createAdminClient();

  const { error } = await admin
    .from('document_briefs')
    .update({ status: 'rejected' })
    .eq('id', briefId)
    .eq('status', 'draft');

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/briefs');
  return { ok: true };
}

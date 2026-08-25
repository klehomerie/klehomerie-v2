import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { AVAILABLE_REACTIONS } from './reactions';

export type MutationResult = { ok: true } | { ok: false; error: string };

export async function insertMessage(
  supabase: SupabaseClient,
  params: {
    threadId: string;
    authorId: string;
    authorRole: 'operator' | 'client' | 'system';
    body: string | null;
    refType?: 'authorization';
    refId?: string;
  }
): Promise<MutationResult> {
  const { error } = await supabase.from('messages').insert({
    thread_id: params.threadId,
    author_id: params.authorId,
    author_role: params.authorRole,
    body: params.body,
    ref_type: params.refType ?? null,
    ref_id: params.refId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Fixed emoji set, no picker. Clicking a reaction the user already left
// removes it.
export async function toggleReaction(
  supabase: SupabaseClient,
  params: { messageId: string; userId: string; emoji: string }
): Promise<MutationResult> {
  if (!AVAILABLE_REACTIONS.includes(params.emoji as (typeof AVAILABLE_REACTIONS)[number])) {
    return { ok: false, error: 'Unsupported reaction.' };
  }

  const { data: existing } = await supabase
    .from('reactions')
    .select('message_id')
    .eq('message_id', params.messageId)
    .eq('user_id', params.userId)
    .eq('emoji', params.emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('message_id', params.messageId)
      .eq('user_id', params.userId)
      .eq('emoji', params.emoji);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from('reactions').insert({
    message_id: params.messageId,
    user_id: params.userId,
    emoji: params.emoji,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Editable by the author for 15 minutes, then the guard_message_edit
// trigger freezes it -- this just surfaces that as a friendly error.
export async function editMessageBody(
  supabase: SupabaseClient,
  params: { messageId: string; body: string }
): Promise<MutationResult> {
  const { error } = await supabase
    .from('messages')
    .update({ body: params.body })
    .eq('id', params.messageId);
  if (error) {
    return {
      ok: false,
      error: error.message.includes('15 minutes')
        ? 'This message can no longer be edited.'
        : error.message,
    };
  }
  return { ok: true };
}

export async function withdrawMessage(
  supabase: SupabaseClient,
  params: { messageId: string }
): Promise<MutationResult> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

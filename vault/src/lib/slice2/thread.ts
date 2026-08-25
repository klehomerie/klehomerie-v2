import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { AVAILABLE_REACTIONS, type ReactionSummary } from './reactions';

export type { ReactionSummary };

export interface ThreadMessage {
  id: string;
  thread_id: string;
  author_id: string;
  author_role: 'operator' | 'client' | 'system';
  body: string | null;
  ref_type: string | null;
  ref_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface AuthorizationState {
  item_id: string;
  asset_class: string;
  title: string;
  description: string | null;
  amount_net_cents: number;
  vat_rate: number;
  doc_id: string | null;
  status: 'pending' | 'approved' | 'declined' | 'superseded';
  decided_at: string | null;
  created_at: string;
}

export interface ThreadView {
  threadId: string;
  messages: ThreadMessage[];
  authorizationsByItemId: Map<string, AuthorizationState>;
  reactionsByMessageId: Map<string, ReactionSummary[]>;
  documentTitlesById: Map<string, string>;
}

// Works with either the service-role admin client (operator pages) or the
// session-scoped client (portal pages) -- Row Level Security shapes what
// each actually sees; this function just assembles whatever comes back
// into a view the chat UI can render.
export async function getThreadView(
  supabase: SupabaseClient,
  propertyId: string,
  currentUserId: string
): Promise<ThreadView | null> {
  const { data: thread } = await supabase
    .from('threads')
    .select('id')
    .eq('property_id', propertyId)
    .single();

  if (!thread) return null;

  const { data: messages } = await supabase
    .from('messages')
    .select('id, thread_id, author_id, author_role, body, ref_type, ref_id, deleted_at, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  const messageRows = (messages ?? []) as ThreadMessage[];

  const itemIds = Array.from(
    new Set(
      messageRows
        .filter((message) => message.ref_type === 'authorization' && message.ref_id)
        .map((message) => message.ref_id as string)
    )
  );

  const authorizationsByItemId = new Map<string, AuthorizationState>();
  if (itemIds.length > 0) {
    const { data: authRows } = await supabase
      .from('authorizations')
      .select(
        'item_id, asset_class, title, description, amount_net_cents, vat_rate, doc_id, status, decided_at, created_at'
      )
      .in('item_id', itemIds)
      .order('created_at', { ascending: true });

    // "Current state is the latest row for a logical item" -- keep
    // overwriting as we walk rows in ascending created_at order, so the
    // last write per item_id wins.
    for (const row of (authRows ?? []) as AuthorizationState[]) {
      authorizationsByItemId.set(row.item_id, row);
    }
  }

  const messageIds = messageRows.map((message) => message.id);
  const reactionsByMessageId = new Map<string, ReactionSummary[]>();
  if (messageIds.length > 0) {
    const { data: reactionRows } = await supabase
      .from('reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);

    const counts = new Map<string, Map<string, ReactionSummary>>();
    for (const reaction of reactionRows ?? []) {
      const byEmoji = counts.get(reaction.message_id) ?? new Map<string, ReactionSummary>();
      const existing = byEmoji.get(reaction.emoji) ?? {
        emoji: reaction.emoji,
        count: 0,
        reactedByMe: false,
      };
      existing.count += 1;
      if (reaction.user_id === currentUserId) existing.reactedByMe = true;
      byEmoji.set(reaction.emoji, existing);
      counts.set(reaction.message_id, byEmoji);
    }
    for (const [messageId, byEmoji] of counts) {
      reactionsByMessageId.set(
        messageId,
        AVAILABLE_REACTIONS.map((emoji) => byEmoji.get(emoji)).filter(
          (summary): summary is ReactionSummary => Boolean(summary)
        )
      );
    }
  }

  const docIds = Array.from(
    new Set(
      Array.from(authorizationsByItemId.values())
        .map((authorization) => authorization.doc_id)
        .filter((docId): docId is string => Boolean(docId))
    )
  );
  const documentTitlesById = new Map<string, string>();
  if (docIds.length > 0) {
    const { data: docRows } = await supabase.from('documents').select('id, title').in('id', docIds);
    for (const doc of docRows ?? []) {
      documentTitlesById.set(doc.id, doc.title);
    }
  }

  return {
    threadId: thread.id,
    messages: messageRows,
    authorizationsByItemId,
    reactionsByMessageId,
    documentTitlesById,
  };
}

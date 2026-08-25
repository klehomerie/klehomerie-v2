'use client';

import { useTransition } from 'react';
import { AVAILABLE_REACTIONS, type ReactionSummary } from '@/lib/slice2/reactions';
import type { MutationResult } from '@/lib/slice2/mutations';

export function ReactionBar({
  messageId,
  reactions,
  onToggle,
}: {
  messageId: string;
  reactions: ReactionSummary[];
  onToggle: (messageId: string, emoji: string) => Promise<MutationResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const byEmoji = new Map(reactions.map((reaction) => [reaction.emoji, reaction]));

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {AVAILABLE_REACTIONS.map((emoji) => {
        const summary = byEmoji.get(emoji);
        const active = summary?.reactedByMe ?? false;
        return (
          <button
            key={emoji}
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await onToggle(messageId, emoji);
              })
            }
            className={`rounded-full border px-2 py-0.5 text-xs ${
              active
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {emoji}
            {summary && summary.count > 0 ? ` ${summary.count}` : ''}
          </button>
        );
      })}
    </div>
  );
}

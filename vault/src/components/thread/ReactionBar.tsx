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
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)] text-white'
                : 'border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:bg-[var(--secondary-bg)]'
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

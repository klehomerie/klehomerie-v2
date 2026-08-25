'use client';

import { useState, useTransition } from 'react';
import type { MutationResult } from '@/lib/slice2/mutations';

export function MessageActions({
  messageId,
  body,
  createdAt,
  onEdit,
  onWithdraw,
}: {
  messageId: string;
  body: string;
  createdAt: string;
  onEdit: (messageId: string, body: string) => Promise<MutationResult>;
  onWithdraw: (messageId: string) => Promise<MutationResult>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Lazy initializer so this reads the clock once, at mount, rather than
  // during render itself -- revalidation after any action re-mounts this
  // with fresh data anyway, so staleness beyond that isn't a concern.
  const [mountedAt] = useState(() => Date.now());
  const editableUntil = new Date(createdAt).getTime() + 15 * 60 * 1000;
  const stillEditable = mountedAt < editableUntil;

  if (isEditing) {
    return (
      <div className="mt-1 space-y-1">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-[var(--border-color)] px-2 py-1 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await onEdit(messageId, draft);
                if (result.ok) {
                  setIsEditing(false);
                  setError(null);
                } else {
                  setError(result.error);
                }
              })
            }
            className="text-xs font-medium text-[var(--title-color)] underline disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setDraft(body);
              setError(null);
            }}
            className="text-xs text-[var(--text-color)] underline"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-1 flex gap-2 text-xs text-[var(--text-color)]">
      {stillEditable && (
        <button type="button" onClick={() => setIsEditing(true)} className="underline">
          Edit
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await onWithdraw(messageId);
          })
        }
        className="underline disabled:opacity-50"
      >
        Withdraw
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}

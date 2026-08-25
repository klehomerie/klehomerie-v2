'use client';

import { useState, useTransition } from 'react';
import { inviteClient } from './actions';

export function InviteButton({ clientId, hasAccess }: { clientId: string; hasAccess: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (hasAccess) {
    return <span className="text-xs text-emerald-600">Portal access active</span>;
  }

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await inviteClient(clientId);
            setMessage(result.ok ? 'Invite sent.' : result.error);
          })
        }
        className="rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)] hover:bg-[var(--secondary-bg)] disabled:opacity-50"
      >
        {isPending ? 'Sending' : 'Send portal invite'}
      </button>
      {message && <p className="mt-1 text-xs text-[var(--text-color)]">{message}</p>}
    </div>
  );
}

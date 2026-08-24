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
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {isPending ? 'Sending' : 'Send portal invite'}
      </button>
      {message && <p className="mt-1 text-xs text-slate-500">{message}</p>}
    </div>
  );
}

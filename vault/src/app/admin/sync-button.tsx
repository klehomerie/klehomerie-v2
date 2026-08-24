'use client';

import { useState, useTransition } from 'react';
import { runCrmSync } from './actions';

export function SyncButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await runCrmSync();
            setMessage(
              result.ok
                ? `Sync complete. Read ${result.rowsRead}, wrote ${result.rowsWritten}, skipped ${result.rowsSkipped}.`
                : `Sync failed: ${result.error}`
            );
          })
        }
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Syncing' : 'Sync from CRM'}
      </button>
      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
    </div>
  );
}

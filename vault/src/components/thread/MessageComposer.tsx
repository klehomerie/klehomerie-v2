'use client';

import { useRef, useState, useTransition } from 'react';
import type { MutationResult } from '@/lib/slice2/mutations';

export function MessageComposer({
  action,
}: {
  action: (formData: FormData) => Promise<MutationResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const result = await action(formData);
            if (result.ok) {
              setError(null);
              formRef.current?.reset();
            } else {
              setError(result.error);
            }
          })
        }
        className="flex gap-2"
      >
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Write a message"
          className="flex-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="self-end rounded-xl bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Sending' : 'Send'}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

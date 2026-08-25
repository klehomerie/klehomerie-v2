'use client';

import { useRef, useState, useTransition } from 'react';
import { ASSET_CLASS_LABELS } from '@/lib/copy';
import type { CreateAuthorizationResult } from './thread-actions';

export function CreateAuthorizationForm({
  documents,
  action,
}: {
  documents: Array<{ id: string; title: string }>;
  action: (formData: FormData) => Promise<CreateAuthorizationResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await action(formData);
          setMessage(result.ok ? 'Authorization raised.' : result.error);
          if (result.ok) formRef.current?.reset();
        })
      }
      className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4"
    >
      <p className="text-sm font-medium text-[var(--title-color)]">Raise an authorization</p>
      <div>
        <label className="block text-xs font-medium text-[var(--text-color)]">Asset class</label>
        <select
          name="asset_class"
          required
          className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        >
          {Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-color)]">Title</label>
        <input
          name="title"
          required
          className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-color)]">Description</label>
        <textarea
          name="description"
          rows={2}
          className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-color)]">Net amount (€, excl. VAT)</label>
        <input
          name="amount_euros"
          type="number"
          step="0.01"
          min="0"
          required
          className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        />
      </div>
      {documents.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-color)]">Linked document (optional)</label>
          <select
            name="doc_id"
            defaultValue=""
            className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Raising' : 'Raise authorization'}
      </button>
      {message && <p className="text-sm text-[var(--text-color)]">{message}</p>}
    </form>
  );
}

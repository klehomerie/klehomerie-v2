'use client';

import { useRef, useState, useTransition } from 'react';
import { DOC_TYPE_LABELS, CLIENT_DOC_TYPES } from '@/lib/copy';
import type { UploadResult } from './document-actions';

export function ClientUploadForm({
  action,
}: {
  action: (formData: FormData) => Promise<UploadResult>;
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
          setMessage(result.ok ? 'Uploaded.' : result.error);
          if (result.ok) formRef.current?.reset();
        })
      }
      className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4"
    >
      <p className="text-sm font-medium text-[var(--title-color)]">Upload a document</p>
      <p className="text-xs text-[var(--text-color)]">
        Proof of payment, a signed agreement, insurance papers, or anything else relevant to this asset.
      </p>
      <div>
        <label className="block text-xs font-medium text-[var(--text-color)]">Document type</label>
        <select
          name="doc_type"
          required
          className="mt-1 w-full rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm"
        >
          {CLIENT_DOC_TYPES.map((docType) => (
            <option key={docType} value={docType}>
              {DOC_TYPE_LABELS[docType]}
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
        <label className="block text-xs font-medium text-[var(--text-color)]">File</label>
        <input type="file" name="file" required className="mt-1 w-full text-sm" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Uploading' : 'Upload document'}
      </button>
      {message && <p className="text-sm text-[var(--text-color)]">{message}</p>}
    </form>
  );
}

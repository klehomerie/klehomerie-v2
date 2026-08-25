'use client';

import { useState, useTransition } from 'react';
import { LANGUAGE_LABELS } from '@/lib/copy';
import type { DraftBriefRow } from '@/lib/slice3/queue';
import { releaseBrief, releaseBriefs, editAndReleaseBrief, rejectBrief } from './actions';

interface Row {
  draft: DraftBriefRow;
  sourceText: string | null;
  hashMatches: boolean;
}

export function BriefQueueList({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-3">
        <span className="text-sm text-[var(--text-color)]">{selected.size} selected</span>
        <button
          type="button"
          disabled={selected.size === 0 || isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await releaseBriefs(Array.from(selected));
              setMessage(result.ok ? 'Released.' : result.error);
              if (result.ok) setSelected(new Set());
            })
          }
          className="rounded-xl bg-[var(--accent-color)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Release selected
        </button>
        {message && <span className="text-xs text-[var(--text-color)]">{message}</span>}
      </div>

      {rows.map((row) => (
        <BriefQueueRow key={row.draft.id} row={row} selected={selected.has(row.draft.id)} onToggle={toggle} />
      ))}
    </div>
  );
}

function BriefQueueRow({
  row,
  selected,
  onToggle,
}: {
  row: Row;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const { draft, sourceText, hashMatches } = row;
  const [isEditing, setIsEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(draft.body);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(draft.id)}
            className="mt-1"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--title-color)]">{draft.document_title}</p>
            <p className="text-xs text-[var(--text-color)]">
              {draft.client_name} - {draft.property_address}
            </p>
          </div>
        </label>
        <span className="text-xs text-[var(--text-color)]">
          {LANGUAGE_LABELS[draft.language] ?? draft.language} - {new Date(draft.generated_at).toLocaleString()}
        </span>
      </div>

      {!hashMatches && (
        <p className="mt-2 text-xs text-red-600">
          The source document could not be re-verified against what this brief was generated from. Review carefully before releasing.
        </p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-color)]">Source text</p>
          <div className="mt-1 max-h-64 overflow-y-auto rounded-lg bg-[var(--bg-color)] p-3 text-xs whitespace-pre-wrap text-[var(--text-color)]">
            {sourceText ?? 'Could not be re-extracted from Drive.'}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-color)]">Generated brief</p>
          {isEditing ? (
            <textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-[var(--border-color)] p-3 text-sm"
            />
          ) : (
            <div className="mt-1 max-h-64 overflow-y-auto rounded-lg bg-[var(--bg-color)] p-3 text-sm text-[var(--text-color)]">
              {draftBody}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await editAndReleaseBrief(draft.id, draftBody);
                  if (result.ok) setResolved(true);
                  else setError(result.error);
                })
              }
              className="rounded-xl bg-[var(--accent-color)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Save and release
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setDraftBody(draft.body);
              }}
              className="rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await releaseBrief(draft.id);
                  if (result.ok) setResolved(true);
                  else setError(result.error);
                })
              }
              className="rounded-xl bg-[var(--accent-color)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Release
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)]"
            >
              Edit and release
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await rejectBrief(draft.id);
                  if (result.ok) setResolved(true);
                  else setError(result.error);
                })
              }
              className="rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import {
  ASSET_CLASS_LABELS,
  AUTHORIZATION_STATUS_LABELS,
  MOBILIZATION_CAP_CENTS,
  formatNetAmount,
  formatVatAmount,
  formatGrossAmount,
} from '@/lib/copy';
import type { AuthorizationState } from '@/lib/slice2/thread';
import type { DecisionResult } from '@/app/portal/properties/[propertyId]/thread-actions';

export function AuthorizationCard({
  authorization,
  document,
  canDecide,
  onDecide,
}: {
  authorization: AuthorizationState;
  // Deliberately just the original document's title/link -- never the
  // brief. "On an authorization card, the Approve button sits with the
  // ORIGINAL document link, never with the brief."
  document: { id: string; title: string } | null;
  canDecide: boolean;
  onDecide?: (itemId: string, decision: 'approved' | 'declined') => Promise<DecisionResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isBelowCap = authorization.amount_net_cents < MOBILIZATION_CAP_CENTS;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-color)]">
        {ASSET_CLASS_LABELS[authorization.asset_class] ?? authorization.asset_class}
      </p>
      <p className="mt-1 text-base font-semibold text-[var(--title-color)]">{authorization.title}</p>
      {authorization.description && (
        <p className="mt-1 text-sm text-[var(--text-color)]">{authorization.description}</p>
      )}

      <div className="km-figures mt-4 rounded-lg bg-[var(--bg-color)] p-3">
        <div className="flex items-baseline justify-between text-sm text-[var(--text-color)]">
          <span>Net</span>
          <span>{formatNetAmount(authorization.amount_net_cents)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm text-[var(--text-color)]">
          <span>VAT (24%)</span>
          <span>{formatVatAmount(authorization.amount_net_cents, authorization.vat_rate)}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-[var(--border-color)] pt-2">
          <span className="text-sm font-medium text-[var(--title-color)]">Total</span>
          <span className="text-2xl font-bold text-[var(--title-color)]">
            {formatGrossAmount(authorization.amount_net_cents, authorization.vat_rate)}
          </span>
        </div>
      </div>

      {document && (
        <p className="mt-3 text-xs text-[var(--text-color)]">
          Linked document:{' '}
          <a
            href={`/api/documents/${document.id}/download`}
            className="font-medium text-[var(--accent-color)] hover:underline"
          >
            {document.title}
          </a>
        </p>
      )}

      {isBelowCap ? (
        <p className="mt-3 text-xs text-[var(--text-color)]">
          Mobilized under the emergency threshold. No authorization required.
        </p>
      ) : authorization.status === 'pending' && canDecide && onDecide ? (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await onDecide(authorization.item_id, 'approved');
                  if (!result.ok) setError(result.error);
                })
              }
              className="rounded-xl bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await onDecide(authorization.item_id, 'declined');
                  if (!result.ok) setError(result.error);
                })
              }
              className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-color)] disabled:opacity-50"
            >
              Decline
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : authorization.status === 'pending' ? (
        <p className="mt-3 text-xs text-[var(--text-color)]">{AUTHORIZATION_STATUS_LABELS.pending}</p>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-color)]">
          {AUTHORIZATION_STATUS_LABELS[authorization.status] ?? authorization.status}
          {authorization.decided_at && ` on ${new Date(authorization.decided_at).toLocaleString()}`}
        </p>
      )}
    </div>
  );
}

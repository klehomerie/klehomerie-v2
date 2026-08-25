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
  documentTitle,
  canDecide,
  onDecide,
}: {
  authorization: AuthorizationState;
  documentTitle: string | null;
  canDecide: boolean;
  onDecide?: (itemId: string, decision: 'approved' | 'declined') => Promise<DecisionResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isBelowCap = authorization.amount_net_cents < MOBILIZATION_CAP_CENTS;

  return (
    <div className="rounded-md border border-slate-300 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {ASSET_CLASS_LABELS[authorization.asset_class] ?? authorization.asset_class}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{authorization.title}</p>
      {authorization.description && (
        <p className="mt-1 text-sm text-slate-600">{authorization.description}</p>
      )}
      <dl className="mt-3 space-y-1 text-sm text-slate-700">
        <div className="flex justify-between">
          <dt>Net</dt>
          <dd>{formatNetAmount(authorization.amount_net_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>VAT (24%)</dt>
          <dd>{formatVatAmount(authorization.amount_net_cents, authorization.vat_rate)}</dd>
        </div>
        <div className="flex justify-between font-medium text-slate-900">
          <dt>Total</dt>
          <dd>{formatGrossAmount(authorization.amount_net_cents, authorization.vat_rate)}</dd>
        </div>
      </dl>
      {documentTitle && (
        <p className="mt-2 text-xs text-slate-500">Linked document: {documentTitle}</p>
      )}

      {isBelowCap ? (
        <p className="mt-3 text-xs text-slate-500">
          Mobilized under the emergency threshold. No authorization required.
        </p>
      ) : authorization.status === 'pending' && canDecide && onDecide ? (
        <div className="mt-3 space-y-2">
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
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
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
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : authorization.status === 'pending' ? (
        <p className="mt-3 text-xs text-slate-500">
          {AUTHORIZATION_STATUS_LABELS.pending}
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          {AUTHORIZATION_STATUS_LABELS[authorization.status] ?? authorization.status}
          {authorization.decided_at &&
            ` on ${new Date(authorization.decided_at).toLocaleString()}`}
        </p>
      )}
    </div>
  );
}

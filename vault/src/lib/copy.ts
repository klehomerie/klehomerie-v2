// Display labels for the fixed document_type enum. Keep this list in sync
// with the Postgres enum in supabase/migrations/0001_init_schema.sql and
// its extension in 0006_realtime_and_client_doc_types.sql.
export const DOC_TYPE_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  inspection_report: 'Inspection Report',
  delivery_note: 'Delivery Note',
  proof_of_payment: 'Proof of Payment',
  signed_agreement: 'Signed Agreement',
  insurance_document: 'Insurance Document',
  other: 'Other',
};

// The subset of doc types a client can pick when uploading from /portal.
// The rest (quotation, invoice, inspection_report, delivery_note) are
// documents Klehomerie issues to the client, not the other way around.
export const CLIENT_DOC_TYPES = [
  'proof_of_payment',
  'signed_agreement',
  'insurance_document',
  'other',
] as const;

// Client-visible fallback for any value the app doesn't have. Never leave a
// blank, and never guess.
export const UNKNOWN = 'Unknown';

// Display labels for the fixed six-value asset_class enum. Keep in sync
// with supabase/migrations/0004_slice2_thread_authorizations.sql. This is
// the Golden Ticket Audit Lot taxonomy -- never to be confused with, or
// share a table/enum with, a free-form project_line_item.
export const ASSET_CLASS_LABELS: Record<string, string> = {
  lot_00: 'LOT 00: General Environment',
  lot_01: 'LOT 01: Electrical Systems',
  lot_02: 'LOT 02: Plumbing and HVAC',
  lot_03: 'LOT 03: Joinery and Closings',
  lot_04: 'LOT 04: Finishes and Surfaces',
  lot_05: 'LOT 05: Amenities and White Goods',
};

export const AUTHORIZATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting your decision',
  approved: 'Approved',
  declined: 'Declined',
  superseded: 'Superseded',
};

const VAT_RATE = 0.24;

// Money is always rendered net-first, per the project's copy rules:
// "Prices always as '€X (excl. 24% VAT)'".
export function formatNetAmount(amountNetCents: number): string {
  return `€${(amountNetCents / 100).toFixed(2)} (excl. 24% VAT)`;
}

export function formatVatAmount(amountNetCents: number, vatRate: number = VAT_RATE): string {
  return `€${((amountNetCents * vatRate) / 100).toFixed(2)}`;
}

export function formatGrossAmount(amountNetCents: number, vatRate: number = VAT_RATE): string {
  return `€${((amountNetCents * (1 + vatRate)) / 100).toFixed(2)}`;
}

// Below this, Klehomerie may mobilize without prior client authorization.
export const MOBILIZATION_CAP_CENTS = 15000;

export const NIGHT_BANNER_TEXT =
  'Outside working hours in Athens. Your message is recorded and a reply will follow shortly.';

export const NIGHT_BANNER_URGENT_TEXT =
  'For an urgent Asset Risk, call the number in your service agreement.';

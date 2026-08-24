// Display labels for the fixed document_type enum. Keep this list in sync
// with the Postgres enum in supabase/migrations/0001_init_schema.sql.
export const DOC_TYPE_LABELS: Record<string, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  inspection_report: 'Inspection Report',
  delivery_note: 'Delivery Note',
  other: 'Other',
};

// Client-visible fallback for any value the app doesn't have. Never leave a
// blank, and never guess.
export const UNKNOWN = 'Unknown';

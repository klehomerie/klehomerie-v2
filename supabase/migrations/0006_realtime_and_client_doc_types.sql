-- Slice 2 follow-up: live thread updates, and client-facing document
-- types so clients can upload proof of payment, signed agreements, and
-- insurance papers from the portal (not just receive documents from
-- operators).

-- New values are not referenced elsewhere in this migration, so this is
-- safe to run as a single transaction (Postgres only forbids USING a
-- brand-new enum value in the same transaction that added it).
alter type public.document_type add value 'proof_of_payment';
alter type public.document_type add value 'signed_agreement';
alter type public.document_type add value 'insurance_document';

-- Realtime (Postgres Changes) enforces the same RLS SELECT policies these
-- tables already carry on every other query path, so subscribing a
-- client's browser to these tables exposes nothing beyond what that
-- client's session could already read.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.authorizations;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.documents;

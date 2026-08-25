-- Slice 3A: AI document briefs, with a release gate before a client ever
-- sees one.
--
-- Two separate status concepts live here, on purpose:
--   documents.brief_generation_status -- what happened when the pipeline
--     ran at upload time: no text layer, generated, or unavailable
--     (API failure or failed the money-pattern guard twice).
--   document_briefs.status -- the release-gate workflow for a brief that
--     DID generate cleanly: draft (awaiting operator review), released
--     (visible to the client), or rejected (terminal, no retry).
--
-- A document_briefs row is only ever created once generation produces
-- regex-clean output. Its generation fields (body, model_id,
-- prompt_version, source_text_sha256, generated_at) are frozen at
-- creation -- a trigger blocks changing them. Regenerating writes a NEW
-- row and marks the old one superseded; it is not the same kind of
-- "append-only, no UPDATE ever" as authorizations, since the release-gate
-- fields (status, released_at, released_by, edited_body) are meant to be
-- set on this row after generation.

create type public.brief_generation_status as enum (
  'no_text_layer',
  'generated',
  'brief_unavailable'
);

alter table public.documents
  add column brief_generation_status public.brief_generation_status;

create type public.document_brief_status as enum ('draft', 'released', 'rejected');

create table public.document_briefs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  language text not null, -- 'en' | 'fr' | 'el', matching clients.language
  body text not null,
  model_id text not null,
  prompt_version text not null,
  source_text_sha256 text not null,
  generated_at timestamptz not null default now(),
  superseded boolean not null default false,
  status public.document_brief_status not null default 'draft',
  released_at timestamptz,
  released_by uuid references auth.users(id),
  edited_body text
);

create index document_briefs_document_id_idx on public.document_briefs(document_id);

comment on column public.document_briefs.superseded is
  'Set true on the old row when a regeneration produces a new row for the same document. The generation fields below never change on an existing row -- see guard_document_brief_content.';
comment on column public.document_briefs.edited_body is
  'Set by "Edit and Release" in the operator queue. Rendering reads this when present, else body. body itself is never touched, so the model output stays intact for audit.';

-- Frozen at generation: block any change to the fields that describe what
-- the model produced, while still allowing the release-gate fields
-- (status, released_at, released_by, edited_body) and superseded to be
-- set by the operator queue afterward.
create or replace function public.guard_document_brief_content() returns trigger
language plpgsql as $$
begin
  if new.document_id is distinct from old.document_id
    or new.language is distinct from old.language
    or new.body is distinct from old.body
    or new.model_id is distinct from old.model_id
    or new.prompt_version is distinct from old.prompt_version
    or new.source_text_sha256 is distinct from old.source_text_sha256
    or new.generated_at is distinct from old.generated_at
  then
    raise exception 'document_briefs generation fields are frozen at creation.';
  end if;
  return new;
end;
$$;

create trigger document_briefs_guard_content
  before update on public.document_briefs
  for each row execute function public.guard_document_brief_content();

alter table public.document_briefs enable row level security;

create policy "operators read all document briefs"
  on public.document_briefs for select to authenticated
  using (is_operator());

-- Invisible until released. Not greyed out, not "pending" -- absent. A
-- client querying this table before release gets zero rows back, same as
-- if the feature didn't exist.
create policy "clients read released briefs on their own documents"
  on public.document_briefs for select to authenticated
  using (
    status = 'released'
    and document_id in (
      select d.id from public.documents d
      join public.properties p on p.id = d.property_id
      join public.clients c on c.id = p.client_id
      where c.auth_user_id = auth.uid()
    )
  );

create policy "operators update document briefs"
  on public.document_briefs for update to authenticated
  using (is_operator())
  with check (is_operator());

-- INSERT has no policy for authenticated/anon: briefs are only ever
-- written by the service role, from the upload pipeline.

-- Phase 4: Gmail Integration

alter table communications add column if not exists external_id text;

-- Postgres unique indexes treat NULLs as distinct from each other, so existing
-- sample/manual rows (external_id IS NULL) are unaffected; this only enforces
-- idempotent re-sync per (source, external_id) for real sources like Gmail.
create unique index if not exists idx_communications_source_external_id
  on communications (source, external_id);

create table if not exists gmail_connections (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz not null,
  scope text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

-- Phase 1: Foundation + AI Understanding
-- Raw communications are kept separate from AI-derived analysis so the
-- provenance of every field is always clear.

create extension if not exists pgcrypto;

create table if not exists communications (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_type text not null,
  sender text not null,
  sender_name text,
  subject text not null,
  content text not null,
  received_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_communications_received_at
  on communications (received_at desc);

create table if not exists communication_analysis (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications (id) on delete cascade,

  category text not null check (
    category in (
      'FINANCIAL', 'TRAVEL', 'WORK', 'SHOPPING',
      'SUBSCRIPTION', 'MARKETING', 'SOCIAL', 'OTHER'
    )
  ),
  intent text not null check (
    intent in (
      'ACTION_REQUIRED', 'INFORMATION', 'CONFIRMATION', 'REMINDER',
      'UPDATE', 'PROMOTION', 'TRANSACTION', 'ALERT', 'OTHER'
    )
  ),

  organization text,
  people jsonb,
  entities jsonb,

  event_date date,
  deadline date,

  amount numeric,
  currency text,

  product_service text,
  reference_id text,
  requested_action text,

  summary text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),

  model text not null,
  prompt_version text not null,

  created_at timestamptz not null default now(),

  -- One current analysis per communication; re-analyzing upserts it.
  unique (communication_id)
);

create index if not exists idx_communication_analysis_communication_id
  on communication_analysis (communication_id);

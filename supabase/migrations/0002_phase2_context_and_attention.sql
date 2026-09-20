-- Phase 2: Personal Context + Attention Engine

create table if not exists personal_context (
  id uuid primary key default gen_random_uuid(),
  context_type text not null check (
    context_type in (
      'IMPORTANT_PERSON', 'IMPORTANT_ORGANIZATION', 'PROJECT',
      'SUBSCRIPTION', 'RECURRING_VENDOR', 'OTHER'
    )
  ),
  key text not null,
  value text,
  importance numeric not null check (importance >= 1 and importance <= 5),
  confidence numeric not null default 1.0 check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (context_type, key)
);

create table if not exists attention_decisions (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications (id) on delete cascade,

  level text not null check (
    level in ('ACT_NOW', 'REVIEW', 'WATCH', 'LOW_PRIORITY', 'NO_ACTION')
  ),
  scores jsonb not null,
  overall_score numeric not null,
  reason text not null,
  matched_context jsonb,
  decision_version text not null,

  created_at timestamptz not null default now(),

  -- One current decision per communication; re-deciding upserts it.
  unique (communication_id)
);

create index if not exists idx_attention_decisions_level
  on attention_decisions (level);
create index if not exists idx_attention_decisions_communication_id
  on attention_decisions (communication_id);

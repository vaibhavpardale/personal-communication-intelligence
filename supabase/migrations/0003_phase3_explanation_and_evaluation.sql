-- Phase 3: Explanation + Evaluation

alter table attention_decisions
  add column if not exists why_it_matters text,
  add column if not exists what_you_can_do text,
  add column if not exists explanation_model text,
  add column if not exists explanation_prompt_version text;

create table if not exists evaluation_dataset (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications (id) on delete cascade,

  expected_category text not null check (
    expected_category in (
      'FINANCIAL', 'TRAVEL', 'WORK', 'SHOPPING',
      'SUBSCRIPTION', 'MARKETING', 'SOCIAL', 'OTHER'
    )
  ),
  expected_intent text not null check (
    expected_intent in (
      'ACTION_REQUIRED', 'INFORMATION', 'CONFIRMATION', 'REMINDER',
      'UPDATE', 'PROMOTION', 'TRANSACTION', 'ALERT', 'OTHER'
    )
  ),
  expected_attention_level text not null check (
    expected_attention_level in ('ACT_NOW', 'REVIEW', 'WATCH', 'LOW_PRIORITY', 'NO_ACTION')
  ),
  -- 'dev': safe to inspect while tuning. 'test': frozen, do not tune against.
  dataset_split text not null check (dataset_split in ('dev', 'test')),

  created_at timestamptz not null default now(),

  unique (communication_id)
);

create index if not exists idx_evaluation_dataset_split on evaluation_dataset (dataset_split);

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications (id) on delete cascade,
  feedback_type text not null check (feedback_type in ('IMPORTANT', 'NOT_IMPORTANT', 'DISMISS')),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_feedback_communication_id on user_feedback (communication_id);

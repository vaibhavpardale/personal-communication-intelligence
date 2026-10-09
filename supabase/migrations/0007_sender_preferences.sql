-- Per-sender preferences the user sets (or accepts from a suggestion).
--   vip:   treat this sender as highly important
--   muted: file this sender's mail as low priority and never notify
create table if not exists sender_preferences (
  sender text primary key,           -- lowercased email address
  preference text not null check (preference in ('vip', 'muted')),
  created_at timestamptz not null default now()
);

notify pgrst, 'reload schema';

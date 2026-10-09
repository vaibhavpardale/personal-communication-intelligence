-- Real-inbox evaluation labels (Gmail) alongside the synthetic golden set.
-- Real-inbox labels only carry the expected attention level, so category and
-- intent become optional; the metrics skip rows where they are null.
alter table evaluation_dataset alter column expected_category drop not null;
alter table evaluation_dataset alter column expected_intent drop not null;

alter table evaluation_dataset
  add column if not exists dataset text not null default 'golden'
  check (dataset in ('golden', 'gmail'));

-- User actions on a communication, applied in the app only (the Gmail scope is
-- read-only, so nothing here changes the mailbox itself).
alter table communications
  add column if not exists user_status text not null default 'unread'
  check (user_status in ('unread', 'read', 'hidden'));

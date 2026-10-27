-- Track TKB — nâng cấp: lịch có thể lặp hàng tuần.
-- Chạy sau 001, 002, 003. Chạy lại nhiều lần vẫn an toàn.

alter table track_tkb.entries
  add column if not exists repeat_weekly boolean not null default false,
  add column if not exists repeat_interval_weeks smallint not null default 1,
  add column if not exists repeat_until date;

create index if not exists entries_user_repeat_idx
  on track_tkb.entries (user_id, repeat_weekly);

grant usage on schema track_tkb to anon, authenticated;
grant all on all tables in schema track_tkb to authenticated;
alter default privileges in schema track_tkb grant all on tables to authenticated;

-- Track TKB — nâng cấp: lặp cách 2 tuần, 3 tuần…
-- Chạy sau 001, 002, 003, 004. Chạy lại nhiều lần vẫn an toàn.
-- (Nếu bạn đã chạy 004 bản cũ, file này bổ sung cột còn thiếu.)

alter table track_tkb.entries
  add column if not exists repeat_interval_weeks smallint not null default 1;

grant usage on schema track_tkb to anon, authenticated;
grant all on all tables in schema track_tkb to authenticated;
alter default privileges in schema track_tkb grant all on tables to authenticated;

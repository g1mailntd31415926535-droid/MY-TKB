-- Track TKB — nâng cấp: lặp cách quãng + huỷ/dời từng buổi.
-- Chạy sau 001 và 002. Chạy lại nhiều lần vẫn an toàn.

-- 1 = hàng tuần, 2 = cách 2 tuần, 3 = cách 3 tuần…
alter table track_tkb.sessions
  add column if not exists interval_weeks smallint not null default 1;

-- Buổi học bị huỷ/dời ở một ngày cụ thể (các tuần khác vẫn giữ nguyên).
create table if not exists track_tkb.exceptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references track_tkb.sessions (id) on delete cascade,
  "date"     date not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, session_id, "date")
);

create index if not exists exceptions_user_date_idx
  on track_tkb.exceptions (user_id, "date");

alter table track_tkb.exceptions enable row level security;

drop policy if exists "own exceptions" on track_tkb.exceptions;
create policy "own exceptions" on track_tkb.exceptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema track_tkb to anon, authenticated;
grant all on all tables in schema track_tkb to authenticated;
alter default privileges in schema track_tkb grant all on tables to authenticated;

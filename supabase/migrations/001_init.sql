-- Track TKB — schema riêng trong project Supabase có sẵn.
-- Chạy trong SQL Editor của Supabase. Không đụng tới schema public của app khác.

create schema if not exists track_tkb;

create table if not exists track_tkb.settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  semester   jsonb not null,
  periods    jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists track_tkb.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code       text not null default '',
  name       text not null,
  color      text not null default '#8b7cf6',
  teacher    text,
  created_at timestamptz not null default now()
);

create table if not exists track_tkb.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#8b7cf6',
  created_at timestamptz not null default now()
);

create table if not exists track_tkb.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid not null references track_tkb.subjects (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 1 and 7),
  period_start smallint not null check (period_start > 0),
  period_end   smallint not null check (period_end >= period_start),
  weeks_start  smallint not null default 1,
  weeks_end    smallint not null default 15,
  interval_weeks smallint not null default 1 check (interval_weeks >= 1),
  room         text,
  note         text,
  tag_id       uuid references track_tkb.tags (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists track_tkb.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('event', 'deadline')),
  title       text not null,
  "date"      date not null,
  start_time  text,
  end_time    text,
  all_day     boolean not null default false,
  repeat_weekly boolean not null default false,
  repeat_interval_weeks smallint not null default 1,
  repeat_until date,
  done        boolean not null default false,
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  subject_id  uuid references track_tkb.subjects (id) on delete set null,
  location    text,
  note        text,
  source      text not null default 'manual' check (source in ('manual', 'import', 'ai')),
  tag_id      uuid references track_tkb.tags (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists entries_user_date_idx on track_tkb.entries (user_id, "date");
create index if not exists entries_user_repeat_idx on track_tkb.entries (user_id, repeat_weekly);
create index if not exists sessions_user_day_idx on track_tkb.sessions (user_id, day_of_week);

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

-- ---------- Row Level Security: mỗi user chỉ thấy dữ liệu của mình ----------
alter table track_tkb.settings enable row level security;
alter table track_tkb.subjects enable row level security;
alter table track_tkb.tags     enable row level security;
alter table track_tkb.sessions enable row level security;
alter table track_tkb.entries  enable row level security;
alter table track_tkb.exceptions enable row level security;

drop policy if exists "own settings" on track_tkb.settings;
create policy "own settings" on track_tkb.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tags" on track_tkb.tags;
create policy "own tags" on track_tkb.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own subjects" on track_tkb.subjects;
create policy "own subjects" on track_tkb.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sessions" on track_tkb.sessions;
create policy "own sessions" on track_tkb.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own entries" on track_tkb.entries;
create policy "own entries" on track_tkb.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own exceptions" on track_tkb.exceptions;
create policy "own exceptions" on track_tkb.exceptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Quyền cho PostgREST ----------
grant usage on schema track_tkb to anon, authenticated;
grant all on all tables in schema track_tkb to authenticated;
alter default privileges in schema track_tkb grant all on tables to authenticated;

-- Ghi chú: sau khi chạy, vào Project Settings → API → Exposed schemas
-- và thêm `track_tkb` để supabase-js gọi được schema này.

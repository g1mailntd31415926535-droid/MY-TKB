-- Track TKB — nâng cấp: nhãn (tag) cho lịch học / sự kiện.
-- Dùng khi bạn ĐÃ chạy 001_init.sql trước đó. File này chạy lại nhiều lần vẫn an toàn.

create table if not exists track_tkb.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#8b7cf6',
  created_at timestamptz not null default now()
);

alter table track_tkb.sessions
  add column if not exists tag_id uuid references track_tkb.tags (id) on delete set null;

alter table track_tkb.entries
  add column if not exists tag_id uuid references track_tkb.tags (id) on delete set null;

alter table track_tkb.tags enable row level security;

drop policy if exists "own tags" on track_tkb.tags;
create policy "own tags" on track_tkb.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema track_tkb to anon, authenticated;
grant all on all tables in schema track_tkb to authenticated;
alter default privileges in schema track_tkb grant all on tables to authenticated;

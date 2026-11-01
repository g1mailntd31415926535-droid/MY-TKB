-- Track TKB — nâng cấp: nhiều thời khoá biểu trong cùng một tài khoản
-- (MyTKB của mình, LinTKB của người khác…). Mỗi dòng gắn thêm cột `profile`.
-- Chạy sau 001 → 005. Chạy lại nhiều lần vẫn an toàn.
--
-- KHÔNG xoá hay sửa nội dung dữ liệu nào:
--   * Chỉ THÊM cột `profile`; mọi dòng đã có tự nhận 'my' → MyTKB giữ nguyên.
--   * Trước khi đổi, chép nguyên toàn bộ dữ liệu sang schema `track_tkb_backup`
--     (không mở ra API nên app/người ngoài không đọc được).
--   * Cả file chạy trong một transaction: lỗi ở bất kỳ bước nào thì huỷ hết,
--     database trở lại y như trước khi chạy.

begin;

-- ---------- 1. Sao lưu (chỉ chụp lần chạy đầu tiên, chạy lại không ghi đè) ----------
create schema if not exists track_tkb_backup;
revoke all on schema track_tkb_backup from anon, authenticated;

create table if not exists track_tkb_backup.settings_before_006   as table track_tkb.settings;
create table if not exists track_tkb_backup.tags_before_006       as table track_tkb.tags;
create table if not exists track_tkb_backup.subjects_before_006   as table track_tkb.subjects;
create table if not exists track_tkb_backup.sessions_before_006   as table track_tkb.sessions;
create table if not exists track_tkb_backup.entries_before_006    as table track_tkb.entries;
create table if not exists track_tkb_backup.exceptions_before_006 as table track_tkb.exceptions;

-- ---------- 2. Thêm cột profile (dữ liệu cũ = 'my') ----------
alter table track_tkb.settings   add column if not exists profile text not null default 'my';
alter table track_tkb.tags       add column if not exists profile text not null default 'my';
alter table track_tkb.subjects   add column if not exists profile text not null default 'my';
alter table track_tkb.sessions   add column if not exists profile text not null default 'my';
alter table track_tkb.entries    add column if not exists profile text not null default 'my';
alter table track_tkb.exceptions add column if not exists profile text not null default 'my';

-- Mỗi TKB có một dòng settings riêng: khoá chính đổi từ (user_id) thành (user_id, profile).
-- Chỉ đổi ràng buộc, không đụng tới dòng dữ liệu.
alter table track_tkb.settings drop constraint if exists settings_pkey;
alter table track_tkb.settings add constraint settings_pkey primary key (user_id, profile);

create index if not exists tags_user_profile_idx       on track_tkb.tags (user_id, profile);
create index if not exists subjects_user_profile_idx   on track_tkb.subjects (user_id, profile);
create index if not exists sessions_user_profile_idx   on track_tkb.sessions (user_id, profile);
create index if not exists entries_user_profile_idx    on track_tkb.entries (user_id, profile);
create index if not exists exceptions_user_profile_idx on track_tkb.exceptions (user_id, profile);

grant usage on schema track_tkb to anon, authenticated;
grant all on all tables in schema track_tkb to authenticated;
alter default privileges in schema track_tkb grant all on tables to authenticated;

commit;

-- PostgREST cần nạp lại schema để thấy cột mới ngay.
notify pgrst, 'reload schema';

-- ---------- 3. Kiểm tra (tự chạy, xem kết quả ở dưới) ----------
-- Lần chạy đầu: hai cột số phải BẰNG NHAU ở mọi dòng (dữ liệu hiện tại = bản sao lưu).
-- Về sau thêm lịch cho LinTKB thì "hien_tai" sẽ lớn hơn — vậy là bình thường.
select 'settings' as bang, (select count(*) from track_tkb.settings) as hien_tai, (select count(*) from track_tkb_backup.settings_before_006) as sao_luu
union all select 'tags',       (select count(*) from track_tkb.tags),       (select count(*) from track_tkb_backup.tags_before_006)
union all select 'subjects',   (select count(*) from track_tkb.subjects),   (select count(*) from track_tkb_backup.subjects_before_006)
union all select 'sessions',   (select count(*) from track_tkb.sessions),   (select count(*) from track_tkb_backup.sessions_before_006)
union all select 'entries',    (select count(*) from track_tkb.entries),    (select count(*) from track_tkb_backup.entries_before_006)
union all select 'exceptions', (select count(*) from track_tkb.exceptions), (select count(*) from track_tkb_backup.exceptions_before_006);

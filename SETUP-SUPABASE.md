# Kết nối Supabase (dùng lại project đang có)

Mất khoảng 5 phút, làm 1 lần. Không ảnh hưởng 2 app cũ: mọi thứ nằm trong schema riêng `track_tkb`.

---

## Bước 1 — Tạo bảng

1. Vào https://supabase.com/dashboard → chọn **một** project đang chạy
2. Menu trái → **SQL Editor** → **New query**
3. Mở file `supabase/migrations/001_init.sql` trong dự án này, copy **toàn bộ**, dán vào
4. Bấm **Run** (Ctrl+Enter)
5. Làm lại lần lượt với `002_tags.sql`, `003_recurrence_exceptions.sql`, `004_entry_repeat.sql` và `005_entry_repeat_interval.sql`

Kết quả đúng: hiện `Success. No rows returned`.

> Lệnh này chỉ tạo schema `track_tkb` + 6 bảng (settings, subjects, tags, sessions, entries, exceptions) + policy. Không sửa gì trong `public`.
>
> **Đã chạy 001/002/003 trước đây?** Chạy thêm `004_entry_repeat.sql` (thêm `repeat_weekly` + `repeat_until` cho bảng `entries`) và `005_entry_repeat_interval.sql` (thêm `repeat_interval_weeks` — lặp cách 2/3 tuần). Chạy lại nhiều lần cũng không lỗi.
>
> Nếu mới chạy 001/002: chạy thêm cả `003_recurrence_exceptions.sql` (lặp cách tuần + huỷ/dời 1 buổi), `004_entry_repeat.sql` và `005_entry_repeat_interval.sql`.

---

## Bước 2 — Mở schema cho API

1. **Project Settings** (bánh răng cuối menu trái) → **API**
2. Kéo xuống mục **Exposed schemas**
3. Thêm `track_tkb` vào danh sách → **Save**

Thiếu bước này app sẽ báo lỗi `PGRST106` / "Invalid schema".

---

## Bước 3 — Lấy URL + anon key

Vẫn ở trang **Project Settings → API**:

| Cần lấy | Nằm ở đâu | Dạng |
|---|---|---|
| **Project URL** | mục Project URL | `https://xxxxx.supabase.co` |
| **anon public** | Project API keys → `anon` `public` | `eyJhbGciOi...` (rất dài) |

Dán vào `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> ⚠️ Chỉ dùng key **anon public**. Không bao giờ dán `service_role` (key đó bỏ qua RLS).

---

## Bước 4 — Tạo tài khoản đăng nhập

1. Menu trái → **Authentication** → **Users**
2. **Add user** → **Create new user**
3. Nhập email + mật khẩu của bạn
4. Bật **Auto Confirm User** → Create

Đây là tài khoản bạn dùng để đăng nhập app (không liên quan tài khoản Supabase).

---

## Bước 5 — Chạy lại và kiểm tra

```bash
npm run dev
```

- App hiện màn đăng nhập → nhập email/mật khẩu ở bước 4
- Vào **Cài đặt → Dữ liệu**: phải thấy badge **Supabase (đồng bộ)**
- Bấm **Nạp dữ liệu demo** → dữ liệu được ghi lên cloud
- Mở app trên máy/điện thoại khác (cùng mạng hoặc sau khi deploy) → thấy đúng dữ liệu

### Kiểm tra bằng dòng lệnh (tuỳ chọn)

```bash
node scripts/check-supabase.mjs your-email@example.com your-password
```

Script sẽ đăng nhập, đọc 5 bảng, ghi thử 1 dòng rồi xoá, và in ra chỗ nào còn sai.

---

## Lỗi thường gặp

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| `PGRST106` / `Invalid schema` | Chưa thêm `track_tkb` vào Exposed schemas | Bước 2 |
| `relation "..." does not exist` (42P01) | Chưa chạy SQL | Bước 1 |
| `column "repeat_weekly" does not exist` (42703) | Chưa chạy migration mới | Chạy `004_entry_repeat.sql` + `005_entry_repeat_interval.sql` |
| `row-level security` / `permission denied` | Chưa đăng nhập, hoặc policy thiếu | Đăng nhập lại; chạy lại phần RLS trong file SQL |
| `Invalid login credentials` | Sai email/mật khẩu | Bước 4 |
| `Email not confirmed` | Chưa bật Auto Confirm | Sửa user trong Authentication → Users |
| `Failed to fetch` | URL sai, hoặc project bị pause | Kiểm tra `.env`; vào dashboard bấm Restore |
| Dữ liệu 2 app cũ vẫn nguyên | — | Đúng, vì app này không đụng schema `public` |

## Gỡ bỏ hoàn toàn (nếu muốn)

```sql
drop schema track_tkb cascade;
```

Xong. Không ảnh hưởng gì tới 2 project/app cũ.

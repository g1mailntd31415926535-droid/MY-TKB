# Track TKB

App theo dõi **thời khoá biểu + công việc + sự kiện** trên cùng một dòng thời gian, có AI đọc ảnh để tách công việc.

- **Lịch tháng**: chấm màu dưới mỗi ngày theo nhóm (mặc định vàng = lịch học lặp hàng tuần / cách 2 tuần / cách N tuần, đỏ = việc một lần); bấm ngày xem chi tiết
- **Một nút “Thêm lịch”** thay cho 2 nút cũ: nhập tên, ngày, giờ bắt đầu/kết thúc, chọn **lặp hàng tuần / cách 2 tuần / cách N tuần**, chọn **nhóm có sẵn hoặc tự tạo nhóm mới** (hoặc không gắn nhóm)
- Lịch học lặp theo tuần (tiết → giờ thực, tuần 1..N của học kỳ), hỗ trợ **cách 2 tuần / tuỳ chỉnh N tuần**
- Mục một lần hoặc **lặp định kỳ** (hội thảo, hoạt động, deadline…)
- **Mục không gắn nhóm** (`tag_id = null`) **không hiện trên lịch tháng / Hôm nay**, nhưng vẫn nằm ở trang **Tất cả → Chưa gắn nhóm** để gắn nhóm lại
- **Nhóm & màu chấm**: mỗi nhóm 1 màu (gợi ý vàng / đỏ / xanh / tím…), sửa tuỳ ý; lọc theo 1 hoặc nhiều nhóm
- "Hôm nay" dạng timeline theo giờ thực (đang diễn ra / còn bao nhiêu phút)
- AI Inbox: **dán ảnh bằng Ctrl+V**, kéo–thả hoặc chọn file → AI đọc, tóm tắt, gợi ý nhóm, hỏi lại → bạn xác nhận mới thêm
- AI nhận ra **nghỉ / dời buổi học**: huỷ buổi cũ, thêm buổi mới gắn nhóm "Đã đổi" (màu khác)

## Chạy local (mặc định: localStorage, không cần tài khoản)

```bash
npm install
npm run dev          # http://localhost:5173
```

Lần đầu app nạp sẵn dữ liệu demo (học kỳ + 7 buổi học + vài deadline) để xem ngay.

## Bật AI đọc ảnh (miễn phí)

1. Tạo API key tại https://aistudio.google.com/apikey
2. Copy `.env.example` → `.env`, điền `GEMINI_API_KEY`
3. Chạy song song web + server AI:

```bash
npm run dev:all      # vite :5173 + proxy AI :8787
# hoặc 2 terminal: npm run dev  |  npm run ai
```

Key **chỉ nằm ở server** (`server/index.mjs`), không bao giờ lộ ra trình duyệt.

Mặc định dùng `gemini-3.1-flash-lite` + `thinkingBudget: 0` → trả JSON trong ~2–4s.
(`gemini-2.5-flash` đã bị Google khoá với tài khoản mới; `gemini-3.8-flash` chậm ~25s.)
Đổi model bằng `GEMINI_MODEL` trong `.env` nếu cần độ chính xác cao hơn.

Server có sẵn: retry 3 lần khi 429/5xx, ép `date` về `YYYY-MM-DD`, ép giờ về `HH:mm`,
khử trùng lặp, và **không tin model** — thiếu gì thì đánh dấu `missing` + câu hỏi lại.

### Kiểm thử

```bash
npm run lint               # ESLint
npm run check              # tự bật vite nếu chưa chạy → kiểm tra tràn ngang mobile + vuốt đổi tháng
```

Các script lẻ (chạy khi đang `npm run dev`):

```bash
node scripts/ai-test.mjs   # gọi API với ảnh mẫu smoke/notice.png
node scripts/ai-e2e.mjs    # upload ảnh trên UI thật → xác nhận → kiểm tra đã vào lịch
node scripts/tags-check.mjs    # lọc theo nhóm + dán ảnh Ctrl+V + AI gợi ý nhóm
node scripts/tag-crud-check.mjs # thêm/sửa/xoá nhóm trong Cài đặt
node scripts/month-check.mjs    # lịch tháng, lặp cách tuần, huỷ/dời 1 buổi
node scripts/ui-final-check.mjs # layout tháng, lọc nhóm, đổi tháng, tràn ngang trên mobile
node scripts/ai-change-check.mjs # AI nhận diện nghỉ/dời buổi học
node scripts/plan-check.mjs      # thêm lịch lặp tuần/cách 2 tuần + nhóm tự tạo + mục không nhóm bị ẩn
node scripts/smoke.mjs     # chụp ảnh 5 trang, desktop + mobile, bắt lỗi runtime
node scripts/e2e.mjs       # thêm → reload → xoá một mục lịch
```

Mặc định script dùng Edge đã cài. Dùng Chrome: `BROWSER_CHANNEL=chrome`; chỉ đường dẫn cụ thể: `BROWSER_PATH=...`; app chạy ở địa chỉ khác: `BASE_URL=http://...`.

GitHub Actions (`.github/workflows/ci.yml`) chạy `lint` + `build` mỗi lần push lên `main`.

## Bật đồng bộ Supabase (dùng lại project đang có)

Hướng dẫn từng bước + bảng lỗi thường gặp: **[SETUP-SUPABASE.md](./SETUP-SUPABASE.md)**

Tóm tắt: chạy `supabase/migrations/001_init.sql`, `002_tags.sql`, `003_recurrence_exceptions.sql`, `004_entry_repeat.sql`, `005_entry_repeat_interval.sql` trong SQL Editor → thêm `track_tkb` vào
**Exposed schemas** → tạo 1 user trong Authentication → điền URL + anon key vào `.env`.

> Dùng offline / Supabase bị pause: mở `http://localhost:5173/?local=1` để chạy bằng localStorage, bỏ qua đăng nhập.

Kiểm tra nhanh sau khi cấu hình:

```bash
node scripts/check-supabase.mjs your-email@example.com your-password
```

Dữ liệu nằm trong schema `track_tkb`, **cách ly hoàn toàn** với `public` của 2 app cũ, RLS theo `user_id`.
Gỡ bỏ: `drop schema track_tkb cascade;` — không ảnh hưởng gì khác.

## Kiến trúc

```
src/
  pages/            Today · Month · All · Ai · Settings
  components/       ui.tsx (Button/Card/Modal/Field…), tags.tsx (TagPill/TagFilter), Sidebar (thanh điều hướng trên cùng), AuthGate
    editors/        EntryEditor · SessionEditor (form thêm/sửa)
    month/          DetailItem (thẻ chi tiết trong trang Tháng)
    ai/             DraftCard (mục AI đọc được, chờ xác nhận)
  store/            data.ts (zustand + repo), ui.ts (điều hướng, dialog, bộ lọc nhóm)
  lib/
    time.ts         tuần học, tiết → giờ, trải lặp (tuần / cách N tuần), lịch tháng, "đang diễn ra"
    storage/        Repo interface: local.ts | supabase.ts
    ai.ts           gọi /api/ai/extract (kèm token đăng nhập)
    use-swipe.ts    vuốt trái/phải
    seed.ts         dữ liệu demo
server/extract.mjs  logic gọi Gemini (structured JSON output) + kiểm tra đăng nhập — dùng chung
server/index.mjs    server Node cho lúc dev / tự host
api/                serverless function cho Vercel (/api/ai/extract, /api/health)
public/sw.js        service worker: giữ giao diện để mở được khi mất mạng
supabase/migrations/001_init.sql, 002_tags.sql, 003_recurrence_exceptions.sql, 004_entry_repeat.sql, 005_entry_repeat_interval.sql
```

### Mô hình dữ liệu

| Bảng | Dùng cho |
|---|---|
| `settings` | học kỳ (ngày bắt đầu, số tuần) + khung tiết → giờ |
| `subjects` | môn học, màu, giảng viên |
| `tags` | nhóm lịch: tên + màu chấm (VD: Lịch học vàng, Hoạt động đỏ, Đã đổi xanh) |
| `sessions` | buổi học **lặp**: thứ, tiết, khoảng tuần, `interval_weeks` (1 = hàng tuần, 2 = cách 2 tuần…), phòng, nhóm |
| `entries` | mục `event` / `deadline`: ngày, giờ, done, nhóm, **`repeat_weekly` + `repeat_interval_weeks` + `repeat_until`** (lặp hàng tuần / cách N tuần) |
| `exceptions` | một buổi cụ thể bị **huỷ/dời** (không ảnh hưởng các tuần khác) |

`buildDay()` gộp `sessions` (đã lọc theo tuần + `interval_weeks` + `exceptions`) + `entries` của ngày (kể cả `repeat_weekly` được trải theo `repeat_interval_weeks`) thành `Occurrence[]` — mọi view đều đọc từ đây, nên không cần cron/realtime. `buildMonth()` dựng lưới tháng và chấm màu theo nhóm. Bộ lọc nhóm áp dụng ngay trên `Occurrence[]` (chọn nhiều nhóm = hiện mục thuộc bất kỳ nhóm nào).

## Deploy

**Vercel** (web + AI cùng một chỗ):

1. Import repo vào Vercel — tự nhận Vite, thư mục `api/` thành serverless function.
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` (tuỳ chọn `GEMINI_MODEL`).
3. Có Supabase thì `/api/ai/extract` **bắt đăng nhập** (token Supabase) — người lạ không gọi được để đốt quota Gemini.
4. Giới hạn request của Vercel ~4.5MB: ảnh chụp thẳng từ camera có thể quá lớn → dùng ảnh chụp màn hình hoặc cắt bớt.

**Host tĩnh khác** (Cloudflare Pages, GitHub Pages…): chạy `server/index.mjs` ở một máy chủ Node riêng, đặt `AI_ALLOWED_ORIGIN=<domain web>` cho server và `VITE_AI_URL=<URL server>` khi build web.

**Offline**: bản build có service worker giữ sẵn giao diện; dữ liệu Supabase lần tải gần nhất được lưu trên máy, mất mạng vẫn xem được (chỉ xem — thay đổi lúc offline sẽ báo lỗi và không lưu).

## Việc còn lại

- Import `.xls` TKB của trường (parser regex đã có sẵn trong repo tham khảo `ai-study-os`)
- Thông báo trước giờ học 10 phút (PWA + Notification API)

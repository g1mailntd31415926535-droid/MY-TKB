import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env", "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const anon = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();
const email = process.argv[2];
const password = process.argv[3];

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const info = (m) => console.log(`  \x1b[36m•\x1b[0m ${m}`);

if (!url || !anon) {
  console.error("Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong .env");
  process.exit(1);
}

console.log(`\nProject: ${url}`);
const sb = createClient(url, anon, { db: { schema: "track_tkb" } });
let failed = 0;

if (email && password) {
  const { data: session, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    bad(`Đăng nhập thất bại: ${error.message}`);
    process.exit(1);
  }
  ok(`Đăng nhập: ${session.user?.email}`);
} else {
  info("Không có email/mật khẩu → chỉ kiểm tra cấu trúc, bỏ qua phần ghi dữ liệu.");
  info("Chạy đầy đủ: node scripts/check-supabase.mjs <email> <password>");
}

for (const table of ["settings", "tags", "subjects", "sessions", "entries", "exceptions"]) {
  const { error } = await sb.from(table).select("*").limit(1);
  if (error) {
    failed++;
    bad(`${table}: ${error.code ?? ""} ${error.message}`);
    if (error.code === "PGRST106") {
      console.log("     → thêm `track_tkb` vào Project Settings → API → Exposed schemas");
    }
    if (error.code === "42P01") {
      console.log(
        "     → chạy lần lượt 001_init.sql, 002_tags.sql, 003_recurrence_exceptions.sql, 004_entry_repeat.sql, 005_entry_repeat_interval.sql trong SQL Editor",
      );
    }
    if (error.code === "42501") {
      console.log("     → chạy lại phần GRANT trong file SQL");
    }
  } else {
    ok(`bảng ${table} truy cập được`);
  }
}

if (failed === 0) {
  const { error: repeatError } = await sb
    .from("entries")
    .select("repeat_weekly, repeat_interval_weeks, repeat_until")
    .limit(1);
  if (repeatError) {
    failed++;
    bad(`cột lặp định kỳ: ${repeatError.code ?? ""} ${repeatError.message}`);
    console.log("     → chạy 004_entry_repeat.sql và 005_entry_repeat_interval.sql trong SQL Editor");
  } else {
    ok("cột repeat_weekly / repeat_interval_weeks / repeat_until có");
  }
}

if (failed === 0 && email && password) {
  const user = (await sb.auth.getUser()).data.user;
  const probe = {
    id: crypto.randomUUID(),
    user_id: user.id,
    kind: "event",
    title: "__probe__",
    date: new Date().toISOString().slice(0, 10),
    all_day: true,
    done: false,
    priority: "normal",
    source: "manual",
  };
  const { error: writeError } = await sb.from("entries").insert(probe);
  if (writeError) {
    bad(`ghi thử: ${writeError.code ?? ""} ${writeError.message}`);
    failed++;
  } else {
    ok("ghi được (RLS + grant đúng)");
    const { error: delError } = await sb.from("entries").delete().eq("id", probe.id);
    if (delError) {
      bad(`xoá thử: ${delError.message}`);
      failed++;
    } else {
      ok("xoá được");
    }
  }
  await sb.auth.signOut();
}

console.log(
  failed === 0
    ? "\n\x1b[32mCấu trúc OK.\x1b[0m Nếu đã tạo user, đăng nhập trên app là dùng được.\n"
    : `\n\x1b[31m${failed} lỗi cần sửa.\x1b[0m\n`,
);
process.exit(failed === 0 ? 0 : 1);

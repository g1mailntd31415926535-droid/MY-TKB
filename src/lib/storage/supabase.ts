import type { AppSettings, DataSnapshot, Entry, Period, Semester, Session, SessionException, Subject, Tag } from "../../types";
import { emptySettings } from "../time";
import { DEMO, defaultTags, emptySnapshot, upgradeGroupColors } from "../seed";
import { getSupabase } from "../supabase";
import type { Repo } from "./types";

/** Biến lỗi kỹ thuật của Supabase thành việc cần làm. */
function explain(message: string, code?: string): string {
  if (code === "PGRST106" || /schema .*not exposed|Invalid schema/i.test(message)) {
    return "Schema `track_tkb` chưa được mở cho API. Vào Project Settings → API → Exposed schemas → thêm `track_tkb` rồi Save.";
  }
  if (code === "42P01" || /relation .* does not exist/i.test(message)) {
    return "Chưa có bảng. Mở SQL Editor, chạy lần lượt `001_init.sql`, `002_tags.sql`, `003_recurrence_exceptions.sql`, `004_entry_repeat.sql`, `005_entry_repeat_interval.sql`.";
  }
  if (code === "42703" || /column .* does not exist/i.test(message)) {
    return "Thiếu cột mới. Mở SQL Editor, chạy `004_entry_repeat.sql` và `005_entry_repeat_interval.sql`.";
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "RLS chặn truy cập. Kiểm tra bạn đã đăng nhập đúng user và đã chạy phần policy trong file SQL.";
  }
  if (/Invalid login credentials/i.test(message)) return "Sai email hoặc mật khẩu.";
  if (/Email not confirmed/i.test(message)) {
    return "Tài khoản chưa xác nhận. Trong Authentication → Users, sửa user và bật Auto Confirm.";
  }
  if (/Failed to fetch|NetworkError|fetch failed/i.test(message)) {
    return "Không kết nối được Supabase. Kiểm tra VITE_SUPABASE_URL, hoặc project đang bị pause (free tier pause sau 7 ngày không dùng).";
  }
  return message;
}

/**
 * Bảng nằm trong schema `track_tkb`, mỗi dòng gắn `user_id`.
 * Xem supabase/migrations/001_init.sql.
 */
export function createSupabaseRepo(): Repo {
  const client = async () => {
    const sb = await getSupabase();
    if (!sb) throw new Error("Supabase chưa được cấu hình (thiếu VITE_SUPABASE_URL / ANON_KEY).");
    return sb;
  };

  const userId = async () => {
    const sb = await client();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) throw new Error("Bạn chưa đăng nhập.");
    return data.user.id;
  };

  const upsert = async (table: string, row: object) => {
    const sb = await client();
    const user = await userId();
    const { error } = await sb.from(table).upsert({ ...row, user_id: user });
    if (error) throw new Error(`${table}: ${explain(error.message, error.code)}`);
  };

  const remove = async (table: string, id: string) => {
    const sb = await client();
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw new Error(`${table}: ${explain(error.message, error.code)}`);
  };

  return {
    mode: "supabase",

    async load(): Promise<DataSnapshot> {
      const sb = await client();
      const user = await userId();
      const [settingsRes, tagsRes, subjectsRes, sessionsRes, entriesRes, exceptionsRes] = await Promise.all([
        sb.from("settings").select("semester, periods").eq("user_id", user).maybeSingle(),
        sb.from("tags").select("*").eq("user_id", user).order("name"),
        sb.from("subjects").select("*").eq("user_id", user).order("code"),
        sb.from("sessions").select("*").eq("user_id", user),
        sb.from("entries").select("*").eq("user_id", user),
        sb.from("exceptions").select("*").eq("user_id", user),
      ]);

      const err =
        settingsRes.error ??
        tagsRes.error ??
        subjectsRes.error ??
        sessionsRes.error ??
        entriesRes.error ??
        exceptionsRes.error;
      if (err) throw new Error(explain(err.message, err.code));

      const row = settingsRes.data as { semester?: Semester; periods?: Period[] } | null;
      const settings: AppSettings =
        row?.semester && row.periods?.length
          ? { semester: row.semester, periods: row.periods }
          : emptySettings();

      if (!row) {
        // Lần đầu đăng nhập: tạo sẵn dòng settings để lần sau không phải đoán.
        await upsert("settings", { semester: settings.semester, periods: settings.periods });
      }

      const subjects = (subjectsRes.data ?? []) as Subject[];
      const sessions = (sessionsRes.data ?? []) as Session[];
      const entries = (entriesRes.data ?? []) as Entry[];
      const exceptions = (exceptionsRes.data ?? []) as SessionException[];
      let tags = (tagsRes.data ?? []) as Tag[];

      if (tags.length === 0) {
        // Lần đầu dùng nhóm → tạo bộ mặc định và gắn:
        // lịch học → nhóm 1 (Lịch học), sự kiện/deadline → nhóm 2 (Hoạt động).
        const seeded = defaultTags();
        const { error } = await sb
          .from("tags")
          .insert(seeded.map((t) => ({ ...t, user_id: user })));
        if (!error) {
          tags = seeded;
          const classTag = seeded[0].id;
          const otherTag = (seeded[1] ?? seeded[0]).id;
          if (sessions.length) {
            await sb
              .from("sessions")
              .update({ tag_id: classTag })
              .eq("user_id", user)
              .is("tag_id", null);
            for (const s of sessions) if (!s.tag_id) s.tag_id = classTag;
          }
          if (entries.length) {
            await sb
              .from("entries")
              .update({ tag_id: otherTag })
              .eq("user_id", user)
              .is("tag_id", null);
            for (const e of entries) if (!e.tag_id) e.tag_id = otherTag;
          }
        }
      }

      const upgradedTags = upgradeGroupColors(tags);
      if (upgradedTags !== tags) {
        tags = upgradedTags;
        await sb.from("tags").upsert(tags.map((t) => ({ ...t, user_id: user })));
      }

      return { settings, tags, subjects, sessions, entries, exceptions };
    },

    async putSettings(settings) {
      await upsert("settings", { semester: settings.semester, periods: settings.periods });
    },

    async putTag(tag) {
      await upsert("tags", tag);
    },

    async removeTag(id) {
      await remove("tags", id);
    },

    async putSubject(subject) {
      await upsert("subjects", subject);
    },

    async removeSubject(id) {
      const sb = await client();
      await sb.from("sessions").delete().eq("subject_id", id);
      await sb.from("entries").update({ subject_id: null }).eq("subject_id", id);
      await remove("subjects", id);
    },

    async putSession(session) {
      await upsert("sessions", session);
    },

    async removeSession(id) {
      await remove("sessions", id);
    },

    async putEntry(entry) {
      await upsert("entries", entry);
    },

    async removeEntry(id) {
      await remove("entries", id);
    },

    async putException(exception) {
      await upsert("exceptions", exception);
    },

    async removeException(id) {
      await remove("exceptions", id);
    },

    async reset(demo) {
      const sb = await client();
      const user = await userId();
      await Promise.all([
        sb.from("exceptions").delete().eq("user_id", user),
        sb.from("entries").delete().eq("user_id", user),
        sb.from("sessions").delete().eq("user_id", user),
        sb.from("subjects").delete().eq("user_id", user),
        sb.from("tags").delete().eq("user_id", user),
        sb.from("settings").delete().eq("user_id", user),
      ]);

      const withUser = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, user_id: user }));

      if (!demo) {
        const empty = emptySnapshot();
        await sb.from("settings").upsert({
          user_id: user,
          semester: empty.settings.semester,
          periods: empty.settings.periods,
        });
        const { error } = await sb.from("tags").insert(withUser(empty.tags));
        if (error) throw new Error(explain(error.message, error.code));
        return empty;
      }

      // Nạp dữ liệu demo lên cloud (không chỉ hiện ở máy này).
      const base = structuredClone(DEMO);
      await sb
        .from("settings")
        .upsert({ user_id: user, semester: base.settings.semester, periods: base.settings.periods });
      if (base.tags.length) {
        const { error } = await sb.from("tags").insert(withUser(base.tags));
        if (error) throw new Error(explain(error.message, error.code));
      }
      if (base.subjects.length) {
        const { error } = await sb.from("subjects").insert(withUser(base.subjects));
        if (error) throw new Error(explain(error.message, error.code));
      }
      if (base.sessions.length) {
        const { error } = await sb.from("sessions").insert(withUser(base.sessions));
        if (error) throw new Error(explain(error.message, error.code));
      }
      if (base.entries.length) {
        const { error } = await sb.from("entries").insert(withUser(base.entries));
        if (error) throw new Error(explain(error.message, error.code));
      }
      return base;
    },
  };
}

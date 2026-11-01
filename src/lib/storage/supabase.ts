import type { AppSettings, DataSnapshot, Entry, Period, Semester, Session, SessionException, Subject, Tag } from "../../types";
import { emptySettings } from "../time";
import { DEMO, defaultTags, emptySnapshot, upgradeGroupColors } from "../seed";
import { getSupabase } from "../supabase";
import { profileName, type ProfileId } from "../profile";
import type { Repo } from "./types";

/** Biến lỗi kỹ thuật của Supabase thành việc cần làm. */
function explain(message: string, code?: string): string {
  if (code === "PGRST106" || /schema .*not exposed|Invalid schema/i.test(message)) {
    return "Schema `track_tkb` chưa được mở cho API. Vào Project Settings → API → Exposed schemas → thêm `track_tkb` rồi Save.";
  }
  if (code === "42P01" || /relation .* does not exist/i.test(message)) {
    return "Chưa có bảng. Mở SQL Editor, chạy lần lượt `001_init.sql`, `002_tags.sql`, `003_recurrence_exceptions.sql`, `004_entry_repeat.sql`, `005_entry_repeat_interval.sql`, `006_profiles.sql`.";
  }
  if (code === "42703" || /column .* does not exist/i.test(message)) {
    return "Thiếu cột mới. Mở SQL Editor, chạy `004_entry_repeat.sql`, `005_entry_repeat_interval.sql` và `006_profiles.sql`.";
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "RLS chặn truy cập. Kiểm tra bạn đã đăng nhập đúng user và đã chạy phần policy trong file SQL.";
  }
  if (/Invalid login credentials/i.test(message)) return "Sai email hoặc mật khẩu.";
  if (/Email not confirmed/i.test(message)) {
    return "Tài khoản chưa xác nhận. Trong Authentication → Users, sửa user và bật Auto Confirm.";
  }
  if (/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(message)) {
    return "Không kết nối được Supabase. Kiểm tra VITE_SUPABASE_URL, hoặc project đang bị pause (free tier pause sau 7 ngày không dùng).";
  }
  return message;
}

/** MyTKB giữ khoá cache cũ; TKB khác có khoá riêng. */
const cacheKey = (profile: ProfileId) =>
  profile === "my" ? "track-tkb:cloud-cache" : `track-tkb:cloud-cache:${profile}`;

/** Ném lỗi Supabase (nếu có) dưới dạng câu dễ hiểu. */
function check(table: string, res: { error: { message: string; code?: string } | null }) {
  if (res.error) throw new Error(`${table}: ${explain(res.error.message, res.error.code)}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let profileColumn: Promise<boolean> | null = null;

/**
 * Cột `profile` có từ `006_profiles.sql`. Chưa chạy file đó thì MyTKB vẫn chạy
 * như cũ (không lọc theo profile), còn TKB khác sẽ báo cần chạy migration.
 */
function hasProfileColumn(sb: any): Promise<boolean> {
  profileColumn ??= sb
    .from("settings")
    .select("profile")
    .limit(1)
    .then((res: { error: { message: string; code?: string } | null }) => {
      if (!res.error) return true;
      if (res.error.code === "42703" || /column .*profile.* does not exist/i.test(res.error.message)) {
        // Không nhớ kết quả "chưa có cột": chạy migration xong là app (kể cả máy
        // khác đang mở) chuyển sang lọc theo profile ngay, không bao giờ đọc/xoá
        // lẫn dữ liệu của TKB khác.
        profileColumn = null;
        return false;
      }
      throw new Error(explain(res.error.message, res.error.code));
    })
    .catch((e: unknown) => {
      profileColumn = null; // lỗi mạng: lần sau hỏi lại
      throw e;
    });
  return profileColumn!;
}

/** Bỏ cột `profile` khỏi dòng đọc về — app không cần biết tới nó. */
function strip<T>(rows: T[] | null): T[] {
  return (rows ?? []).map((r) => {
    const rest = { ...r } as T & { profile?: string };
    delete rest.profile;
    return rest as T;
  });
}

/**
 * Bảng nằm trong schema `track_tkb`, mỗi dòng gắn `user_id` + `profile`
 * (TKB nào). Xem supabase/migrations/001_init.sql và 006_profiles.sql.
 */
export function createSupabaseRepo(profile: ProfileId): Repo {
  const CACHE_KEY = cacheKey(profile);

  const client = async () => {
    const sb = await getSupabase();
    if (!sb) throw new Error("Supabase chưa được cấu hình (thiếu VITE_SUPABASE_URL / ANON_KEY).");
    return sb;
  };

  const userId = async () => {
    const sb = await client();
    const { data, error } = await sb.auth.getUser();
    if (error && error.status !== 401 && error.status !== 403) {
      // Lỗi mạng (offline, Supabase pause) — báo đúng bản chất thay vì "chưa đăng nhập".
      throw new Error(explain(error.message, error.code));
    }
    if (error || !data.user) throw new Error("Bạn chưa đăng nhập.");
    return data.user.id;
  };

  /**
   * Phạm vi dữ liệu của TKB đang xem: `own(q)` lọc theo user + profile,
   * `row(r)` gắn user + profile vào dòng sắp ghi.
   */
  const scope = async () => {
    const sb = await client();
    const user = await userId();
    const tagged = await hasProfileColumn(sb);
    if (!tagged && profile !== "my") {
      throw new Error(
        `Supabase chưa hỗ trợ nhiều TKB nên chưa mở được ${profileName(profile)}. Mở SQL Editor, chạy \`006_profiles.sql\` rồi bấm Thử lại.`,
      );
    }
    return {
      sb,
      user,
      own: (q: any) => (tagged ? q.eq("user_id", user).eq("profile", profile) : q.eq("user_id", user)),
      row: <T extends object>(r: T) => (tagged ? { ...r, user_id: user, profile } : { ...r, user_id: user }),
    };
  };

  const upsert = async (table: string, row: object) => {
    const { sb, row: withScope } = await scope();
    const { error } = await sb.from(table).upsert(withScope(row));
    if (error) throw new Error(`${table}: ${explain(error.message, error.code)}`);
  };

  const remove = async (table: string, id: string) => {
    const sb = await client();
    check(table, await sb.from(table).delete().eq("id", id));
  };

  /** User trong phiên đã lưu trên máy — không cần mạng. */
  const sessionUserId = async (): Promise<string | null> => {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.user?.id ?? null;
  };

  return {
    mode: "supabase",

    async loadCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw) as { userId: string; data: DataSnapshot };
        const user = await sessionUserId();
        return user && cached.userId === user ? cached.data : null;
      } catch {
        return null;
      }
    },

    saveCache(data) {
      void sessionUserId().then((userId) => {
        if (!userId) return;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, data }));
        } catch {
          /* hết dung lượng localStorage — bỏ qua, cache chỉ là phụ */
        }
      });
    },

    async load(): Promise<DataSnapshot> {
      const { sb, own, row: withScope } = await scope();
      const [settingsRes, tagsRes, subjectsRes, sessionsRes, entriesRes, exceptionsRes] = await Promise.all([
        own(sb.from("settings").select("semester, periods")).maybeSingle(),
        own(sb.from("tags").select("*")).order("name"),
        own(sb.from("subjects").select("*")).order("code"),
        own(sb.from("sessions").select("*")),
        own(sb.from("entries").select("*")),
        own(sb.from("exceptions").select("*")),
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
        // Lần đầu mở TKB này: tạo sẵn dòng settings để lần sau không phải đoán.
        await upsert("settings", { semester: settings.semester, periods: settings.periods });
      }

      const subjects = strip(subjectsRes.data as Subject[] | null);
      const sessions = strip(sessionsRes.data as Session[] | null);
      const entries = strip(entriesRes.data as Entry[] | null);
      const exceptions = strip(exceptionsRes.data as SessionException[] | null);
      let tags = strip(tagsRes.data as Tag[] | null);

      if (tags.length === 0) {
        // Lần đầu dùng nhóm → tạo bộ mặc định và gắn:
        // lịch học → nhóm 1 (Lịch học), sự kiện/deadline → nhóm 2 (Hoạt động).
        const seeded = defaultTags();
        const { error } = await sb.from("tags").insert(seeded.map((t) => withScope(t)));
        if (!error) {
          tags = seeded;
          const classTag = seeded[0].id;
          const otherTag = (seeded[1] ?? seeded[0]).id;
          if (sessions.length) {
            check(
              "sessions",
              await own(sb.from("sessions").update({ tag_id: classTag })).is("tag_id", null),
            );
            for (const s of sessions) if (!s.tag_id) s.tag_id = classTag;
          }
          if (entries.length) {
            check(
              "entries",
              await own(sb.from("entries").update({ tag_id: otherTag })).is("tag_id", null),
            );
            for (const e of entries) if (!e.tag_id) e.tag_id = otherTag;
          }
        }
      }

      const upgradedTags = upgradeGroupColors(tags);
      if (upgradedTags !== tags) {
        tags = upgradedTags;
        check("tags", await sb.from("tags").upsert(tags.map((t) => withScope(t))));
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
      check("sessions", await sb.from("sessions").delete().eq("subject_id", id));
      check("entries", await sb.from("entries").update({ subject_id: null }).eq("subject_id", id));
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
      const { sb, own, row: withScope } = await scope();
      // Chỉ xoá dữ liệu của TKB đang xem, tuần tự từ bảng con lên bảng cha;
      // lỗi ở đâu dừng ở đó và báo ra.
      for (const table of ["exceptions", "entries", "sessions", "subjects", "tags", "settings"]) {
        check(table, await own(sb.from(table).delete()));
      }

      const withUser = <T extends object>(rows: T[]) => rows.map((r) => withScope(r));

      if (!demo) {
        const empty = emptySnapshot();
        check(
          "settings",
          await sb
            .from("settings")
            .upsert(withScope({ semester: empty.settings.semester, periods: empty.settings.periods })),
        );
        const { error } = await sb.from("tags").insert(withUser(empty.tags));
        if (error) throw new Error(explain(error.message, error.code));
        return empty;
      }

      // Nạp dữ liệu demo lên cloud (không chỉ hiện ở máy này).
      // Tạo mới (id mới) — dùng chung DEMO thì 2 TKB cùng nạp demo sẽ trùng id.
      const base = demo === DEMO ? emptySnapshot() : structuredClone(demo);
      check(
        "settings",
        await sb
          .from("settings")
          .upsert(withScope({ semester: base.settings.semester, periods: base.settings.periods })),
      );
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

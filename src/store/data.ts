import { create } from "zustand";
import type { AppSettings, DataSnapshot, Entry, Session, SessionException, Subject, Tag } from "../types";
import { getRepo } from "../lib/storage";
import { DEMO, emptySnapshot } from "../lib/seed";
import { applyProfileTheme, loadProfile, saveProfile, type ProfileId } from "../lib/profile";

interface DataState {
  ready: boolean;
  error: string | null;
  /** Đang hiện dữ liệu cache vì không kết nối được Supabase. */
  offline: boolean;
  mode: "local" | "supabase";
  /** TKB đang xem (MyTKB, LinTKB…). */
  profile: ProfileId;
  data: DataSnapshot;
  init: () => Promise<void>;
  switchProfile: (profile: ProfileId) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  saveTag: (tag: Tag) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  saveSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  saveSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveEntry: (entry: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  saveException: (exception: SessionException) => Promise<void>;
  deleteException: (id: string) => Promise<void>;
  toggleDone: (entry: Entry) => Promise<void>;
  reset: (demo: boolean) => Promise<void>;
}

const initialProfile = loadProfile();
applyProfileTheme(initialProfile);

/** Repo của TKB đang xem; đổi TKB thì đổi repo. */
let repo = getRepo(initialProfile);

function isNetworkError(message: string) {
  return (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    /Không kết nối được Supabase|Failed to fetch|NetworkError|fetch failed|Load failed/i.test(message)
  );
}

export const useData = create<DataState>((set, get) => {
  /**
   * Cập nhật giao diện ngay, rồi ghi xuống repo. Ghi lỗi thì đưa giao diện
   * về như cũ (hoặc tải lại nếu đã có thay đổi khác chen vào) và ném lỗi tiếp
   * để nơi gọi hiện toast.
   */
  const mutate = async (updater: (d: DataSnapshot) => DataSnapshot, write: () => Promise<void>) => {
    const owner = repo;
    const prev = get().data;
    const next = updater(prev);
    set({ data: next });
    try {
      await write();
    } catch (e) {
      // Đã chuyển sang TKB khác trong lúc ghi: không đụng vào dữ liệu đang hiện.
      if (repo !== owner) throw e;
      if (get().data === next) {
        set({ data: prev });
      } else {
        try {
          set({ data: await repo.load() });
        } catch {
          /* giữ nguyên, lỗi gốc vẫn được báo bên dưới */
        }
      }
      throw e;
    }
    if (repo === owner) repo.saveCache?.(get().data);
  };

  const upsert = <T extends { id: string }>(list: T[], item: T) => {
    const i = list.findIndex((x) => x.id === item.id);
    if (i < 0) return [...list, item];
    const next = list.slice();
    next[i] = item;
    return next;
  };

  return {
    ready: false,
    error: null,
    offline: false,
    mode: repo.mode,
    profile: initialProfile,
    data: emptySnapshot(),

    async init() {
      const owner = repo;
      set({ error: null });
      try {
        const data = await owner.load();
        if (repo !== owner) return; // đã chuyển TKB khác
        set({ data, ready: true, offline: false, mode: owner.mode });
        owner.saveCache?.(data);
      } catch (e) {
        if (repo !== owner) return;
        const message = e instanceof Error ? e.message : String(e);
        const cached = isNetworkError(message) ? await owner.loadCache?.() : null;
        if (repo !== owner) return;
        if (cached) {
          set({ data: cached, ready: true, offline: true, mode: repo.mode });
          return;
        }
        set({ ready: true, error: message });
        throw e;
      }
    },

    async switchProfile(profile) {
      if (profile === get().profile) return;
      saveProfile(profile);
      applyProfileTheme(profile);
      repo = getRepo(profile);
      set({ profile, ready: false, error: null, offline: false, data: emptySnapshot() });
      await get().init();
    },

    async saveSettings(settings) {
      await mutate((d) => ({ ...d, settings }), () => repo.putSettings(settings));
    },

    async saveTag(tag) {
      await mutate((d) => ({ ...d, tags: upsert(d.tags, tag) }), () => repo.putTag(tag));
    },

    async deleteTag(id) {
      await mutate((d) => ({
        ...d,
        tags: d.tags.filter((t) => t.id !== id),
        sessions: d.sessions.map((s) => (s.tag_id === id ? { ...s, tag_id: null } : s)),
        entries: d.entries.map((e) => (e.tag_id === id ? { ...e, tag_id: null } : e)),
      }), () => repo.removeTag(id));
    },

    async saveSubject(subject) {
      await mutate((d) => ({ ...d, subjects: upsert(d.subjects, subject) }), () => repo.putSubject(subject));
    },

    async deleteSubject(id) {
      await mutate((d) => ({
        ...d,
        subjects: d.subjects.filter((s) => s.id !== id),
        sessions: d.sessions.filter((s) => s.subject_id !== id),
      }), () => repo.removeSubject(id));
    },

    async saveSession(session) {
      await mutate((d) => ({ ...d, sessions: upsert(d.sessions, session) }), () => repo.putSession(session));
    },

    async deleteSession(id) {
      await mutate((d) => ({
        ...d,
        sessions: d.sessions.filter((s) => s.id !== id),
        exceptions: d.exceptions.filter((x) => x.session_id !== id),
      }), () => repo.removeSession(id));
    },

    async saveEntry(entry) {
      await mutate((d) => ({ ...d, entries: upsert(d.entries, entry) }), () => repo.putEntry(entry));
    },

    async deleteEntry(id) {
      await mutate((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }), () => repo.removeEntry(id));
    },

    async saveException(exception) {
      await mutate((d) => ({
        ...d,
        exceptions: upsert(d.exceptions, exception),
      }), () => repo.putException(exception));
    },

    async deleteException(id) {
      await mutate((d) => ({ ...d, exceptions: d.exceptions.filter((x) => x.id !== id) }), () => repo.removeException(id));
    },

    async toggleDone(entry) {
      await get().saveEntry({ ...entry, done: !entry.done });
    },

    async reset(demo) {
      const owner = repo;
      const data = await owner.reset(demo ? DEMO : emptySnapshot());
      if (repo !== owner) return;
      set({ data: structuredClone(data) });
      owner.saveCache?.(data);
    },
  };
});

import { create } from "zustand";
import type { AppSettings, DataSnapshot, Entry, Session, SessionException, Subject, Tag } from "../types";
import { getRepo } from "../lib/storage";
import { DEMO, emptySnapshot } from "../lib/seed";

interface DataState {
  ready: boolean;
  error: string | null;
  mode: "local" | "supabase";
  data: DataSnapshot;
  init: () => Promise<void>;
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

const repo = getRepo();

export const useData = create<DataState>((set, get) => {
  const commit = (updater: (d: DataSnapshot) => DataSnapshot) =>
    set({ data: updater(get().data) });

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
    mode: repo.mode,
    data: emptySnapshot(),

    async init() {
      set({ error: null });
      try {
        const data = await repo.load();
        set({ data, ready: true, mode: repo.mode });
      } catch (e) {
        set({ ready: true, error: e instanceof Error ? e.message : String(e) });
        throw e;
      }
    },

    async saveSettings(settings) {
      commit((d) => ({ ...d, settings }));
      await repo.putSettings(settings);
    },

    async saveTag(tag) {
      commit((d) => ({ ...d, tags: upsert(d.tags, tag) }));
      await repo.putTag(tag);
    },

    async deleteTag(id) {
      commit((d) => ({
        ...d,
        tags: d.tags.filter((t) => t.id !== id),
        sessions: d.sessions.map((s) => (s.tag_id === id ? { ...s, tag_id: null } : s)),
        entries: d.entries.map((e) => (e.tag_id === id ? { ...e, tag_id: null } : e)),
      }));
      await repo.removeTag(id);
    },

    async saveSubject(subject) {
      commit((d) => ({ ...d, subjects: upsert(d.subjects, subject) }));
      await repo.putSubject(subject);
    },

    async deleteSubject(id) {
      commit((d) => ({
        ...d,
        subjects: d.subjects.filter((s) => s.id !== id),
        sessions: d.sessions.filter((s) => s.subject_id !== id),
      }));
      await repo.removeSubject(id);
    },

    async saveSession(session) {
      commit((d) => ({ ...d, sessions: upsert(d.sessions, session) }));
      await repo.putSession(session);
    },

    async deleteSession(id) {
      commit((d) => ({
        ...d,
        sessions: d.sessions.filter((s) => s.id !== id),
        exceptions: d.exceptions.filter((x) => x.session_id !== id),
      }));
      await repo.removeSession(id);
    },

    async saveEntry(entry) {
      commit((d) => ({ ...d, entries: upsert(d.entries, entry) }));
      await repo.putEntry(entry);
    },

    async deleteEntry(id) {
      commit((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
      await repo.removeEntry(id);
    },

    async saveException(exception) {
      commit((d) => ({
        ...d,
        exceptions: upsert(d.exceptions, exception),
      }));
      await repo.putException(exception);
    },

    async deleteException(id) {
      commit((d) => ({ ...d, exceptions: d.exceptions.filter((x) => x.id !== id) }));
      await repo.removeException(id);
    },

    async toggleDone(entry) {
      await get().saveEntry({ ...entry, done: !entry.done });
    },

    async reset(demo) {
      const data = await repo.reset(demo ? DEMO : emptySnapshot());
      set({ data: structuredClone(data) });
    },
  };
});

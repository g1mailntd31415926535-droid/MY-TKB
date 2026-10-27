import type { DataSnapshot } from "../../types";
import { DEMO, defaultTags, emptySnapshot, upgradeGroupColors } from "../seed";
import type { Repo } from "./types";

const KEY = "track-tkb:v1";

/** Nâng dữ liệu cũ (chưa có tag) lên mô hình mới. */
function migrate(s: DataSnapshot): DataSnapshot {
  let changed = false;

  if (!Array.isArray(s.tags)) {
    s.tags = defaultTags();
    changed = true;
  }

  if (!Array.isArray(s.exceptions)) {
    s.exceptions = [];
    changed = true;
  }

  const upgradedTags = upgradeGroupColors(s.tags);
  if (upgradedTags !== s.tags) {
    s.tags = upgradedTags;
    changed = true;
  }

  if (s.sessions.some((x) => x.interval_weeks === undefined)) {
    s.sessions = s.sessions.map((x) =>
      x.interval_weeks === undefined ? { ...x, interval_weeks: 1 } : x,
    );
    changed = true;
  }

  if (
    s.entries.some(
      (x) =>
        x.repeat_weekly === undefined ||
        x.repeat_interval_weeks === undefined ||
        x.repeat_until === undefined,
    )
  ) {
    s.entries = s.entries.map((x) => ({
      ...x,
      repeat_weekly: x.repeat_weekly ?? false,
      repeat_interval_weeks: x.repeat_interval_weeks ?? 1,
      repeat_until: x.repeat_until ?? null,
    }));
    changed = true;
  }

  const fallbackSession = s.tags[0]?.id ?? null;
  const fallbackEntry = s.tags[1]?.id ?? s.tags[0]?.id ?? null;

  if (s.sessions.some((x) => x.tag_id === undefined)) {
    s.sessions = s.sessions.map((x) =>
      x.tag_id === undefined ? { ...x, tag_id: fallbackSession } : x,
    );
    changed = true;
  }
  if (s.entries.some((x) => x.tag_id === undefined)) {
    s.entries = s.entries.map((x) =>
      x.tag_id === undefined ? { ...x, tag_id: fallbackEntry } : x,
    );
    changed = true;
  }

  if (changed) localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function read(): DataSnapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEMO));
      return structuredClone(DEMO);
    }
    const parsed = JSON.parse(raw) as DataSnapshot;
    if (!parsed.settings?.semester || !Array.isArray(parsed.subjects)) {
      throw new Error("bad shape");
    }
    return migrate(parsed);
  } catch {
    const fresh = emptySnapshot();
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function write(next: DataSnapshot) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function createLocalRepo(): Repo {
  return {
    mode: "local",
    async load() {
      return read();
    },
    async putSettings(settings) {
      write({ ...read(), settings });
    },
    async putTag(tag) {
      const s = read();
      const i = s.tags.findIndex((x) => x.id === tag.id);
      if (i >= 0) s.tags[i] = tag;
      else s.tags.push(tag);
      write(s);
    },
    async removeTag(id) {
      const s = read();
      s.tags = s.tags.filter((x) => x.id !== id);
      s.sessions = s.sessions.map((x) => (x.tag_id === id ? { ...x, tag_id: null } : x));
      s.entries = s.entries.map((x) => (x.tag_id === id ? { ...x, tag_id: null } : x));
      write(s);
    },
    async putSubject(subject) {
      const s = read();
      const i = s.subjects.findIndex((x) => x.id === subject.id);
      if (i >= 0) s.subjects[i] = subject;
      else s.subjects.push(subject);
      write(s);
    },
    async removeSubject(id) {
      const s = read();
      s.subjects = s.subjects.filter((x) => x.id !== id);
      s.sessions = s.sessions.filter((x) => x.subject_id !== id);
      write(s);
    },
    async putSession(session) {
      const s = read();
      const i = s.sessions.findIndex((x) => x.id === session.id);
      if (i >= 0) s.sessions[i] = session;
      else s.sessions.push(session);
      write(s);
    },
    async removeSession(id) {
      const s = read();
      s.sessions = s.sessions.filter((x) => x.id !== id);
      s.exceptions = s.exceptions.filter((x) => x.session_id !== id);
      write(s);
    },
    async putEntry(entry) {
      const s = read();
      const i = s.entries.findIndex((x) => x.id === entry.id);
      if (i >= 0) s.entries[i] = entry;
      else s.entries.push(entry);
      write(s);
    },
    async removeEntry(id) {
      const s = read();
      s.entries = s.entries.filter((x) => x.id !== id);
      write(s);
    },
    async putException(exception) {
      const s = read();
      const i = s.exceptions.findIndex((x) => x.id === exception.id);
      if (i >= 0) s.exceptions[i] = exception;
      else s.exceptions.push(exception);
      write(s);
    },
    async removeException(id) {
      const s = read();
      s.exceptions = s.exceptions.filter((x) => x.id !== id);
      write(s);
    },
    async reset(demo) {
      const next = demo ? structuredClone(DEMO) : emptySnapshot();
      write(next);
      return next;
    },
  };
}

import type { AppSettings, DataSnapshot, Entry, Session, SessionException, Subject, Tag } from "../../types";

export interface Repo {
  mode: "local" | "supabase";
  load(): Promise<DataSnapshot>;
  putSettings(s: AppSettings): Promise<void>;
  putTag(t: Tag): Promise<void>;
  removeTag(id: string): Promise<void>;
  putSubject(s: Subject): Promise<void>;
  removeSubject(id: string): Promise<void>;
  putSession(s: Session): Promise<void>;
  removeSession(id: string): Promise<void>;
  putEntry(e: Entry): Promise<void>;
  removeEntry(id: string): Promise<void>;
  putException(e: SessionException): Promise<void>;
  removeException(id: string): Promise<void>;
  reset(demo: DataSnapshot): Promise<DataSnapshot>;
  /** Bản sao dữ liệu cloud lần gần nhất, dùng khi mất mạng (chỉ repo Supabase). */
  loadCache?(): Promise<DataSnapshot | null>;
  saveCache?(data: DataSnapshot): void;
}

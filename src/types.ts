export type Page = "today" | "month" | "all" | "ai" | "settings";

/** Lịch học lặp theo tuần (từ TKB nhà trường). */
export type SessionKind = "class";

/** Việc một lần: sự kiện/hội thảo hoặc deadline. */
export type EntryKind = "event" | "deadline";

export type ItemKind = SessionKind | EntryKind;
export type Priority = "low" | "normal" | "high";
export type Source = "manual" | "import" | "ai";

export interface Period {
  /** 1..n */
  index: number;
  /** "HH:mm" */
  start: string;
  /** "HH:mm" */
  end: string;
}

export interface Semester {
  name: string;
  /** "YYYY-MM-DD" — thứ 2 của tuần 1 */
  start_date: string;
  total_weeks: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  color: string;
  teacher: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Session {
  id: string;
  subject_id: string;
  /** 1 = Thứ 2 … 7 = Chủ nhật */
  day_of_week: number;
  period_start: number;
  period_end: number;
  /** Tuần bắt đầu (cũng là tuần "mốc" cho lặp cách quãng). */
  weeks_start: number;
  weeks_end: number;
  /** 1 = hàng tuần, 2 = cách 2 tuần, 3 = cách 3 tuần… */
  interval_weeks: number;
  room: string | null;
  note: string | null;
  tag_id: string | null;
}

/** Buổi học bị huỷ / dời ở một ngày cụ thể (không ảnh hưởng các tuần khác). */
export interface SessionException {
  id: string;
  session_id: string;
  /** "YYYY-MM-DD" — ngày gốc của buổi học bị huỷ */
  date: string;
  note: string | null;
}

export interface Entry {
  id: string;
  kind: EntryKind;
  title: string;
  /** "YYYY-MM-DD" — ngày đầu tiên (với lịch lặp: ngày bắt đầu chuỗi) */
  date: string;
  /** "HH:mm" | null */
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  /** true = có lặp lại, bắt đầu từ `date` */
  repeat_weekly: boolean;
  /** 1 = hàng tuần, 2 = cách 2 tuần, 3 = cách 3 tuần… (chỉ dùng khi repeat_weekly = true) */
  repeat_interval_weeks: number;
  /** "YYYY-MM-DD" | null — ngày lặp cuối cùng; null = đến hết học kỳ */
  repeat_until: string | null;
  done: boolean;
  priority: Priority;
  subject_id: string | null;
  location: string | null;
  note: string | null;
  source: Source;
  tag_id: string | null;
}

export interface AppSettings {
  semester: Semester;
  periods: Period[];
}

export interface DataSnapshot {
  settings: AppSettings;
  tags: Tag[];
  subjects: Subject[];
  sessions: Session[];
  entries: Entry[];
  exceptions: SessionException[];
}

/** Một dòng trên lịch, đã trải lặp + đã quy đổi ra giờ thực. */
export interface Occurrence {
  key: string;
  source: "session" | "entry";
  id: string;
  kind: ItemKind;
  title: string;
  subject: Subject | null;
  date: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm" */
  end: string;
  allDay: boolean;
  /** 0 = không lặp, 1 = hàng tuần, 2 = cách 2 tuần… */
  repeatIntervalWeeks: number;
  room: string | null;
  note: string | null;
  done: boolean;
  priority: Priority;
  tag: Tag | null;
}

/** Kết quả AI trả về, trước khi người dùng xác nhận. */
export interface AiDraft {
  kind: EntryKind;
  /** add = thêm mới; cancel = huỷ một buổi học cũ; move = dời buổi học cũ sang giờ/ngày mới */
  action: "add" | "cancel" | "move";
  /** id của buổi học (session) bị huỷ/dời, nếu action != add */
  target_id: string | null;
  /** ngày gốc của buổi học bị huỷ/dời */
  target_date: string | null;
  title: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  note: string | null;
  priority: Priority;
  /** Tên nhóm AI đoán được (khớp với nhóm có sẵn), hoặc null */
  tag: string | null;
  /** Những trường AI không chắc / thiếu */
  missing: string[];
  /** Câu hỏi lại người dùng */
  question: string | null;
}

export interface AiExtraction {
  summary: string;
  drafts: AiDraft[];
}

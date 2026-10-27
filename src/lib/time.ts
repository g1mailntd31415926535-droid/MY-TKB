import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import type { AppSettings, DataSnapshot, Entry, Occurrence, Period, Semester, Session, Subject, Tag } from "../types";

export const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
export const DAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** "YYYY-MM-DD" theo giờ máy, không qua UTC. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

/** 1 = Thứ 2 … 7 = Chủ nhật */
export function dayOfWeek(iso: string): number {
  const d = fromISODate(iso).getDay();
  return d === 0 ? 7 : d;
}

export function startOfWeekISO(iso: string): string {
  return toISODate(addDays(fromISODate(iso), -(dayOfWeek(iso) - 1)));
}

/** Tuần thứ mấy của học kỳ (1-based). Có thể < 1 hoặc > total_weeks. */
export function weekNumber(semesterStart: string, iso: string): number {
  const diff = differenceInCalendarDays(fromISODate(iso), fromISODate(semesterStart));
  return Math.floor(diff / 7) + 1;
}

/** Ngày cuối cùng của học kỳ (Chủ nhật của tuần cuối). */
export function semesterEndISO(semester: Semester): string {
  const weeks = Math.max(1, semester.total_weeks);
  return toISODate(addDays(fromISODate(semester.start_date), weeks * 7 - 1));
}

/** "Hàng tuần" / "Cách 2 tuần" — nhãn hiển thị cho lịch lặp. */
export function repeatLabel(weeks: number): string {
  if (weeks <= 0) return "";
  return weeks === 1 ? "Hàng tuần" : `Cách ${weeks} tuần`;
}

/** "hàng tuần" / "cách 2 tuần" — dùng trong câu. */
export function repeatEveryLabel(weeks: number): string {
  if (weeks <= 0) return "";
  return weeks === 1 ? "hàng tuần" : `cách ${weeks} tuần`;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHmm(mins: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Ghép tiết bắt đầu → tiết kết thúc thành khung giờ thực. */
export function periodWindow(periods: Period[], from: number, to: number) {
  const a = periods.find((p) => p.index === from);
  const b = periods.find((p) => p.index === to);
  if (!a || !b) return null;
  return { start: a.start, end: b.end };
}

function subjectOf(subjects: Subject[], id: string | null): Subject | null {
  if (!id) return null;
  return subjects.find((s) => s.id === id) ?? null;
}

function tagOf(tags: Tag[], id: string | null | undefined): Tag | null {
  if (!id) return null;
  return tags.find((t) => t.id === id) ?? null;
}

function sessionToOccurrence(
  s: Session,
  date: string,
  subjects: Subject[],
  periods: Period[],
  tags: Tag[],
): Occurrence | null {
  const w = periodWindow(periods, s.period_start, s.period_end);
  if (!w) return null;
  const subject = subjectOf(subjects, s.subject_id);
  return {
    key: `s:${s.id}:${date}`,
    source: "session",
    id: s.id,
    kind: "class",
    title: subject?.name ?? "Buổi học",
    subject,
    date,
    start: w.start,
    end: w.end,
    allDay: false,
    repeatIntervalWeeks: 0,
    room: s.room,
    note: s.note,
    done: false,
    priority: "normal",
    tag: tagOf(tags, s.tag_id),
  };
}

function entryToOccurrence(
  e: Entry,
  date: string,
  subjects: Subject[],
  tags: Tag[],
): Occurrence {
  return {
    key: `e:${e.id}:${date}`,
    source: "entry",
    id: e.id,
    kind: e.kind,
    title: e.title,
    subject: subjectOf(subjects, e.subject_id),
    date,
    start: e.start_time ?? (e.kind === "deadline" ? "23:59" : "00:00"),
    end: e.end_time ?? e.start_time ?? "",
    allDay: e.all_day || !e.start_time,
    repeatIntervalWeeks: e.repeat_weekly ? Math.max(1, e.repeat_interval_weeks || 1) : 0,
    room: e.location,
    note: e.note,
    done: e.done,
    priority: e.priority,
    tag: tagOf(tags, e.tag_id),
  };
}

function sortKey(o: Occurrence): number {
  if (o.source === "entry" && o.allDay) {
    return o.kind === "deadline" ? 24 * 60 : 0;
  }
  return minutesOf(o.start);
}

/** Toàn bộ việc diễn ra trong 1 ngày, đã sắp xếp. */
export function buildDay(date: string, data: DataSnapshot): Occurrence[] {
  const s = data.settings;
  const week = weekNumber(s.semester.start_date, date);
  const dow = dayOfWeek(date);
  const cancelled = new Set(
    data.exceptions.filter((e) => e.date === date).map((e) => e.session_id),
  );

  const fromSessions = data.sessions
    .filter((x) => {
      if (x.day_of_week !== dow) return false;
      if (week < x.weeks_start || week > x.weeks_end) return false;
      const step = Math.max(1, x.interval_weeks ?? 1);
      if ((week - x.weeks_start) % step !== 0) return false;
      return !cancelled.has(x.id);
    })
    .map((x) => sessionToOccurrence(x, date, data.subjects, s.periods, data.tags))
    .filter((x): x is Occurrence => x !== null);

  const endOfSemester = semesterEndISO(s.semester);
  const fromEntries = data.entries.flatMap((e) => {
    if (e.date === date) return [entryToOccurrence(e, date, data.subjects, data.tags)];
    if (!e.repeat_weekly || date < e.date) return [];
    const until = e.repeat_until || endOfSemester;
    if (date > until) return [];
    const interval = Math.max(1, e.repeat_interval_weeks || 1);
    const diff = differenceInCalendarDays(fromISODate(date), fromISODate(e.date));
    if (diff % (interval * 7) !== 0) return [];
    return [entryToOccurrence(e, date, data.subjects, data.tags)];
  });

  return [...fromSessions, ...fromEntries].sort((a, b) => sortKey(a) - sortKey(b));
}

/** Tag đặc biệt cho mục chưa gắn tag. */
export const NO_TAG = "__none__";

export function matchTag(occ: Occurrence, filter: string[]): boolean {
  if (filter.length === 0) return true;
  if (!occ.tag) return filter.includes(NO_TAG);
  return filter.includes(occ.tag.id);
}

export function buildWeek(anchorISO: string, data: DataSnapshot): { date: string; items: Occurrence[] }[] {
  const monday = startOfWeekISO(anchorISO);
  return Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(fromISODate(monday), i));
    return { date, items: buildDay(date, data) };
  });
}

export interface MonthCell {
  date: string;
  inMonth: boolean;
  items: Occurrence[];
}

/** Lưới lịch tháng (bắt đầu thứ 2), gồm cả ngày của tháng trước/sau. */
export function buildMonth(anchorISO: string, data: DataSnapshot): MonthCell[] {
  const anchor = fromISODate(anchorISO);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstISO = toISODate(first);
  const gridStart = addDays(first, -(dayOfWeek(firstISO) - 1));

  const cells: MonthCell[] = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    const date = toISODate(d);
    return {
      date,
      inMonth: d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear(),
      items: buildDay(date, data),
    };
  });

  // Bỏ tuần cuối nếu cả tuần đều thuộc tháng sau.
  while (cells.length > 35 && cells.slice(-7).every((c) => !c.inMonth)) cells.length -= 7;
  return cells;
}

/** Màu chấm trên lịch tháng: theo màu nhóm, mặc định vàng (lịch học) / đỏ (việc một lần). */
export function dotColor(occ: Occurrence): string {
  if (occ.tag) return occ.tag.color;
  return occ.kind === "class" ? "#f5b301" : "#ef4444";
}

export function isHappening(o: Occurrence, now = new Date()): boolean {
  if (o.allDay) return false;
  const n = nowMinutes(now);
  return minutesOf(o.start) <= n && n < minutesOf(o.end || o.start);
}

export function progressOf(o: Occurrence, now = new Date()): number {
  if (o.allDay) return 0;
  const start = minutesOf(o.start);
  const end = minutesOf(o.end || o.start);
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (nowMinutes(now) - start) / (end - start)));
}

export function nextUp(items: Occurrence[], now = new Date()): Occurrence | null {
  const n = nowMinutes(now);
  return items.find((o) => !o.allDay && minutesOf(o.start) > n) ?? null;
}

export function formatLongDate(iso: string): string {
  const d = fromISODate(iso);
  return `${DAY_LABELS[dayOfWeek(iso) - 1]}, ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

export function formatShortDate(iso: string): string {
  const d = fromISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonthISO(iso: string): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonthsISO(iso: string, delta: number): string {
  const d = fromISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

export function formatMonthLabel(iso: string): string {
  const d = fromISODate(iso);
  return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

export function durationLabel(start: string, end: string): string {
  const diff = minutesOf(end) - minutesOf(start);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? (m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`) : `${m}p`;
}

export function defaultPeriods(): Period[] {
  // 12 tiết, mỗi tiết 50 phút + 5 phút nghỉ (chỉnh được trong Cài đặt)
  const out: Period[] = [];
  const startMinutes = (i: number) => {
    // tiết 1–6 buổi sáng từ 07:00, tiết 7–12 buổi chiều từ 12:45
    const base = i < 6 ? 7 * 60 : 12 * 60 + 45;
    const offset = i < 6 ? i : i - 6;
    return base + offset * 55;
  };
  for (let i = 0; i < 12; i++) {
    out.push({
      index: i + 1,
      start: toHHmm(startMinutes(i)),
      end: toHHmm(startMinutes(i) + 50),
    });
  }
  return out;
}

export function emptySettings(): AppSettings {
  return {
    semester: {
      name: "Học kỳ hiện tại",
      start_date: startOfWeekISO(toISODate(new Date())),
      total_weeks: 20,
    },
    periods: defaultPeriods(),
  };
}

import { addDays } from "date-fns";
import type { DataSnapshot, Entry, Session, Subject, Tag } from "../types";
import { colorFor, uid } from "./utils";
import { defaultPeriods, fromISODate, startOfWeekISO, toISODate } from "./time";

export function defaultTags(): Tag[] {
  return [
    { id: uid(), name: "Lịch học", color: "#f5b301" },
    { id: uid(), name: "Hoạt động", color: "#ef4444" },
    { id: uid(), name: "Đã đổi", color: "#3b82f6" },
  ];
}

/**
 * Bộ nhãn mặc định của bản cũ (HUST đỏ / Other xám / Cá nhân teal)
 * → đổi sang bảng màu chấm mới (vàng / đỏ / xanh dương).
 * Chỉ đổi khi đúng cả tên lẫn màu cũ, nên không ghi đè màu bạn tự chọn.
 */
export function upgradeGroupColors(tags: Tag[]): Tag[] {
  const map: Record<string, [string, string]> = {
    HUST: ["#e11d48", "#f5b301"],
    Other: ["#8b93a7", "#ef4444"],
    "Cá nhân": ["#2dd4bf", "#3b82f6"],
  };
  if (tags.length !== 3) return tags;
  if (!tags.every((t) => map[t.name]?.[0] === t.color)) return tags;
  return tags.map((t) => ({ ...t, color: map[t.name][1] }));
}

const today = toISODate(new Date());
const semesterStart = startOfWeekISO(toISODate(addDays(fromISODate(today), -42)));

const tags = defaultTags();
const [classTag, activityTag] = tags;

const subjects: Subject[] = [
  { id: uid(), code: "MAT1120", name: "Giải tích 2", color: colorFor("MAT1120"), teacher: "TS. Nguyễn Văn An" },
  { id: uid(), code: "INT2204", name: "Lập trình hướng đối tượng", color: colorFor("INT2204"), teacher: "ThS. Trần Minh Hoàng" },
  { id: uid(), code: "ENG1101", name: "Tiếng Anh B1", color: colorFor("ENG1101"), teacher: "Cô Lê Thu Hà" },
  { id: uid(), code: "PHI1004", name: "Triết học Mác – Lênin", color: colorFor("PHI1004"), teacher: "TS. Phạm Quốc Bảo" },
  { id: uid(), code: "MAT2301", name: "Xác suất thống kê", color: colorFor("MAT2301"), teacher: "TS. Đỗ Thị Mai" },
];

const [giaitich, oop, english, triet, xacsuat] = subjects;

const session = (
  subject: Subject,
  day: number,
  from: number,
  to: number,
  room: string,
  weeksStart = 1,
  weeksEnd = 18,
  intervalWeeks = 1,
): Session => ({
  id: uid(),
  subject_id: subject.id,
  day_of_week: day,
  period_start: from,
  period_end: to,
  weeks_start: weeksStart,
  weeks_end: weeksEnd,
  interval_weeks: intervalWeeks,
  room,
  note: null,
  tag_id: classTag.id,
});

const sessions: Session[] = [
  session(giaitich, 1, 1, 3, "A2-301"),
  session(oop, 1, 7, 9, "B1-405"),
  session(english, 2, 4, 6, "C3-212"),
  session(triet, 3, 1, 3, "A1-105"),
  session(xacsuat, 4, 2, 4, "A2-208"),
  session(oop, 5, 7, 9, "Lab B1-210"),
  session(english, 6, 1, 3, "C3-212", 1, 12, 2),
];

const entry = (e: Partial<Entry> & Pick<Entry, "title" | "date">): Entry => ({
  id: uid(),
  kind: "event",
  start_time: null,
  end_time: null,
  all_day: true,
  repeat_weekly: false,
  repeat_interval_weeks: 1,
  repeat_until: null,
  done: false,
  priority: "normal",
  subject_id: null,
  location: null,
  note: null,
  source: "manual",
  tag_id: activityTag.id,
  ...e,
});

const at = (offset: number) => toISODate(addDays(fromISODate(today), offset));

const entries: Entry[] = [
  entry({
    title: "Hội thảo: Ứng dụng AI trong học tập",
    date: at(2),
    start_time: "14:00",
    end_time: "16:30",
    all_day: false,
    location: "Hội trường A",
    priority: "high",
    note: "Điểm danh bằng mã QR, mang theo thẻ sinh viên.",
  }),
  entry({
    title: "Nộp báo cáo bài tập lớn Giải tích",
    date: at(3),
    kind: "deadline",
    start_time: "23:59",
    all_day: false,
    priority: "high",
    tag_id: classTag.id,
  }),
  entry({
    title: "Họp nhóm đồ án OOP",
    date: at(1),
    start_time: "20:00",
    end_time: "21:30",
    all_day: false,
    location: "Google Meet",
  }),
  entry({
    title: "Đăng ký môn học kỳ sau",
    date: at(6),
    start_time: "08:00",
    end_time: "11:00",
    all_day: false,
    kind: "deadline",
    priority: "high",
  }),
  entry({
    title: "Thi giữa kỳ Xác suất thống kê",
    date: at(9),
    start_time: "09:00",
    end_time: "10:30",
    all_day: false,
    subject_id: xacsuat.id,
    location: "A2-208",
    priority: "high",
    tag_id: classTag.id,
  }),
  entry({
    title: "Nộp học phí học kỳ này",
    date: at(-2),
    kind: "deadline",
    done: true,
  }),
];

export const DEMO: DataSnapshot = {
  settings: {
    semester: {
      name: "Học kỳ 1 · 2026–2027",
      start_date: semesterStart,
      total_weeks: 20,
    },
    periods: defaultPeriods(),
  },
  tags,
  subjects,
  sessions,
  entries,
  exceptions: [],
};

export function emptySnapshot(): DataSnapshot {
  return {
    settings: {
      semester: {
        name: "Học kỳ 1",
        start_date: startOfWeekISO(today),
        total_weeks: 20,
      },
      periods: defaultPeriods(),
    },
    tags: defaultTags(),
    subjects: [],
    sessions: [],
    entries: [],
    exceptions: [],
  };
}

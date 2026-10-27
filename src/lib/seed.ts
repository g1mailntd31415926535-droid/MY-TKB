import type { DataSnapshot, Tag } from "../types";
import { uid } from "./utils";
import { defaultPeriods, startOfWeekISO, toISODate } from "./time";

export function defaultTags(): Tag[] {
  return [
    { id: uid(), name: "Lịch học", color: "#f5b301" },
    { id: uid(), name: "Hoạt động", color: "#ef4444" },
    { id: uid(), name: "Đã đổi", color: "#3b82f6" },
  ];
}

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

export const DEMO: DataSnapshot = emptySnapshot();

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return crypto.randomUUID();
}

/** Làm tối một màu hex để chữ đọc rõ trên nền sáng. */
export function darken(hex: string, amount = 0.35) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const n = parseInt(value, 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const SUBJECT_COLORS = [
  "#8b7cf6",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
  "#a3e635",
  "#f472b6",
  "#60a5fa",
  "#f97316",
  "#2dd4bf",
];

/** Gợi ý màu cho nhóm (chấm trên lịch tháng). */
export const GROUP_COLORS: { name: string; value: string }[] = [
  { name: "Vàng", value: "#f5b301" },
  { name: "Đỏ", value: "#ef4444" },
  { name: "Xanh dương", value: "#3b82f6" },
  { name: "Xanh lá", value: "#22c55e" },
  { name: "Tím", value: "#8b5cf6" },
  { name: "Cam", value: "#f97316" },
  { name: "Hồng", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Xám", value: "#8b93a7" },
  { name: "Nâu", value: "#a16207" },
];

export function colorFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
}

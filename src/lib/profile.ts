/**
 * Một tài khoản theo dõi được nhiều thời khoá biểu (của mình và của người khác).
 * Mỗi TKB lưu dữ liệu riêng, phân biệt bằng cột `profile` (Supabase)
 * hoặc khoá localStorage riêng (chế độ lưu trên máy).
 */
export type ProfileId = "my" | "lin";

export const PROFILES: { id: ProfileId; name: string; color: string }[] = [
  { id: "my", name: "MyTKB", color: "#d92d20" },
  { id: "lin", name: "LinTKB", color: "#e98aa9" },
];

const KEY = "track-tkb:profile";

export function profileName(id: ProfileId) {
  return PROFILES.find((p) => p.id === id)?.name ?? id;
}

export function loadProfile(): ProfileId {
  try {
    const saved = localStorage.getItem(KEY);
    return PROFILES.some((p) => p.id === saved) ? (saved as ProfileId) : "my";
  } catch {
    return "my";
  }
}

export function saveProfile(id: ProfileId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* không lưu được thì lần sau mở lại MyTKB */
  }
}

/** Đổi màu chủ đạo theo TKB (CSS ở `:root[data-profile=...]` trong index.css). */
export function applyProfileTheme(id: ProfileId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.profile = id;
  const color = PROFILES.find((p) => p.id === id)?.color;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color ?? "#d92d20");
}

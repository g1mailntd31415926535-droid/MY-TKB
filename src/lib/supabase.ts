const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(url && anonKey);

/**
 * Chế độ offline: thêm `?local=1` vào URL (hoặc đặt localStorage
 * `track-tkb:mode` = "local") để dùng localStorage, bỏ qua đăng nhập.
 * Hữu ích khi Supabase bị pause hoặc khi cần dùng máy khác không mạng.
 */
export const forceLocal =
  typeof window !== "undefined" &&
  (new URLSearchParams(window.location.search).get("local") === "1" ||
    window.localStorage.getItem("track-tkb:mode") === "local");

export const useCloud = hasSupabase && !forceLocal;

/* eslint-disable @typescript-eslint/no-explicit-any */
let clientPromise: Promise<any> | null = null;

export async function getSupabase(): Promise<any | null> {
  if (!hasSupabase) return null;
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
      db: { schema: "track_tkb" },
    }),
  );
  return clientPromise;
}

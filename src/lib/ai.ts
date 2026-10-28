import type { AiExtraction } from "../types";
import { getSupabase, useCloud } from "./supabase";

/** Để trống = gọi cùng domain (/api/...). Đặt khi server AI host ở chỗ khác. */
const AI_BASE = ((import.meta.env.VITE_AI_URL as string | undefined) ?? "").replace(/\/$/, "");

async function authHeader(): Promise<Record<string, string>> {
  if (!useCloud) return {};
  const sb = await getSupabase();
  const { data } = (await sb?.auth.getSession()) ?? { data: null };
  const token = data?.session?.access_token as string | undefined;
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Đổi mã lỗi HTTP thành câu người dùng hiểu được. */
function explainStatus(status: number): string {
  if (status === 404 || status === 405) {
    return "Bản web này chưa có máy chủ AI (/api/ai/extract). Deploy kèm thư mục api/ trên Vercel hoặc đặt VITE_AI_URL — xem README phần Deploy.";
  }
  if (status === 413) return "Ảnh quá lớn để gửi lên máy chủ AI. Hãy chụp màn hình hoặc cắt ảnh nhỏ lại.";
  if (status === 401) return "Cần đăng nhập để dùng AI.";
  if (status === 504) return "Máy chủ AI phản hồi quá lâu. Thử lại với ảnh gọn hơn.";
  return `Máy chủ AI lỗi ${status}.`;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export async function extractWithAi(input: {
  file?: File | null;
  text?: string;
  tags?: string[];
  context?: { id: string; date: string; title: string; start: string | null; end: string | null; group: string | null }[];
}): Promise<AiExtraction> {
  const imageBase64 = input.file ? await fileToBase64(input.file) : undefined;

  let res: Response;
  try {
    res = await fetch(`${AI_BASE}/api/ai/extract`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        imageBase64,
        mimeType: input.file?.type,
        text: input.text,
        tags: input.tags ?? [],
        context: input.context ?? [],
      }),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ AI. Kiểm tra mạng rồi thử lại.");
  }

  const json = (await res.json().catch(() => null)) as {
    error?: string;
    summary?: string;
    drafts?: AiExtraction["drafts"];
  } | null;

  if (!res.ok) throw new Error(json?.error ?? explainStatus(res.status));
  // 200 nhưng không phải JSON đúng dạng (vd. host trả về index.html) — đừng báo "không có việc nào".
  if (!json || !Array.isArray(json.drafts)) {
    throw new Error(explainStatus(404));
  }

  return {
    summary: json.summary ?? "",
    drafts: (json.drafts ?? []).map((d) => ({
      ...d,
      missing: d.missing ?? [],
    })),
  };
}

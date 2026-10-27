import type { AiExtraction } from "../types";

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

  const res = await fetch("/api/ai/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      mimeType: input.file?.type,
      text: input.text,
      tags: input.tags ?? [],
      context: input.context ?? [],
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    summary?: string;
    drafts?: AiExtraction["drafts"];
  };

  if (!res.ok) throw new Error(json.error ?? `Lỗi ${res.status}`);

  return {
    summary: json.summary ?? "",
    drafts: (json.drafts ?? []).map((d) => ({
      ...d,
      missing: d.missing ?? [],
    })),
  };
}

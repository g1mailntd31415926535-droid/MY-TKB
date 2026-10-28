import { handleExtract } from "../../server/extract.mjs";

/** Vercel serverless function: POST /api/ai/extract */
export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    res.status(405).json({ error: "Chỉ hỗ trợ POST." });
    return;
  }
  const { status, payload } = await handleExtract(req.body, {
    authorization: req.headers.authorization,
  });
  res.status(status).json(payload);
}

// Gemini đọc ảnh có thể mất 10–30s, vượt mức mặc định 10s của gói Hobby.
export const config = { maxDuration: 60 };

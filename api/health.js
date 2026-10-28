import { MODEL, aiConfigured, authRequired } from "../server/extract.mjs";

/** Vercel serverless function: GET /api/health */
export default function handler(_req, res) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json({ ok: true, model: MODEL, configured: aiConfigured, auth: authRequired });
}

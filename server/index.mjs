import { createServer } from "node:http";
import { MODEL, aiConfigured, authRequired, handleExtract } from "./extract.mjs";

const PORT = Number(process.env.PORT ?? 8787);
/** Cho phép web ở domain khác gọi server này (khi tự host server AI riêng). */
const ALLOWED_ORIGIN = process.env.AI_ALLOWED_ORIGIN ?? "";

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function readJson(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("Ảnh quá lớn (giới hạn 20MB)."));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("Body không phải JSON hợp lệ."));
      }
    });
    req.on("error", reject);
  });
}

/** Request đi từ chính máy này (vite proxy lúc dev) thì không bắt đăng nhập. */
function isLocalRequest(req) {
  const addr = req.socket.remoteAddress ?? "";
  const host = (req.headers.host ?? "").split(":")[0];
  const loopback = addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
  return loopback && (host === "localhost" || host === "127.0.0.1");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (ALLOWED_ORIGIN) {
    res.setHeader("access-control-allow-origin", ALLOWED_ORIGIN);
    res.setHeader("access-control-allow-headers", "content-type, authorization");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
  }

  if (url.pathname === "/api/health") {
    send(res, 200, { ok: true, model: MODEL, configured: aiConfigured, auth: authRequired });
    return;
  }

  if (url.pathname === "/api/ai/extract" && req.method === "POST") {
    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      const message = String(e?.message ?? e);
      send(res, /quá lớn/.test(message) ? 413 : 400, { error: message });
      return;
    }
    const { status, payload } = await handleExtract(body, {
      authorization: req.headers.authorization,
      skipAuth: isLocalRequest(req),
    });
    send(res, status, payload);
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(
    `[ai] http://127.0.0.1:${PORT} — model ${MODEL} — key ${aiConfigured ? "đã cấu hình" : "THIẾU"} — ${
      authRequired ? "bắt đăng nhập Supabase" : "không bắt đăng nhập"
    }`,
  );
});

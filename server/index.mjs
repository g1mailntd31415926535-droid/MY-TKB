import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
/** 0 = tắt "thinking" cho nhanh (model lite trả JSON trong ~2s thay vì ~25s). */
const THINKING_BUDGET = Number(process.env.GEMINI_THINKING_BUDGET ?? 0);
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = (today, weekday, tags = [], context = []) => `Bạn là trợ lý đọc ảnh lịch làm việc/học tập của một sinh viên Việt Nam.
Hôm nay là ${today} (${weekday}), múi giờ Asia/Ho_Chi_Minh.

Nhiệm vụ: đọc ảnh (hoặc đoạn text) và trích ra DANH SÁCH công việc riêng lẻ.

Quy tắc bắt buộc:
1. Chỉ trả về JSON đúng schema, không thêm chữ nào khác.
2. Mỗi công việc là một phần tử: kind = "event" (có giờ bắt đầu/kết thúc, hội thảo, họp, hoạt động) hoặc "deadline" (hạn nộp, hạn đăng ký).
3. Mỗi công việc chỉ xuất hiện ĐÚNG MỘT LẦN. Không lặp lại, không tạo bản sao.
4. date = "YYYY-MM-DD". Quy ước: "tuần này" là tuần chứa hôm nay (thứ 2 → chủ nhật); "tuần sau" là tuần kế tiếp ngay sau tuần này; "thứ X" không nói rõ tuần thì hiểu là thứ X gần nhất tính từ hôm nay.
5. start_time và end_time CHỈ có dạng "HH:mm" (ví dụ "14:00"). Tuyệt đối không kèm ngày, không ISO, không giây, không chữ.
6. TUYỆT ĐỐI không bịa. Nếu thiếu hoặc mơ hồ, để null, thêm tên trường vào "missing" và viết câu hỏi ngắn vào "question".
7. Trích cả địa điểm (location) và chi tiết quan trọng (note) nếu ảnh có ghi.
8. "summary" là 1-2 câu tóm tắt toàn bộ nội dung ảnh bằng tiếng Việt.
9. Không tự thêm địa điểm/ghi chú nếu ảnh không có.
10. ${
  tags.length
    ? `Nếu công việc rõ ràng thuộc một trong các nhóm sau: ${tags.join(", ")} — điền "tag" đúng tên nhóm đó (giữ nguyên chữ). Không chắc thì null.`
    : `Luôn để "tag" = null.`
}
11. Trường "action":
   - "add" = thêm việc/buổi mới.
   - "cancel" = thông báo nói một buổi học CỤ THỂ bị nghỉ/huỷ. target_id và target_date PHẢI lấy đúng từ DANH SÁCH LỊCH SẮP TỚI bên dưới; title = tên buổi bị huỷ; date = target_date.
   - "move" = buổi học được DỜI sang ngày/giờ khác. target_id + target_date = buổi gốc lấy từ danh sách; date/start_time/end_time = lịch MỚI.
   - Nếu không xác định được buổi nào trong danh sách, dùng "add" và ghi câu hỏi vào "question". Không đoán bừa id.
${
  context.length
    ? `\nDANH SÁCH LỊCH SẮP TỚI (để đối chiếu khi huỷ/dời):\n${context
        .map(
          (c) =>
            `- id=${c.id} | ${c.date} | ${c.start ?? "?"}-${c.end ?? "?"} | ${c.title} | ${c.group ?? "không nhóm"}`,
        )
        .join("\n")}`
    : `\nKhông có lịch sắp tới để đối chiếu — mọi mục phải là action "add".`
}`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    drafts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kind: { type: "STRING", enum: ["event", "deadline"] },
          action: { type: "STRING", enum: ["add", "cancel", "move"] },
          target_id: { type: "STRING", nullable: true },
          target_date: { type: "STRING", nullable: true },
          title: { type: "STRING" },
          date: { type: "STRING", nullable: true },
          start_time: { type: "STRING", nullable: true },
          end_time: { type: "STRING", nullable: true },
          location: { type: "STRING", nullable: true },
          note: { type: "STRING", nullable: true },
          priority: { type: "STRING", enum: ["low", "normal", "high"] },
          tag: { type: "STRING", nullable: true },
          missing: { type: "ARRAY", items: { type: "STRING" } },
          question: { type: "STRING", nullable: true },
        },
        required: [
          "kind",
          "action",
          "target_id",
          "target_date",
          "title",
          "date",
          "start_time",
          "end_time",
          "location",
          "note",
          "priority",
          "tag",
          "missing",
          "question",
        ],
      },
    },
  },
  required: ["summary", "drafts"],
};

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

async function callGemini(body, attempt = 1) {
  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 1500));
      return callGemini(body, attempt + 1);
    }
    throw new Error(
      `Gemini ${res.status}: ${detail.slice(0, 400)}${retryable ? " (đã thử 3 lần, model đang quá tải)" : ""}`,
    );
  }
  return res;
}

async function extract({ imageBase64, mimeType, text, today, weekday, tags = [], context = [] }) {
  const knownTags = (Array.isArray(tags) ? tags : []).map((t) => String(t)).filter(Boolean);
  const knownContext = (Array.isArray(context) ? context : []).filter(
    (c) => c && c.id && c.date && c.title,
  );
  const parts = [{ text: SYSTEM_PROMPT(today, weekday, knownTags, knownContext) }];
  if (text?.trim()) parts.push({ text: `Nội dung người dùng dán:\n${text.trim()}` });
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
  }

  const res = await callGemini({
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: THINKING_BUDGET > 0 ? 8192 : 2048,
      thinkingConfig: { thinkingBudget: THINKING_BUDGET },
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
    },
  });

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const raw = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!raw) throw new Error("Gemini không trả về nội dung.");
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Ảnh có quá nhiều nội dung nên AI trả lời bị cắt. Hãy chụp gọn hơn hoặc chia thành 2 ảnh.");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[ai] JSON lỗi, raw:", raw.slice(-400));
    throw new Error("AI trả về JSON không hợp lệ. Thử lại hoặc dùng ảnh rõ hơn.");
  }

  const drafts = dedupe(
    (Array.isArray(parsed.drafts) ? parsed.drafts : [])
      .map((d) => normalizeDraft(d, knownTags, knownContext))
      .filter((d) => d.title),
  );

  return {
    summary: String(parsed.summary ?? ""),
    drafts,
  };
}

/** Ép mọi thứ về đúng định dạng app cần, không tin model. */
function hhmm(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/(\d{1,2})\s*[:hH]\s*(\d{2})/) ?? s.match(/^(\d{1,2})\s*[hH]$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mm = m[2] ?? "00";
  return `${String(h).padStart(2, "0")}:${mm}`;
}

function normalizeDraft(d, tags = [], context = []) {
  const aliases = { date: "ngày", time: "giờ", "start time": "giờ bắt đầu", "end time": "giờ kết thúc" };
  const rawMissing = Array.isArray(d?.missing) ? d.missing.map(String) : [];
  const missing = [
    ...new Set(
      rawMissing
        .map((m) => m.toLowerCase().replace(/[_-]/g, " ").trim())
        .map((m) => aliases[m] ?? m)
        .filter((m) => m),
    ),
  ];

  // --- hành động: add / cancel / move, chỉ tin id có thật trong danh sách gửi lên ---
  let action = ["add", "cancel", "move"].includes(d?.action) ? d.action : "add";
  let targetId = d?.target_id ? String(d.target_id) : null;
  let targetDate = /^\d{4}-\d{2}-\d{2}$/.test(d?.target_date ?? "") ? d.target_date : null;
  let actionQuestion = null;

  if (action !== "add") {
    const hit = context.find((c) => c.id === targetId);
    if (!hit) {
      action = "add";
      targetId = null;
      targetDate = null;
      if (!missing.includes("buổi học gốc")) missing.push("buổi học gốc");
      actionQuestion =
        "Không xác định được buổi học cũ cần huỷ/dời — mình thêm như việc mới, bạn kiểm tra lại giúp.";
    } else {
      // Tin danh sách lịch thật hơn ngày model tự suy ra.
      targetDate = hit.date;
    }
  }

  const rawDate = typeof d?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : null;
  const date = action === "cancel" ? targetDate : rawDate;
  if (!date && !missing.includes("ngày")) missing.push("ngày");

  const start = hhmm(d?.start_time);
  const end = hhmm(d?.end_time);
  const isDeadline = d?.kind === "deadline";
  if (action !== "cancel" && start && !end && !isDeadline && !missing.includes("giờ kết thúc")) {
    missing.push("giờ kết thúc");
  }
  if (isDeadline) {
    for (let i = missing.length - 1; i >= 0; i--) {
      if (missing[i] === "giờ bắt đầu" || missing[i] === "giờ") missing.splice(i, 1);
    }
  }

  const question =
    actionQuestion ??
    (d?.question ? String(d.question).trim() : null) ??
    (!date ? "Ảnh không ghi rõ ngày — bạn chọn ngày giúp mình." : null);

  const rawTag = d?.tag ? String(d.tag).trim() : null;
  const tag =
    rawTag && tags.some((t) => t.toLowerCase() === rawTag.toLowerCase())
      ? tags.find((t) => t.toLowerCase() === rawTag.toLowerCase())
      : null;

  return {
    kind: isDeadline ? "deadline" : "event",
    action,
    target_id: targetId,
    target_date: targetDate,
    title: String(d?.title ?? "").trim(),
    date,
    start_time: start,
    end_time: end,
    location: d?.location ? String(d.location).trim() : null,
    note: d?.note ? String(d.note).trim() : null,
    priority: ["low", "normal", "high"].includes(d?.priority) ? d.priority : "normal",
    tag,
    missing,
    question,
  };
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((d) => {
    const key = `${d.action}|${d.target_id ?? ""}|${d.kind}|${d.title.toLowerCase()}|${d.date ?? ""}|${d.start_time ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/health") {
    send(res, 200, { ok: true, model: MODEL, configured: Boolean(API_KEY) });
    return;
  }

  if (url.pathname === "/api/ai/extract" && req.method === "POST") {
    if (!API_KEY) {
      send(res, 503, {
        error:
          "Chưa có GEMINI_API_KEY. Tạo key miễn phí tại aistudio.google.com rồi thêm vào file .env.",
      });
      return;
    }
    try {
      const body = await readJson(req);
      const now = new Date();
      const today =
        body.today ??
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
      const weekday = new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(now);
      const result = await extract({ ...body, today, weekday });
      send(res, 200, result);
    } catch (e) {
      send(res, 502, { error: String(e?.message ?? e) });
    }
    return;
  }

  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[ai] http://127.0.0.1:${PORT} — model ${MODEL} — key ${API_KEY ? "đã cấu hình" : "THIẾU"}`);
});

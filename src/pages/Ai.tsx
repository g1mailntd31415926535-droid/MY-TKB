import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ImagePlus, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { Button, Card, Field } from "../components/ui";
import { extractWithAi } from "../lib/ai";
import { buildDay, toISODate } from "../lib/time";
import { uid } from "../lib/utils";
import type { AiDraft, Entry } from "../types";
import { DraftCard } from "../components/ai/DraftCard";

const EMPTY_HINT =
  "Gửi ảnh chụp bảng tin, thông báo lớp, tin nhắn nhóm… AI sẽ đọc, tóm tắt và hỏi lại trước khi thêm vào lịch.";

export function AiPage() {
  const saveEntry = useData((s) => s.saveEntry);
  const saveTag = useData((s) => s.saveTag);
  const saveException = useData((s) => s.saveException);
  const openEntryEditor = useUi((s) => s.openEntryEditor);
  const data = useData((s) => s.data);
  const tags = data.tags;

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [drafts, setDrafts] = useState<AiDraft[]>([]);

  /** Lịch 3 tuần tới để AI đối chiếu khi thông báo nói "nghỉ/dời buổi X". */
  const context = useMemo(() => {
    const out: {
      id: string;
      date: string;
      title: string;
      start: string | null;
      end: string | null;
      group: string | null;
    }[] = [];
    const now = new Date();
    for (let i = 0; i < 21; i++) {
      const date = toISODate(addDays(now, i));
      for (const o of buildDay(date, data)) {
        if (o.source !== "session") continue;
        out.push({
          id: o.id,
          date,
          title: o.title,
          start: o.allDay ? null : o.start,
          end: o.allDay ? null : o.end,
          group: o.tag?.name ?? null,
        });
      }
    }
    return out.slice(0, 60);
  }, [data]);

  const pick = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Ctrl+V: dán ảnh trực tiếp từ clipboard (chụp màn hình rồi dán cho nhanh).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((x) =>
        x.type.startsWith("image/"),
      );
      const f = item?.getAsFile();
      if (!f) return;
      e.preventDefault();
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setError(null);
      toast.success("Đã dán ảnh từ clipboard");
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const tagIdOf = (name: string | null) =>
    name ? (tags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.id ?? null) : null;

  const run = async () => {
    if (!file && !text.trim()) {
      toast.error("Chọn ảnh hoặc dán nội dung trước đã.");
      return;
    }
    setLoading(true);
    setError(null);
    setDrafts([]);
    setSummary("");
    try {
      const res = await extractWithAi({
        file,
        text,
        tags: tags.map((t) => t.name),
        context,
      });
      setSummary(res.summary);
      const fallback =
        tags.find((t) => t.name.toLowerCase() === "hoạt động")?.name ??
        tags.find((t) => t.name.toLowerCase() === "other")?.name ??
        tags[1]?.name ??
        null;
      setDrafts(
        res.drafts.map((d) => ({
          ...d,
          action: d.action ?? "add",
          target_id: d.target_id ?? null,
          target_date: d.target_date ?? null,
          date: d.date ?? null,
          missing: d.missing ?? [],
          tag:
            d.action && d.action !== "add"
              ? d.tag
              : tagIdOf(d.tag)
                ? d.tag
                : fallback,
        })),
      );
      if (res.drafts.length === 0) toast.info("Không tìm thấy công việc nào trong ảnh.");
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const patchDraft = (i: number, p: Partial<AiDraft>) =>
    setDrafts((list) => list.map((d, idx) => (idx === i ? { ...d, ...p } : d)));

  const movedTagId = async () => {
    const existing = tags.find((t) => t.name.toLowerCase() === "đã đổi");
    if (existing) return existing.id;
    const tag = { id: uid(), name: "Đã đổi", color: "#3b82f6" };
    await saveTag(tag);
    return tag.id;
  };

  const targetTitle = (d: AiDraft) => {
    const session = data.sessions.find((x) => x.id === d.target_id);
    const subject = data.subjects.find((x) => x.id === session?.subject_id);
    return subject?.name ?? d.title;
  };

  /** Áp dụng 1 draft: thêm mới / huỷ buổi cũ / dời buổi cũ sang giờ mới. */
  const applyDraft = async (d: AiDraft): Promise<string> => {
    if (d.action === "cancel") {
      if (!d.target_id || !d.target_date) throw new Error("Thiếu thông tin buổi học cần huỷ.");
      if (!data.sessions.some((s) => s.id === d.target_id)) {
        throw new Error("Không tìm thấy buổi học gốc — có thể đã bị xoá.");
      }
      const already = data.exceptions.some(
        (x) => x.session_id === d.target_id && x.date === d.target_date,
      );
      if (!already) {
        await saveException({
          id: uid(),
          session_id: d.target_id,
          date: d.target_date,
          note: "AI: nghỉ/huỷ",
        });
      }
      return "Đã huỷ buổi học";
    }

    if (d.action === "move") {
      if (!d.target_id || !d.target_date) throw new Error("Thiếu thông tin buổi học cần dời.");
      if (!d.date) throw new Error("Chọn ngày mới trước khi dời.");
      const session = data.sessions.find((s) => s.id === d.target_id);
      if (!session) throw new Error("Không tìm thấy buổi học gốc — có thể đã bị xoá.");
      const subject = data.subjects.find((s) => s.id === session.subject_id);
      const tagId = await movedTagId();
      await saveEntry({
        id: uid(),
        kind: "event",
        title: d.title.trim() || subject?.name || "Buổi học (dời)",
        date: d.date,
        start_time: d.start_time,
        end_time: d.end_time,
        all_day: !d.start_time,
        done: false,
        priority: d.priority,
        subject_id: session.subject_id,
        location: d.location ?? session.room,
        note: d.note,
        source: "ai",
        tag_id: tagId,
        repeat_weekly: false,
        repeat_interval_weeks: 1,
        repeat_until: null,
      });
      const alreadyMoved = data.exceptions.some(
        (x) => x.session_id === d.target_id && x.date === d.target_date,
      );
      if (!alreadyMoved) {
        await saveException({
          id: uid(),
          session_id: d.target_id,
          date: d.target_date,
          note: "AI: dời buổi",
        });
      }
      return "Đã dời buổi học";
    }

    if (!d.title.trim()) throw new Error("Thiếu tên công việc.");
    if (!d.date) throw new Error("Chọn ngày trước khi thêm.");
    const entry: Entry = {
      id: uid(),
      kind: d.kind,
      title: d.title.trim(),
      date: d.date,
      start_time: d.start_time,
      end_time: d.end_time,
      all_day: !d.start_time,
      done: false,
      priority: d.priority,
      subject_id: null,
      location: d.location,
      note: d.note,
      source: "ai",
      tag_id: tagIdOf(d.tag),
      repeat_weekly: false,
      repeat_interval_weeks: 1,
      repeat_until: null,
    };
    await saveEntry(entry);
    return "Đã thêm vào lịch";
  };

  const addDraft = async (i: number) => {
    try {
      const message = await applyDraft(drafts[i]);
      setDrafts((list) => list.filter((_, idx) => idx !== i));
      toast.success(message);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const addAll = async () => {
    const ready = drafts.filter((d) => d.action === "add" && d.date && d.title.trim());
    if (ready.length === 0) return toast.error("Chưa có mục mới nào đủ ngày để thêm.");
    const added = new Set<AiDraft>();
    for (const d of ready) {
      try {
        await applyDraft(d);
        added.add(d);
      } catch (e) {
        toast.error(String(e));
      }
    }
    // Chỉ bỏ những mục đã thêm thành công; mục lỗi ở lại để thử lại.
    setDrafts((list) => list.filter((d) => !added.has(d)));
    if (added.size) toast.success(`Đã thêm ${added.size} mục`);
    if (added.size < ready.length) {
      toast.error(`${ready.length - added.size} mục chưa thêm được — vẫn giữ trong danh sách.`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 md:px-8 md:py-9">
      <header className="mb-5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Trích xuất bằng AI
        </p>
        <h1 className="h-display text-3xl">AI Inbox</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{EMPTY_HINT}</p>
      </header>

      <Card className="mb-5 p-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-slate-50 px-4 py-8 text-center"
        >
          {preview ? (
            <div className="w-full">
              <img
                src={preview}
                alt="Ảnh đã chọn"
                className="mx-auto max-h-64 rounded-lg border border-line object-contain"
              />
              <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-muted">
                <span className="truncate">{file?.name}</span>
                <Button variant="ghost" size="sm" onClick={clear}>
                  <Trash2 className="h-3.5 w-3.5" /> Bỏ ảnh
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-slate-50">
                <ImagePlus className="h-5 w-5 text-muted" />
              </div>
              <p className="text-sm font-medium">Kéo ảnh vào đây, chọn file, hoặc nhấn Ctrl+V</p>
              <p className="text-[11px] text-muted">
                PNG, JPG, WEBP · tối đa ~20MB · dán ảnh trực tiếp bằng Ctrl+V
              </p>
              <Button variant="outline" size="sm" className="mt-1" onClick={() => fileRef.current?.click()}>
                Chọn ảnh
              </Button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="mt-3">
          <Field label="Hoặc dán nội dung (tuỳ chọn)">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="VD: Thứ 6 tuần này 14h họp nhóm ở B1-210, chủ nhật nộp báo cáo trước 23h…"
              className="min-h-20 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted">
            AI không tự thêm gì — mọi mục phải được bạn xác nhận.
          </p>
          <Button variant="primary" onClick={run} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Đang đọc…" : "Đọc & tách công việc"}
          </Button>
        </div>

        {error ? (
          <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Chưa gọi được AI</p>
              <p className="mt-0.5 break-words opacity-90">{error}</p>
              {import.meta.env.DEV ? (
                <p className="mt-1 opacity-70">
                  Cần chạy <code className="rounded bg-slate-100 px-1">npm run ai</code> và đặt{" "}
                  <code className="rounded bg-slate-100 px-1">GEMINI_API_KEY</code> trong{" "}
                  <code className="rounded bg-slate-100 px-1">.env</code>.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {summary ? (
        <Card className="mb-4 border-red-100 bg-red-50/60 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-2">
            <Sparkles className="h-3.5 w-3.5" /> AI tóm tắt
          </p>
          <p className="text-[13.5px] leading-relaxed">{summary}</p>
        </Card>
      ) : null}

      {drafts.length > 0 ? (
        <>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Cần bạn xác nhận ({drafts.length})
            </h2>
            <Button variant="outline" size="sm" onClick={addAll}>
              Thêm tất cả mục đủ ngày
            </Button>
          </div>

          <div className="space-y-3">
            {drafts.map((d, i) => (
              <DraftCard
                key={i}
                draft={d}
                tags={tags}
                targetTitle={targetTitle(d)}
                onPatch={(p) => patchDraft(i, p)}
                onRemove={() => setDrafts((list) => list.filter((_, idx) => idx !== i))}
                onOpenForm={() => openEntryEditor(null, d.date ?? toISODate(new Date()))}
                onConfirm={() => addDraft(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

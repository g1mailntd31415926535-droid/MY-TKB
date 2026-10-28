import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Entry, Priority, Semester, Tag } from "../../types";
import { useData } from "../../store/data";
import { useUi } from "../../store/ui";
import { Button, Field, Input, Modal, Select, Textarea } from "../ui";
import { DAY_LABELS, dayOfWeek, repeatEveryLabel, semesterEndISO } from "../../lib/time";
import { GROUP_COLORS, uid } from "../../lib/utils";
import { NEW_TAG, tagIdByName } from "./shared";

const EMPTY_ENTRY = (date: string): Entry => ({
  id: "",
  kind: "event",
  title: "",
  date,
  start_time: null,
  end_time: null,
  all_day: false,
  repeat_weekly: false,
  repeat_interval_weeks: 1,
  repeat_until: null,
  done: false,
  priority: "normal",
  subject_id: null,
  location: null,
  note: null,
  source: "manual",
  tag_id: null,
});

/** Ngày lặp cuối mặc định: cuối học kỳ, nhưng không trước ngày bắt đầu. */
function defaultRepeatUntil(date: string, semester: Semester): string {
  const end = semesterEndISO(semester);
  return end >= date ? end : date;
}

export function EntryEditor() {
  const open = useUi((s) => s.editorOpen);
  const editing = useUi((s) => s.editingEntry);
  const selectedDate = useUi((s) => s.selectedDate);
  const close = useUi((s) => s.closeEditor);
  const saveEntry = useData((s) => s.saveEntry);
  const deleteEntry = useData((s) => s.deleteEntry);
  const saveTag = useData((s) => s.saveTag);
  const tags = useData((s) => s.data.tags);
  const semester = useData((s) => s.data.settings.semester);

  const [form, setForm] = useState<Entry>(EMPTY_ENTRY(selectedDate));
  const [saving, setSaving] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(GROUP_COLORS[0].value);

  useEffect(() => {
    if (!open) return;
    setNewTagName("");
    setNewTagColor(GROUP_COLORS[0].value);
    if (editing) {
      setForm({
        ...editing,
        repeat_weekly: editing.repeat_weekly ?? false,
        repeat_interval_weeks: editing.repeat_interval_weeks ?? 1,
        repeat_until: editing.repeat_until ?? null,
      });
      return;
    }
    setForm({
      ...EMPTY_ENTRY(selectedDate),
      tag_id: tagIdByName(tags, "Hoạt động") ?? tags[1]?.id ?? null,
    });
    // Chỉ dựng lại form khi mở/đổi mục — không theo `tags`, vì tạo nhóm mới giữa chừng sẽ xoá mất nội dung đang gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, selectedDate]);

  const patch = (p: Partial<Entry>) => setForm((f) => ({ ...f, ...p }));

  const setDate = (date: string) =>
    setForm((f) => ({
      ...f,
      date,
      repeat_until:
        f.repeat_weekly && (!f.repeat_until || f.repeat_until < date)
          ? defaultRepeatUntil(date, semester)
          : f.repeat_until,
    }));

  const setRepeatMode = (mode: string) => {
    if (mode === "none") {
      setForm((f) => ({ ...f, repeat_weekly: false }));
      return;
    }
    setForm((f) => {
      const weeks =
        mode === "custom"
          ? Math.max(1, Math.min(16, f.repeat_interval_weeks > 4 ? f.repeat_interval_weeks : 5))
          : Math.max(1, Math.min(16, Number(mode) || 1));
      return {
        ...f,
        repeat_weekly: true,
        repeat_interval_weeks: weeks,
        repeat_until:
          f.repeat_until && f.repeat_until >= f.date
            ? f.repeat_until
            : defaultRepeatUntil(f.date, semester),
      };
    });
  };

  const setRepeatInterval = (value: string) => {
    const weeks = Math.max(1, Math.min(16, Math.round(Number(value) || 1)));
    setForm((f) => ({ ...f, repeat_weekly: true, repeat_interval_weeks: weeks }));
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Nhập tên lịch trước đã.");
      return;
    }
    if (!form.date) {
      toast.error("Chọn ngày cho lịch.");
      return;
    }
    if (form.tag_id === NEW_TAG && !newTagName.trim()) {
      toast.error("Nhập tên nhóm mới trước đã.");
      return;
    }
    if (form.repeat_weekly) {
      const until = form.repeat_until || defaultRepeatUntil(form.date, semester);
      if (until < form.date) {
        toast.error("Ngày lặp đến phải sau hoặc bằng ngày bắt đầu.");
        return;
      }
    }
    if (!form.all_day && form.start_time && form.end_time && form.end_time <= form.start_time) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    setSaving(true);
    try {
      let tagId = form.tag_id;
      if (tagId === NEW_TAG) {
        const name = newTagName.trim();
        const existing = tags.find((t) => t.name.trim().toLowerCase() === name.toLowerCase());
        if (existing) {
          tagId = existing.id;
        } else {
          const tag: Tag = { id: uid(), name, color: newTagColor };
          await saveTag(tag);
          tagId = tag.id;
        }
      }
      const weeks = Math.max(1, Math.min(16, form.repeat_interval_weeks || 1));
      const next: Entry = {
        ...form,
        id: form.id || uid(),
        title: form.title.trim(),
        tag_id: tagId,
        start_time: form.all_day ? null : form.start_time,
        end_time: form.all_day ? null : form.end_time,
        repeat_weekly: form.repeat_weekly,
        repeat_interval_weeks: form.repeat_weekly ? weeks : 1,
        repeat_until: form.repeat_weekly
          ? (form.repeat_until || defaultRepeatUntil(form.date, semester))
          : null,
      };
      await saveEntry(next);
      toast.success(editing ? "Đã cập nhật lịch" : "Đã thêm lịch");
      close();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form.id) return;
    setSaving(true);
    try {
      await deleteEntry(form.id);
      toast.success("Đã xoá");
      close();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  const weekdayLabel = form.date ? DAY_LABELS[dayOfWeek(form.date) - 1] : "ngày đã chọn";

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? "Sửa lịch" : "Thêm lịch"}
      description="Nhập tên, thời gian, chọn lặp định kỳ và nhóm. Mục không gắn nhóm sẽ không hiện trên lịch."
      footer={
        <>
          {editing ? (
            <Button variant="danger" onClick={remove} disabled={saving} className="mr-auto">
              Xoá
            </Button>
          ) : null}
          <Button variant="ghost" onClick={close} disabled={saving}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5">
        <Field label="Tên lịch">
          <Input
            autoFocus
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="VD: Giải tích 2, họp nhóm, nộp báo cáo…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày">
            <Input type="date" value={form.date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Mức ưu tiên">
            <Select
              value={form.priority}
              onChange={(e) => patch({ priority: e.target.value as Priority })}
            >
              <option value="low">Thấp</option>
              <option value="normal">Bình thường</option>
              <option value="high">Cao</option>
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={form.all_day}
            onChange={(e) => patch({ all_day: e.target.checked })}
            className="h-4 w-4 rounded border-line accent-accent"
          />
          Cả ngày / chưa có giờ cụ thể
        </label>

        {!form.all_day ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bắt đầu">
              <Input
                type="time"
                value={form.start_time ?? ""}
                onChange={(e) => patch({ start_time: e.target.value || null })}
              />
            </Field>
            <Field label="Kết thúc">
              <Input
                type="time"
                value={form.end_time ?? ""}
                onChange={(e) => patch({ end_time: e.target.value || null })}
              />
            </Field>
          </div>
        ) : null}

        <div className="rounded-xl border border-line bg-slate-50/70 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Lặp lại">
              <Select
                value={
                  !form.repeat_weekly
                    ? "none"
                    : (form.repeat_interval_weeks || 1) > 4
                      ? "custom"
                      : String(form.repeat_interval_weeks || 1)
                }
                onChange={(e) => setRepeatMode(e.target.value)}
              >
                <option value="none">Không lặp</option>
                <option value="1">Hàng tuần</option>
                <option value="2">Cách 2 tuần</option>
                <option value="3">Cách 3 tuần</option>
                <option value="4">Cách 4 tuần</option>
                <option value="custom">Tuỳ chỉnh…</option>
              </Select>
            </Field>
            {form.repeat_weekly ? (
              <Field label="Lặp đến" hint="Mặc định đến cuối học kỳ">
                <Input
                  type="date"
                  min={form.date}
                  value={form.repeat_until ?? ""}
                  onChange={(e) => patch({ repeat_until: e.target.value || null })}
                />
              </Field>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          {form.repeat_weekly && (form.repeat_interval_weeks || 1) > 4 ? (
            <div className="mt-3">
              <Field label="Lặp mỗi (tuần)" hint="Từ 1 đến 16 tuần">
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={form.repeat_interval_weeks}
                  onChange={(e) => setRepeatInterval(e.target.value)}
                />
              </Field>
            </div>
          ) : null}

          {form.repeat_weekly ? (
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Tự sinh lịch vào {weekdayLabel}, {repeatEveryLabel(form.repeat_interval_weeks || 1)}.
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Chỉ tạo một mục vào ngày đã chọn.
            </p>
          )}
        </div>

        <Field
          label="Nhóm"
          hint={form.tag_id === NEW_TAG ? "Đặt tên và màu cho nhóm mới." : undefined}
        >
          <Select
            value={form.tag_id ?? ""}
            onChange={(e) => patch({ tag_id: e.target.value || null })}
          >
            <option value="">— Không gắn nhóm —</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value={NEW_TAG}>＋ Tạo nhóm mới…</option>
          </Select>
        </Field>

        {form.tag_id === NEW_TAG ? (
          <div className="grid gap-3 rounded-xl border border-line bg-slate-50/70 p-3">
            <Field label="Tên nhóm mới">
              <Input
                autoFocus
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="VD: Lịch học, Dự án, CLB…"
              />
            </Field>
            <Field label="Màu chấm">
              <div className="flex flex-wrap items-center gap-2">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setNewTagColor(c.value)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      newTagColor === c.value
                        ? "scale-110 border-slate-700"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.name}
                  />
                ))}
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-line bg-transparent p-0"
                  aria-label="Màu tuỳ chỉnh"
                />
                <span className="text-[11px] tabular-nums text-muted">{newTagColor}</span>
              </div>
            </Field>
            <p className="text-[11px] text-muted">
              Nhóm mới sẽ xuất hiện trong bộ lọc và Cài đặt.
            </p>
          </div>
        ) : null}

        {!form.tag_id ? (
          <p className="-mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
            Mục này thuộc nhóm <strong>null</strong> và sẽ{" "}
            <strong>không hiện trên lịch tháng / Hôm nay</strong>. Bạn vẫn xem và gắn nhóm lại
            được ở trang Tất cả.
          </p>
        ) : null}

        <Field label="Địa điểm">
          <Input
            value={form.location ?? ""}
            onChange={(e) => patch({ location: e.target.value || null })}
            placeholder="Phòng, link họp…"
          />
        </Field>

        <Field label="Ghi chú">
          <Textarea
            value={form.note ?? ""}
            onChange={(e) => patch({ note: e.target.value || null })}
            placeholder="Chi tiết, yêu cầu, link tài liệu…"
          />
        </Field>
      </div>
    </Modal>
  );
}

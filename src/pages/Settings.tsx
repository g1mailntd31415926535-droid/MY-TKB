import { useEffect, useState } from "react";
import { Download, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useData } from "../store/data";
import { Badge, Button, Card, Field, Input, Modal, Select } from "../components/ui";
import { defaultPeriods, fromISODate, toISODate } from "../lib/time";
import { SUBJECT_COLORS, GROUP_COLORS, colorFor, uid } from "../lib/utils";
import type { Period, Semester, Subject, Tag } from "../types";

export function SettingsPage() {
  const data = useData((s) => s.data);
  const mode = useData((s) => s.mode);
  const saveSettings = useData((s) => s.saveSettings);
  const saveSubject = useData((s) => s.saveSubject);
  const deleteSubject = useData((s) => s.deleteSubject);
  const saveTag = useData((s) => s.saveTag);
  const deleteTag = useData((s) => s.deleteTag);
  const reset = useData((s) => s.reset);

  const [semester, setSemester] = useState<Semester>(data.settings.semester);
  const [periods, setPeriods] = useState<Period[]>(data.settings.periods);
  const [subjectForm, setSubjectForm] = useState<Subject | null>(null);
  const [tagForm, setTagForm] = useState<Tag | null>(null);

  const persist = async (nextSemester = semester, nextPeriods = periods) => {
    try {
      await saveSettings({ semester: nextSemester, periods: nextPeriods });
      toast.success("Đã lưu cài đặt");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `track-tkb-${toISODate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-7 md:px-8 md:py-9">
      <header className="mb-6">
        <h1 className="h-display text-3xl">Cài đặt</h1>
        <p className="mt-1 text-sm text-muted">Học kỳ, khung tiết, môn học, nhóm & màu chấm và dữ liệu.</p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Học kỳ
        </h2>
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tên học kỳ">
              <Input
                value={semester.name}
                onChange={(e) => setSemester({ ...semester, name: e.target.value })}
              />
            </Field>
            <Field label="Ngày bắt đầu tuần 1" hint="Chọn thứ 2 của tuần đầu tiên">
              <Input
                type="date"
                value={semester.start_date}
                onChange={(e) => setSemester({ ...semester, start_date: e.target.value })}
              />
            </Field>
            <Field label="Số tuần">
              <Input
                type="number"
                min={1}
                max={60}
                value={semester.total_weeks}
                onChange={(e) => setSemester({ ...semester, total_weeks: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-muted">
              Tuần hiện tại:{" "}
              {Math.floor(
                (fromISODate(toISODate(new Date())).getTime() -
                  fromISODate(semester.start_date).getTime()) /
                  (7 * 86400000),
              ) + 1}
            </p>
            <Button variant="primary" onClick={() => persist()}>
              Lưu
            </Button>
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Khung tiết → giờ thực
        </h2>
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {periods.map((p, i) => (
              <div key={p.index} className="flex items-center gap-2 rounded-xl border border-line/70 p-2">
                <span className="w-12 shrink-0 text-[12px] font-semibold text-muted">Tiết {p.index}</span>
                <Input
                  type="time"
                  className="h-8 min-w-0 px-2 text-[12px]"
                  value={p.start}
                  onChange={(e) => {
                    const next = periods.slice();
                    next[i] = { ...p, start: e.target.value };
                    setPeriods(next);
                  }}
                />
                <Input
                  type="time"
                  className="h-8 min-w-0 px-2 text-[12px]"
                  value={p.end}
                  onChange={(e) => {
                    const next = periods.slice();
                    next[i] = { ...p, end: e.target.value };
                    setPeriods(next);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPeriods([
                  ...periods,
                  { index: periods.length + 1, start: "18:00", end: "18:50" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Thêm tiết
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPeriods(periods.slice(0, -1).map((p, i) => ({ ...p, index: i + 1 })))}
              disabled={periods.length <= 1}
            >
              Bớt tiết cuối
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPeriods(defaultPeriods())}>
              <RotateCcw className="h-3.5 w-3.5" /> Mặc định
            </Button>
            <Button variant="primary" size="sm" className="ml-auto" onClick={() => persist()}>
              Lưu khung tiết
            </Button>
          </div>
        </Card>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Môn học</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSubjectForm({ id: "", code: "", name: "", color: SUBJECT_COLORS[0], teacher: null })
            }
          >
            <Plus className="h-3.5 w-3.5" /> Thêm môn
          </Button>
        </div>
        <Card className="divide-y divide-line/70">
          {data.subjects.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Chưa có môn học.</p>
          ) : (
            data.subjects.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{s.name}</p>
                  <p className="text-[11px] text-muted">
                    {s.code}
                    {s.teacher ? ` · ${s.teacher}` : ""}
                  </p>
                </div>
                <Badge>{data.sessions.filter((x) => x.subject_id === s.id).length} buổi</Badge>
                <Button variant="ghost" size="icon" onClick={() => setSubjectForm(s)} aria-label="Sửa">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xoá"
                  onClick={() => {
                    if (!confirm(`Xoá môn "${s.name}" và các buổi học của môn này?`)) return;
                    deleteSubject(s.id).catch((e) => toast.error(String(e)));
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </Card>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Nhóm & màu chấm
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTagForm({ id: "", name: "", color: GROUP_COLORS[0].value })}
          >
            <Plus className="h-3.5 w-3.5" /> Thêm nhóm
          </Button>
        </div>
        <Card className="divide-y divide-line/70">
          {data.tags.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Chưa có nhóm nào.</p>
          ) : (
            data.tags.map((t) => {
              const count =
                data.sessions.filter((s) => s.tag_id === t.id).length +
                data.entries.filter((e) => e.tag_id === t.id).length;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10"
                    style={{ backgroundColor: t.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{t.name}</p>
                    <p className="text-[11px] text-muted">
                      Màu chấm trên lịch tháng · dùng cho lịch học, sự kiện, deadline
                    </p>
                  </div>
                  <Badge>{count} mục</Badge>
                  <Button variant="ghost" size="icon" onClick={() => setTagForm(t)} aria-label="Sửa">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá"
                    onClick={() => {
                      if (!confirm(`Xoá nhóm "${t.name}"? Các mục đang gắn nhóm này sẽ thành "không gắn".`)) return;
                      deleteTag(t.id).catch((e) => toast.error(String(e)));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </Card>
        <p className="mt-2 px-1 text-[11px] text-muted">
          Mặc định: <span className="text-amber-700">vàng</span> = lịch học lặp,{" "}
          <span className="text-rose-700">đỏ</span> = việc một lần,{" "}
          <span className="text-sky-700">xanh</span> = buổi bị dời. Sửa màu tuỳ ý.
        </p>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Dữ liệu
        </h2>
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent/15 text-accent-2">
              {mode === "supabase" ? "Supabase (đồng bộ)" : "localStorage (máy này)"}
            </Badge>
            <p className="text-[12px] text-muted">
              {mode === "supabase"
                ? "Dữ liệu lưu trong schema track_tkb."
                : "Điền VITE_SUPABASE_URL + ANON_KEY trong .env để đồng bộ cloud."}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportJson}>
              <Download className="h-3.5 w-3.5" /> Xuất JSON
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!confirm("Xoá toàn bộ dữ liệu và làm trống lịch?")) return;
                reset(false).catch((e) => toast.error(String(e)));
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá hết dữ liệu
            </Button>
          </div>
        </Card>
      </section>

      <SubjectModal
        value={subjectForm}
        onClose={() => setSubjectForm(null)}
        onSave={async (s) => {
          const next = s.id ? s : { ...s, id: uid(), color: s.color || colorFor(s.code || s.name) };
          try {
            await saveSubject(next);
            setSubjectForm(null);
            toast.success("Đã lưu môn học");
          } catch (e) {
            toast.error(String(e));
          }
        }}
      />

      <TagModal
        value={tagForm}
        onClose={() => setTagForm(null)}
        onSave={async (t) => {
          if (!t.name.trim()) {
            toast.error("Nhập tên nhóm trước đã.");
            return;
          }
          const next = t.id ? { ...t, name: t.name.trim() } : { ...t, id: uid(), name: t.name.trim() };
          try {
            await saveTag(next);
            setTagForm(null);
            toast.success("Đã lưu nhóm");
          } catch (e) {
            toast.error(String(e));
          }
        }}
      />
    </div>
  );
}

function TagModal({
  value,
  onClose,
  onSave,
}: {
  value: Tag | null;
  onClose: () => void;
  onSave: (t: Tag) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Tag | null>(value);
  const current = form ?? value;

  useEffect(() => {
    setForm(value);
  }, [value]);

  if (!value || !current) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={value.id ? "Sửa nhóm" : "Thêm nhóm"}
      description="Màu của nhóm chính là màu chấm trên lịch tháng."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={() => onSave(current)}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Tên nhóm">
          <Input
            autoFocus
            value={current.name}
            onChange={(e) => setForm({ ...current, name: e.target.value })}
            placeholder="Lịch học, Dự án, Đi chơi…"
          />
        </Field>
        <Field label="Màu chấm" hint="Bấm chọn nhanh, hoặc dùng ô màu tuỳ chỉnh bên cạnh">
          <div className="flex flex-wrap items-center gap-2">
            {GROUP_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => setForm({ ...current, color: c.value })}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  current.color === c.value
                    ? "scale-110 border-slate-700"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
                aria-label={c.name}
              />
            ))}
            <input
              type="color"
              value={current.color}
              onChange={(e) => setForm({ ...current, color: e.target.value })}
              className="h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-line bg-transparent p-0"
              aria-label="Màu tuỳ chỉnh"
            />
            <span className="text-[11px] tabular-nums text-muted">{current.color}</span>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function SubjectModal({
  value,
  onClose,
  onSave,
}: {
  value: Subject | null;
  onClose: () => void;
  onSave: (s: Subject) => void | Promise<void>;
}) {
  const [form, setForm] = useState<Subject | null>(value);
  const current = form ?? value;

  useEffect(() => {
    setForm(value);
  }, [value]);

  if (!value || !current) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={value.id ? "Sửa môn học" : "Thêm môn học"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={() => onSave(current)}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Tên môn">
          <Input
            autoFocus
            value={current.name}
            onChange={(e) => setForm({ ...current, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã môn">
            <Input
              value={current.code}
              onChange={(e) => setForm({ ...current, code: e.target.value })}
              placeholder="INT2204"
            />
          </Field>
          <Field label="Giảng viên">
            <Input
              value={current.teacher ?? ""}
              onChange={(e) => setForm({ ...current, teacher: e.target.value || null })}
            />
          </Field>
        </div>
        <Field label="Màu">
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm({ ...current, color: c })}
                className={`h-7 w-7 rounded-lg border-2 transition-transform ${
                  current.color === c ? "scale-110 border-slate-700" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Màu ${c}`}
              />
            ))}
            <Select
              className="h-7 w-24 text-[11px]"
              value={current.color}
              onChange={(e) => setForm({ ...current, color: e.target.value })}
            >
              {SUBJECT_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      </div>
    </Modal>
  );
}

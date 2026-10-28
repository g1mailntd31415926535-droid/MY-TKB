import { AlertTriangle } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select } from "../ui";
import type { AiDraft, Tag } from "../../types";

/** Một mục AI đọc được, chờ người dùng sửa và xác nhận. */
export function DraftCard({
  draft: d,
  tags,
  targetTitle,
  onPatch,
  onRemove,
  onOpenForm,
  onConfirm,
}: {
  draft: AiDraft;
  tags: Tag[];
  /** Tên buổi học gốc khi huỷ/dời. */
  targetTitle: string;
  onPatch: (patch: Partial<AiDraft>) => void;
  onRemove: () => void;
  onOpenForm: () => void;
  onConfirm: () => void;
}) {
  const isCancel = d.action === "cancel";
  const isMove = d.action === "move";

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {isCancel ? (
          <Badge className="bg-rose-50 text-rose-700">
            <AlertTriangle className="h-3 w-3" /> Huỷ buổi cũ
          </Badge>
        ) : isMove ? (
          <Badge className="bg-sky-50 text-sky-700">Dời buổi học</Badge>
        ) : (
          <Select
            className="h-8 w-36 text-[12px]"
            value={d.kind}
            onChange={(e) => onPatch({ kind: e.target.value as AiDraft["kind"] })}
          >
            <option value="event">Sự kiện</option>
            <option value="deadline">Deadline</option>
          </Select>
        )}
        {d.missing.length > 0 ? (
          <Badge className="bg-amber-50 text-amber-700">
            <AlertTriangle className="h-3 w-3" /> thiếu: {d.missing.join(", ")}
          </Badge>
        ) : (
          <Badge className="bg-emerald-50 text-emerald-700">đủ thông tin</Badge>
        )}
      </div>

      {d.action !== "add" ? (
        <div className="mb-2 rounded-lg border border-line bg-white px-2.5 py-2 text-[12px]">
          <span className="text-muted">Buổi gốc: </span>
          <span className="font-medium">{targetTitle}</span>
          <span className="text-muted"> · {d.target_date}</span>
        </div>
      ) : null}

      <Input
        value={d.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        className="mb-2"
      />

      {isCancel ? null : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label={isMove ? "Ngày mới" : "Ngày"}>
              <Input
                type="date"
                value={d.date ?? ""}
                onChange={(e) => onPatch({ date: e.target.value || null })}
              />
            </Field>
            <Field label={isMove ? "Bắt đầu mới" : "Bắt đầu"}>
              <Input
                type="time"
                value={d.start_time ?? ""}
                onChange={(e) => onPatch({ start_time: e.target.value || null })}
              />
            </Field>
            <Field label={isMove ? "Kết thúc mới" : "Kết thúc"}>
              <Input
                type="time"
                value={d.end_time ?? ""}
                onChange={(e) => onPatch({ end_time: e.target.value || null })}
              />
            </Field>
            <Field label="Ưu tiên">
              <Select
                value={d.priority}
                onChange={(e) =>
                  onPatch({ priority: e.target.value as AiDraft["priority"] })
                }
              >
                <option value="low">Thấp</option>
                <option value="normal">Bình thường</option>
                <option value="high">Cao</option>
              </Select>
            </Field>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Field label="Địa điểm">
              <Input
                value={d.location ?? ""}
                onChange={(e) => onPatch({ location: e.target.value || null })}
              />
            </Field>
            {isMove ? (
              <Field label="Nhóm" hint="Buổi dời tự gắn nhóm Đã đổi (xanh)">
                <Input value="Đã đổi" disabled />
              </Field>
            ) : (
              <Field
                label="Nhóm"
                hint={!d.tag ? "Không gắn nhóm sẽ bị ẩn khỏi lịch." : undefined}
              >
                <Select
                  value={d.tag ?? ""}
                  onChange={(e) => onPatch({ tag: e.target.value || null })}
                >
                  <option value="">— Không gắn nhóm —</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Ghi chú">
              <Input
                value={d.note ?? ""}
                onChange={(e) => onPatch({ note: e.target.value || null })}
              />
            </Field>
          </div>
        </>
      )}

      {d.question ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
          AI hỏi lại: {d.question}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          Bỏ
        </Button>
        {d.action === "add" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenForm}
          >
            Mở form đầy đủ
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          className={isCancel ? "bg-rose-500 hover:bg-rose-600" : undefined}
        >
          {isCancel ? "Xác nhận huỷ buổi" : isMove ? "Xác nhận dời" : "Xác nhận thêm"}
        </Button>
      </div>
    </Card>
  );
}

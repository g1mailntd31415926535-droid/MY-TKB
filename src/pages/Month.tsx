import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, UserRound } from "lucide-react";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { Button } from "../components/ui";
import { TagFilter } from "../components/tags";
import {
  DAY_LABELS,
  DAY_SHORT,
  addMonthsISO,
  buildDay,
  buildMonth,
  dayOfWeek,
  dotColor,
  formatMonthLabel,
  formatShortDate,
  fromISODate,
  isHappening,
  matchTag,
  repeatLabel,
  startOfMonthISO,
  toISODate,
} from "../lib/time";
import { cn } from "../lib/utils";
import type { DataSnapshot, Occurrence } from "../types";

function timeRange(item: Occurrence, data: DataSnapshot): string {
  const day = DAY_LABELS[dayOfWeek(item.date) - 1];
  if (item.allDay) return `${day} · Cả ngày`;
  const session =
    item.source === "session" ? data.sessions.find((s) => s.id === item.id) : null;
  const periods = session ? `, Tiết ${session.period_start}-${session.period_end}` : "";
  const end = item.end ? `-${item.end}` : "";
  return `${day}${periods} · ${item.start}${end}`;
}

function InfoRow({ label, value, blue }: { label: string; value: string; blue?: boolean }) {
  return (
    <div className="flex gap-1">
      <dt className="w-[68px] shrink-0 text-slate-500 sm:w-[78px]">{label}</dt>
      <dd className={cn("min-w-0 break-words", blue ? "text-[#2563eb]" : "text-slate-700")}>
        {value}
      </dd>
    </div>
  );
}

function DetailItem({
  item,
  data,
  now,
  onOpen,
}: {
  item: Occurrence;
  data: DataSnapshot;
  now: Date;
  onOpen: (item: Occurrence) => void;
}) {
  const live = isHappening(item, now);
  const showTag = item.tag && item.tag.name.toLowerCase() !== "lịch học";

  return (
    <button
      onClick={() => onOpen(item)}
      className="w-full rounded-lg bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-slate-100 transition-shadow hover:shadow-md"
    >
      <div className="flex gap-4">
        <div className="w-[58px] shrink-0 whitespace-nowrap border-r border-slate-200 pr-3 text-left">
          <p className="text-[12.5px] font-semibold tabular-nums text-slate-700">
            {item.allDay ? "Cả ngày" : item.start}
          </p>
          {!item.allDay && item.end ? (
            <p className="text-[11.5px] tabular-nums text-slate-500">{item.end}</p>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p
              className={cn(
                "text-[13.5px] font-semibold leading-snug text-[#2563eb]",
                item.done && "text-slate-400 line-through",
              )}
            >
              <span>{item.title}</span>
              {showTag ? <span> ({item.tag!.name})</span> : null}
            </p>
            {live ? (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                Đang diễn ra
              </span>
            ) : null}
            {item.kind === "deadline" ? (
              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-700">
                Deadline
              </span>
            ) : null}
            {item.repeatIntervalWeeks > 0 ? (
              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-sky-700">
                {repeatLabel(item.repeatIntervalWeeks)}
              </span>
            ) : null}
          </div>

          <dl className="mt-2 grid gap-y-1 text-[11.5px] leading-relaxed sm:text-[12px]">
            <InfoRow label="Thời gian:" value={timeRange(item, data)} />
            {item.room ? <InfoRow label="Địa điểm:" value={item.room} /> : null}
            {item.note ? <InfoRow label="Bài học:" value={item.note} /> : null}
            {item.subject?.teacher ? (
              <InfoRow label="Giảng viên:" value={item.subject.teacher} blue />
            ) : null}
          </dl>
        </div>
      </div>
    </button>
  );
}

export function MonthPage() {
  const data = useData((s) => s.data);
  const deleteException = useData((s) => s.deleteException);
  const openEntryEditor = useUi((s) => s.openEntryEditor);
  const openSessionEditor = useUi((s) => s.openSessionEditor);
  const selectedDate = useUi((s) => s.selectedDate);
  const setSelectedDate = useUi((s) => s.setSelectedDate);
  const tagFilter = useUi((s) => s.tagFilter);

  const today = toISODate(new Date());
  const [anchor, setAnchor] = useState(() => startOfMonthISO(selectedDate));
  const [view, setView] = useState<"calendar" | "detail">("calendar");

  useEffect(() => {
    if (startOfMonthISO(selectedDate) !== anchor) setAnchor(startOfMonthISO(selectedDate));
  }, [selectedDate, anchor]);

  const cells = useMemo(() => buildMonth(anchor, data), [anchor, data]);
  const dayItems = useMemo(
    () =>
      buildDay(selectedDate, data).filter(
        (i) => i.tag !== null && matchTag(i, tagFilter),
      ),
    [selectedDate, data, tagFilter],
  );
  const cancelled = useMemo(
    () => data.exceptions.filter((x) => x.date === selectedDate),
    [data.exceptions, selectedDate],
  );

  const monthOptions = useMemo(() => {
    const list = Array.from({ length: 25 }, (_, i) => addMonthsISO(today, i - 12));
    return list.includes(anchor) ? list : [...list, anchor].sort();
  }, [today, anchor]);

  const monthGroups = useMemo(() => {
    const groups = cells
      .filter((c) => c.inMonth)
      .map((c) => ({
        date: c.date,
        items: c.items.filter((i) => i.tag !== null && matchTag(i, tagFilter)),
      }))
      .filter((g) => g.items.length > 0);
    return groups;
  }, [cells, tagFilter]);

  const monthExceptions = useMemo(
    () => data.exceptions.filter((x) => startOfMonthISO(x.date) === anchor),
    [data.exceptions, anchor],
  );

  const now = new Date();

  const goMonth = (delta: number) => {
    const next = addMonthsISO(anchor, delta);
    setAnchor(next);
    setSelectedDate(next);
  };

  const pickDay = (date: string) => {
    setSelectedDate(date);
    if (startOfMonthISO(date) !== anchor) setAnchor(startOfMonthISO(date));
  };

  const openItem = (item: Occurrence) => {
    if (item.source === "session") {
      const session = data.sessions.find((s) => s.id === item.id);
      if (session) openSessionEditor(session);
      return;
    }
    const entry = data.entries.find((e) => e.id === item.id);
    if (entry) openEntryEditor(entry);
  };

  const totalItems = monthGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6 text-[13.5px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="month-view"
              checked={view === "calendar"}
              onChange={() => setView("calendar")}
              className="h-4 w-4 accent-[#d92d20]"
            />
            <span className={view === "calendar" ? "font-medium text-fg" : "text-muted"}>Lịch</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="month-view"
              checked={view === "detail"}
              onChange={() => setView("detail")}
              className="h-4 w-4 accent-[#d92d20]"
            />
            <span className={view === "detail" ? "font-medium text-fg" : "text-muted"}>Chi tiết</span>
          </label>
        </div>
        <TagFilter />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => {
            setAnchor(startOfMonthISO(today));
            setSelectedDate(today);
          }}
          className="rounded-full border border-accent px-4 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-red-50"
        >
          Hôm nay
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden text-[12px] text-muted sm:inline">Lịch tháng</span>
          <select
            value={anchor}
            onChange={(e) => {
              setAnchor(e.target.value);
              setSelectedDate(e.target.value);
            }}
            className="h-9 rounded-md border border-line bg-white px-2.5 text-[13px] text-fg outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          >
            {monthOptions.map((iso) => (
              <option key={iso} value={iso}>
                {formatMonthLabel(iso)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => goMonth(-1)}
                aria-label="Tháng trước"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/60 text-accent transition-colors hover:bg-red-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-[18px] font-bold tracking-tight">{formatMonthLabel(anchor)}</h2>
              <button
                onClick={() => goMonth(1)}
                aria-label="Tháng sau"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/60 text-accent transition-colors hover:bg-red-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {DAY_SHORT.map((d) => (
                <div key={d} className="pb-1 text-[13px] font-bold text-slate-800">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((cell) => {
                const d = fromISODate(cell.date);
                const isToday = cell.date === today;
                const isSelected = cell.date === selectedDate;
                const colors = [
                  ...new Set(
                    cell.items
                      .filter((i) => i.tag !== null && matchTag(i, tagFilter))
                      .map(dotColor),
                  ),
                ].slice(0, 4);

                return (
                  <button
                    key={cell.date}
                    data-date={cell.date}
                    onClick={() => pickDay(cell.date)}
                    className={cn(
                      "flex min-h-[72px] flex-col items-center gap-1 rounded-lg py-1.5 transition-colors hover:bg-slate-50 sm:min-h-[78px]",
                      isSelected && !isToday && "bg-red-50/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-[14px] tabular-nums",
                        isToday
                          ? "bg-accent font-semibold text-white"
                          : !cell.inMonth
                            ? "text-slate-300"
                            : isSelected
                              ? "font-semibold text-accent"
                              : "font-medium text-slate-700",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    <span className="flex h-2 items-center gap-1">
                      {cell.inMonth
                        ? colors.map((c) => (
                            <span
                              key={c}
                              className="h-[6px] w-[6px] rounded-full"
                              style={{ backgroundColor: c }}
                            />
                          ))
                        : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[10.5px] text-muted">
              {data.tags.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1">
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  {t.name}
                </span>
              ))}
              <span className="ml-auto">
                Chấm màu theo nhóm · mục không gắn nhóm bị ẩn
              </span>
            </div>
          </section>

          <aside className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:p-5">
            <h2 className="mb-4 text-center text-[17px] font-bold">Thông tin chi tiết</h2>

            {dayItems.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
                  <CalendarDays className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-[13px] text-muted">Ngày này đang trống.</p>
                <Button variant="outline" size="sm" onClick={() => openEntryEditor(null, selectedDate)}>
                  <Plus className="h-3.5 w-3.5" /> Thêm lịch ngày này
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayItems.map((item) => (
                  <DetailItem key={item.key} item={item} data={data} now={now} onOpen={openItem} />
                ))}
              </div>
            )}

            {cancelled.length > 0 ? (
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Đã huỷ / dời
                </p>
                {cancelled.map((x) => {
                  const session = data.sessions.find((s) => s.id === x.session_id);
                  const subject = data.subjects.find((s) => s.id === session?.subject_id);
                  return (
                    <div key={x.id} className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-[11.5px] text-slate-500 line-through">
                        {subject?.name ?? "Buổi học"}
                        {x.note ? ` · ${x.note}` : ""}
                      </p>
                      <button
                        type="button"
                        title="Hiện lại buổi học này"
                        onClick={() => deleteException(x.id).catch((e) => toast.error(String(e)))}
                        className="shrink-0 text-[10.5px] font-medium text-slate-500 underline-offset-2 hover:text-accent hover:underline"
                      >
                        Hoàn tác
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        <section className="mx-auto max-w-[960px] rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-bold">{formatMonthLabel(anchor)}</h2>
            <span className="text-[12px] text-muted">{totalItems} mục</span>
          </div>

          {monthGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CalendarDays className="h-8 w-8 text-slate-300" />
              <p className="text-[13px] text-muted">Tháng này chưa có lịch nào.</p>
            </div>
          ) : (
            monthGroups.map((g) => (
              <section key={g.date} className="mb-6 last:mb-0">
                <h3 className="mb-2 flex items-baseline gap-2 border-b border-line pb-1.5">
                  <span className="text-[13.5px] font-semibold">{DAY_LABELS[dayOfWeek(g.date) - 1]}</span>
                  <span className="text-[12px] text-muted">{formatShortDate(g.date)}</span>
                  {g.date === today ? (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-accent">
                      Hôm nay
                    </span>
                  ) : null}
                </h3>
                <div className="space-y-2.5">
                  {g.items.map((item) => (
                    <DetailItem
                      key={item.key}
                      item={item}
                      data={data}
                      now={now}
                      onOpen={openItem}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {monthExceptions.length > 0 ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Buổi đã huỷ / dời trong tháng
              </p>
              <div className="space-y-1">
                {monthExceptions.map((x) => {
                  const session = data.sessions.find((s) => s.id === x.session_id);
                  const subject = data.subjects.find((s) => s.id === session?.subject_id);
                  return (
                    <div key={x.id} className="flex items-center gap-2 text-[12px]">
                      <span className="w-14 shrink-0 text-slate-500">{formatShortDate(x.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-500 line-through">
                        {subject?.name ?? "Buổi học"}
                        {x.note ? ` · ${x.note}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteException(x.id).catch((e) => toast.error(String(e)))}
                        className="shrink-0 text-[11px] font-medium text-slate-500 hover:text-accent hover:underline"
                      >
                        Hoàn tác
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" onClick={() => openEntryEditor(null, selectedDate)}>
          <Plus className="h-3.5 w-3.5" /> Thêm lịch
        </Button>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted">
          <MapPin className="h-3 w-3" /> {data.settings.semester.name}
          {data.subjects.length > 0 ? (
            <>
              <span className="text-slate-300">·</span>
              <UserRound className="h-3 w-3" /> {data.subjects.length} môn
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import {
  CalendarClock,
  Check,
  Flag,
  GraduationCap,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { useTick } from "../lib/use-tick";
import {
  DAY_LABELS,
  buildDay,
  dayOfWeek,
  durationLabel,
  formatLongDate,
  fromISODate,
  isHappening,
  matchTag,
  minutesOf,
  nextUp,
  nowMinutes,
  progressOf,
  repeatLabel,
  toHHmm,
  toISODate,
  weekNumber,
} from "../lib/time";
import { Badge, Button, Card } from "../components/ui";
import { TagFilter, TagPill } from "../components/tags";
import { cn } from "../lib/utils";
import type { Occurrence } from "../types";

function KindIcon({ kind, className }: { kind: Occurrence["kind"]; className?: string }) {
  if (kind === "class") return <GraduationCap className={className} />;
  if (kind === "deadline") return <Flag className={className} />;
  return <CalendarClock className={className} />;
}

function kindLabel(kind: Occurrence["kind"]) {
  return kind === "class" ? "Buổi học" : kind === "deadline" ? "Deadline" : "Sự kiện";
}

export function TodayPage() {
  useTick(30_000);
  const data = useData((s) => s.data);
  const toggleDone = useData((s) => s.toggleDone);
  const openEntryEditor = useUi((s) => s.openEntryEditor);
  const openSessionEditor = useUi((s) => s.openSessionEditor);
  const tagFilter = useUi((s) => s.tagFilter);

  const today = toISODate(new Date());
  const week = weekNumber(data.settings.semester.start_date, today);
  const items = useMemo(
    () =>
      buildDay(today, data).filter((i) => i.tag !== null && matchTag(i, tagFilter)),
    [today, data, tagFilter],
  );

  const classes = items.filter((i) => i.kind === "class");
  const events = items.filter((i) => i.kind === "event");
  const upcomingDeadline = useMemo(() => {
    return data.entries
      .filter(
        (e) =>
          e.kind === "deadline" &&
          !e.done &&
          e.date >= today &&
          e.tag_id !== null &&
          (tagFilter.length === 0 || tagFilter.includes(e.tag_id)),
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [data.entries, today, tagFilter]);

  const now = new Date();
  const n = nowMinutes(now);
  const next = nextUp(items, now);
  const minutesToNext = next ? minutesOf(next.start) - n : 0;

  const openItem = (item: Occurrence) => {
    if (item.source === "session") {
      const session = data.sessions.find((s) => s.id === item.id);
      if (session) openSessionEditor(session);
      return;
    }
    const entry = data.entries.find((e) => e.id === item.id);
    if (entry) openEntryEditor(entry);
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-7 md:px-8 md:py-9">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {week >= 1 && week <= data.settings.semester.total_weeks
              ? `Tuần ${week} · ${data.settings.semester.name}`
              : data.settings.semester.name}
          </p>
          <h1 className="h-display text-3xl">Hôm nay</h1>
          <p className="mt-1 text-sm text-muted">{formatLongDate(today)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => openEntryEditor(null, today)}>
            <Plus className="h-4 w-4" /> Thêm lịch
          </Button>
        </div>
      </header>

      <TagFilter className="mb-4" />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Buổi học hôm nay</p>
          <p className="mt-1 text-2xl font-semibold">
            {classes.length}
            <span className="ml-1 text-xs font-normal text-muted">buổi</span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {classes[0] ? `${classes[0].start} · ${classes[0].title}` : "Không có lịch học"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Sự kiện / hoạt động</p>
          <p className="mt-1 text-2xl font-semibold">
            {events.length}
            <span className="ml-1 text-xs font-normal text-muted">mục</span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {events[0] ? `${events[0].start} · ${events[0].title}` : "Chưa có gì"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted">Deadline gần nhất</p>
          <p className="mt-1 truncate text-sm font-semibold">
            {upcomingDeadline ? upcomingDeadline.title : "Không có deadline"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {upcomingDeadline
              ? (() => {
                  const d = differenceInCalendarDays(fromISODate(upcomingDeadline.date), new Date());
                  return d <= 0 ? "Hôm nay" : `Còn ${d} ngày`;
                })()
              : "Yên tâm học bài"}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Bây giờ {toHHmm(n)}
          </div>
          <p className="text-[12px] text-muted">
            {next
              ? `Tiếp theo: ${next.title} lúc ${next.start} (${minutesToNext} phút nữa)`
              : "Đã hết việc hôm nay"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-slate-50">
              <Sparkles className="h-5 w-5 text-muted" />
            </div>
            <p className="text-base font-semibold">Hôm nay trống</p>
            <p className="max-w-sm text-sm text-muted">
              Thêm lịch, hội thảo hoặc deadline để bắt đầu theo dõi.
            </p>
            <Button className="mt-1" variant="primary" onClick={() => openEntryEditor(null, today)}>
              <Plus className="h-4 w-4" /> Thêm lịch đầu tiên
            </Button>
          </div>
        ) : (
          <div className="px-4 py-4">
            {items.map((item, i) => {
              const showNowLine =
                i === items.findIndex((x) => !x.allDay && minutesOf(x.start) > n);
              const live = isHappening(item, now);
              const color = item.subject?.color ?? (item.kind === "deadline" ? "#fb7185" : "#8b7cf6");
              return (
                <div key={item.key}>
                  {showNowLine ? (
                    <div className="mb-3 flex items-center gap-2 pl-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="h-px flex-1 bg-gradient-to-r from-emerald-400/60 to-transparent" />
                    </div>
                  ) : null}
                  <div className="flex gap-3">
                    <div className="w-12 shrink-0 pt-2 text-right">
                      <p className="text-[13px] font-semibold tabular-nums">{item.start}</p>
                      <p className="text-[11px] tabular-nums text-muted">
                        {item.allDay ? "cả ngày" : item.end}
                      </p>
                    </div>

                    <button
                      onClick={() => openItem(item)}
                      className={cn(
                        "group relative mb-2.5 flex-1 overflow-hidden rounded-2xl border bg-white p-3.5 text-left transition-colors hover:bg-slate-100",
                        live ? "border-accent/50" : "border-line",
                      )}
                    >
                      <span
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex items-start justify-between gap-3 pl-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <Badge color={color}>
                              <KindIcon kind={item.kind} className="h-3 w-3" />
                              {kindLabel(item.kind)}
                            </Badge>
                            {item.subject ? <Badge>{item.subject.code}</Badge> : null}
                            <TagPill tag={item.tag} />
                            {!item.allDay && item.end ? (
                              <Badge>{durationLabel(item.start, item.end)}</Badge>
                            ) : null}
                            {item.priority === "high" ? (
                              <Badge className="bg-rose-50 text-rose-700">Ưu tiên cao</Badge>
                            ) : null}
                            {item.repeatIntervalWeeks > 0 ? (
                              <Badge className="bg-sky-50 text-sky-700">
                                {repeatLabel(item.repeatIntervalWeeks)}
                              </Badge>
                            ) : null}
                            {live ? (
                              <Badge className="bg-emerald-50 text-emerald-700">Đang diễn ra</Badge>
                            ) : null}
                          </div>
                          <p
                            className={cn(
                              "truncate text-[14px] font-semibold",
                              item.done && "text-muted line-through",
                            )}
                          >
                            {item.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                            {item.room ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {item.room}
                              </span>
                            ) : null}
                            {item.note ? <span className="truncate">{item.note}</span> : null}
                          </div>
                        </div>

                        {item.source === "entry" && item.kind === "deadline" ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const entry = data.entries.find((x) => x.id === item.id);
                              if (entry) toggleDone(entry).catch((err) => toast.error(String(err)));
                            }}
                            className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
                              item.done
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-line text-transparent hover:border-slate-400",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>

                      {live ? (
                        <div className="mt-2.5 ml-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${Math.round(progressOf(item, now) * 100)}%` }}
                          />
                        </div>
                      ) : null}
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="mt-1 flex items-center gap-2 pl-1">
              <span className="ml-[54px] h-px flex-1 bg-gradient-to-r from-line to-transparent" />
            </div>
          </div>
        )}
      </Card>

      <p className="mt-4 text-center text-[11px] text-muted">
        {DAY_LABELS[dayOfWeek(today) - 1]} · Tuần {week} — chạm vào một mục để sửa
      </p>
    </div>
  );
}

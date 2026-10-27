import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Flag,
  GraduationCap,
  Plus,
  Repeat,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { Badge, Button, Card, Input } from "../components/ui";
import { TagFilter, TagPill } from "../components/tags";
import {
  DAY_SHORT,
  NO_TAG,
  dayOfWeek,
  formatShortDate,
  periodWindow,
  repeatEveryLabel,
  repeatLabel,
  semesterEndISO,
  toISODate,
} from "../lib/time";
import { cn, darken } from "../lib/utils";
import type { ItemKind } from "../types";

type Filter = "all" | ItemKind;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "class", label: "Buổi học" },
  { key: "event", label: "Sự kiện" },
  { key: "deadline", label: "Deadline" },
];

export function AllPage() {
  const data = useData((s) => s.data);
  const toggleDone = useData((s) => s.toggleDone);
  const openEntryEditor = useUi((s) => s.openEntryEditor);
  const openSessionEditor = useUi((s) => s.openSessionEditor);
  const tagFilter = useUi((s) => s.tagFilter);

  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const today = toISODate(new Date());
  const semesterEnd = semesterEndISO(data.settings.semester);

  const inTags = (tagId: string | null | undefined) =>
    tagFilter.length === 0 ||
    (tagId ? tagFilter.includes(tagId) : tagFilter.includes(NO_TAG));

  const sessions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.sessions
      .map((s) => ({ session: s, subject: data.subjects.find((x) => x.id === s.subject_id) }))
      .filter(({ session, subject }) => {
        if (filter === "event" || filter === "deadline") return false;
        if (!inTags(session.tag_id)) return false;
        if (!needle) return true;
        return `${subject?.name ?? ""} ${subject?.code ?? ""} ${session.room ?? ""}`
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) =>
        a.session.day_of_week - b.session.day_of_week ||
        a.session.period_start - b.session.period_start,
      );
  }, [data.sessions, data.subjects, filter, q, tagFilter]);

  /**
   * Mục đã gắn nhóm. Mục không gắn nhóm (tag_id = null) được tách riêng ở
   * "Chưa gắn nhóm" để không bị thất lạc, nhưng không hiện trên lịch.
   */
  const entries = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.entries
      .filter((e) => {
        if (filter === "class") return false;
        if (filter !== "all" && e.kind !== filter) return false;
        if (!e.tag_id) return false;
        if (!inTags(e.tag_id)) return false;
        if (!needle) return true;
        return `${e.title} ${e.note ?? ""} ${e.location ?? ""}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  }, [data.entries, filter, q, tagFilter]);

  const recurring = useMemo(
    () =>
      entries
        .filter((e) => e.repeat_weekly)
        .sort(
          (a, b) =>
            dayOfWeek(a.date) - dayOfWeek(b.date) ||
            (a.start_time ?? "").localeCompare(b.start_time ?? ""),
        ),
    [entries],
  );

  const oneOff = useMemo(() => entries.filter((e) => !e.repeat_weekly), [entries]);
  const upcoming = oneOff.filter((e) => e.date >= today);
  const past = oneOff.filter((e) => e.date < today).reverse();

  const untagged = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.entries
      .filter((e) => {
        if (filter === "class") return false;
        if (filter !== "all" && e.kind !== filter) return false;
        if (e.tag_id) return false;
        if (!needle) return true;
        return `${e.title} ${e.note ?? ""} ${e.location ?? ""}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  }, [data.entries, filter, q]);

  const showUntagged = untagged.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-7 md:px-8 md:py-9">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-3xl">Tất cả</h1>
          <p className="mt-1 text-sm text-muted">
            {data.sessions.length} buổi học lặp · {data.entries.length} mục
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => openEntryEditor(null, today)}>
            <Plus className="h-4 w-4" /> Thêm lịch
          </Button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-slate-50 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-8 rounded-lg px-3 text-[12.5px] font-medium transition-colors",
                filter === f.key ? "bg-accent/20 text-accent-2" : "text-muted hover:text-fg",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            className="h-10 pl-9"
            placeholder="Tìm theo tên, phòng, ghi chú…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <TagFilter className="mb-5" />

      {showUntagged ? (
        <section className="mb-7">
          <h2 className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Chưa gắn nhóm ({untagged.length})
          </h2>
          <p className="mb-2 px-1 text-[11px] text-amber-700">
            Không hiện trên lịch tháng / Hôm nay. Bấm vào một mục để gắn nhóm.
          </p>
          <Card className="divide-y divide-amber-100 border-amber-200 bg-amber-50/40">
            {untagged.map((e) => (
              <button
                key={e.id}
                onClick={() => openEntryEditor(e)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-50"
              >
                <div className="w-11 shrink-0 text-center">
                  <p className="text-[11px] tabular-nums text-amber-700">{formatShortDate(e.date)}</p>
                  <p className="text-[10px] tabular-nums text-amber-700/70">
                    {e.all_day || !e.start_time ? "cả ngày" : e.start_time}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <Badge className="bg-amber-100 text-amber-800">Chưa gắn nhóm</Badge>
                    {e.repeat_weekly ? (
                      <Badge className="bg-sky-50 text-sky-700">
                        {repeatLabel(e.repeat_interval_weeks || 1)}
                      </Badge>
                    ) : null}
                    {e.kind === "deadline" ? (
                      <Badge className="bg-rose-50 text-rose-700">Deadline</Badge>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-accent">Gắn nhóm →</span>
              </button>
            ))}
          </Card>
        </section>
      ) : null}

      {filter === "all" || filter === "class" ? (
        <section className="mb-7">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <GraduationCap className="h-3.5 w-3.5" /> Lịch học lặp theo tuần
          </h2>
          <Card className="divide-y divide-line/70">
            {sessions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Chưa có buổi học nào.</p>
            ) : (
              sessions.map(({ session, subject }) => {
                const win = periodWindow(data.settings.periods, session.period_start, session.period_end);
                return (
                  <button
                    key={session.id}
                    onClick={() => openSessionEditor(session)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold"
                      style={{ backgroundColor: `${subject?.color ?? "#8b7cf6"}22`, color: darken(subject?.color ?? "#8b7cf6") }}
                    >
                      {DAY_SHORT[session.day_of_week - 1]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {subject?.name ?? "Môn đã xoá"}
                      </p>
                      <p className="text-[11px] text-muted">
                        {win ? `${win.start}–${win.end}` : `Tiết ${session.period_start}`} · tuần{" "}
                        {session.weeks_start}–{session.weeks_end}
                        {session.interval_weeks > 1 ? ` · cách ${session.interval_weeks} tuần` : ""}
                        {session.room ? ` · ${session.room}` : ""}
                      </p>
                    </div>
                    <Badge>{subject?.code ?? "—"}</Badge>
                    {session.tag_id ? (
                      <TagPill tag={data.tags.find((t) => t.id === session.tag_id) ?? null} />
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700">Chưa gắn nhóm</Badge>
                    )}
                  </button>
                );
              })
            )}
          </Card>
        </section>
      ) : null}

      {filter !== "class" && recurring.length > 0 ? (
        <section className="mb-7">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <Repeat className="h-3.5 w-3.5" /> Lịch lặp định kỳ
          </h2>
          <Card className="divide-y divide-line/70">
            {recurring.map((e) => {
              const tag = data.tags.find((t) => t.id === e.tag_id) ?? null;
              const color = tag?.color ?? "#8b7cf6";
              const until = e.repeat_until || semesterEnd;
              return (
                <button
                  key={e.id}
                  onClick={() => openEntryEditor(e)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold"
                    style={{ backgroundColor: `${color}22`, color: darken(color) }}
                  >
                    {DAY_SHORT[dayOfWeek(e.date) - 1]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{e.title}</p>
                    <p className="text-[11px] text-muted">
                      {e.all_day || !e.start_time
                        ? "Cả ngày"
                        : `${e.start_time}${e.end_time ? `–${e.end_time}` : ""}`}
                      {" · "}
                      {repeatEveryLabel(e.repeat_interval_weeks || 1)}
                      {" · đến "}
                      {formatShortDate(until)}
                      {until < today ? " (đã kết thúc)" : ""}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  {e.kind === "deadline" ? (
                    <Badge className="bg-rose-50 text-rose-700">
                      <Flag className="h-3 w-3" /> Deadline
                    </Badge>
                  ) : (
                    <Badge className="bg-accent/15 text-accent-2">Sự kiện</Badge>
                  )}
                  <TagPill tag={tag} />
                </button>
              );
            })}
          </Card>
        </section>
      ) : null}

      {filter !== "class" ? (
        <>
          <section className="mb-7">
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Sắp tới ({upcoming.length})
            </h2>
            <Card className="divide-y divide-line/70">
              {upcoming.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">Không có mục nào sắp tới.</p>
              ) : (
                upcoming.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="w-11 shrink-0 text-center">
                      <p className="text-[11px] tabular-nums text-muted">{formatShortDate(e.date)}</p>
                      <p className="text-[10px] tabular-nums text-muted/70">
                        {e.all_day || !e.start_time ? "cả ngày" : e.start_time}
                      </p>
                    </div>
                    <button
                      onClick={() => openEntryEditor(e)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className={cn("truncate text-[13.5px] font-semibold", e.done && "line-through text-muted")}>
                        {e.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        {e.kind === "deadline" ? (
                          <Badge className="bg-rose-50 text-rose-700">
                            <Flag className="h-3 w-3" /> Deadline
                          </Badge>
                        ) : (
                          <Badge className="bg-accent/15 text-accent-2">Sự kiện</Badge>
                        )}
                        {e.location ? <span>{e.location}</span> : null}
                        <TagPill tag={data.tags.find((t) => t.id === e.tag_id) ?? null} />
                        {e.priority === "high" ? <span className="text-rose-700">Ưu tiên cao</span> : null}
                      </div>
                    </button>
                    <button
                      onClick={() => toggleDone(e).catch((err) => toast.error(String(err)))}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        e.done
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-line text-transparent hover:border-slate-400",
                      )}
                      aria-label="Đánh dấu xong"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </Card>
          </section>

          {past.length > 0 ? (
            <section>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Đã qua ({past.length})
              </h2>
              <Card className="divide-y divide-line/70 opacity-70">
                {past.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => openEntryEditor(e)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  >
                    <span className="w-11 shrink-0 text-[11px] tabular-nums text-muted">
                      {formatShortDate(e.date)}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px]",
                        e.done && "line-through text-muted",
                      )}
                    >
                      {e.title}
                    </span>
                    {!e.done ? <Badge className="bg-amber-50 text-amber-700">chưa xong</Badge> : null}
                  </button>
                ))}
              </Card>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

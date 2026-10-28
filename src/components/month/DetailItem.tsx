import { BookOpen, Clock, MapPin, UserRound } from "lucide-react";
import { TagPill } from "../tags";
import { DAY_LABELS, dayOfWeek, isHappening, repeatLabel } from "../../lib/time";
import { cn } from "../../lib/utils";
import type { DataSnapshot, Occurrence } from "../../types";

function timeRange(item: Occurrence, data: DataSnapshot): string {
  const day = DAY_LABELS[dayOfWeek(item.date) - 1];
  if (item.allDay) return `${day} · Cả ngày`;
  const session =
    item.source === "session" ? data.sessions.find((s) => s.id === item.id) : null;
  const periods = session ? `, Tiết ${session.period_start}-${session.period_end}` : "";
  const end = item.end ? ` - ${item.end}` : "";
  return `${day}${periods} · ${item.start}${end}`;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  blue,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  blue?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Icon className="mt-[2px] h-3.5 w-3.5 shrink-0 text-slate-400" />
      <dt className="w-[64px] shrink-0 text-slate-500">{label}</dt>
      <dd className={cn("min-w-0 flex-1 break-words", blue ? "text-[#2563eb]" : "text-slate-700")}>
        {value}
      </dd>
    </div>
  );
}

export function DetailItem({
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
      className="flex w-full min-w-0 gap-3 rounded-xl border-l-[3px] border-l-accent bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-slate-100 transition-shadow hover:shadow-md sm:p-3.5"
    >
      <div className="flex w-[52px] shrink-0 flex-col items-center pt-0.5">
        {item.allDay ? (
          <span className="text-[11.5px] font-semibold text-slate-700">Cả ngày</span>
        ) : (
          <>
            <span className="text-[12.5px] font-semibold tabular-nums text-slate-800">
              {item.start}
            </span>
            {item.end ? (
              <>
                <span className="my-0.5 h-3 w-px bg-slate-300" />
                <span className="text-[12px] tabular-nums text-slate-500">{item.end}</span>
              </>
            ) : null}
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "min-w-0 break-words text-[13.5px] font-semibold leading-snug text-slate-900",
            item.done && "text-slate-400 line-through",
          )}
        >
          {item.subject?.code ? (
            <>
              <span className="text-slate-500">{item.subject.code}</span>
              <span className="text-slate-300"> · </span>
              <span>{item.title}</span>
            </>
          ) : (
            <span>{item.title}</span>
          )}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {showTag ? <TagPill tag={item.tag} /> : null}
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
          <InfoRow icon={Clock} label="Thời gian:" value={timeRange(item, data)} />
          {item.room ? <InfoRow icon={MapPin} label="Địa điểm:" value={item.room} /> : null}
          {item.note ? <InfoRow icon={BookOpen} label="Bài học:" value={item.note} /> : null}
          {item.subject?.teacher ? (
            <InfoRow icon={UserRound} label="Giảng viên:" value={item.subject.teacher} blue />
          ) : null}
        </dl>
      </div>
    </button>
  );
}

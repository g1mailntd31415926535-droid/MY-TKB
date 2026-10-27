import { CalendarDays, CalendarRange, ListTodo, Settings, Sparkles, Sun } from "lucide-react";
import type { Page } from "../types";
import { useUi } from "../store/ui";
import { useData } from "../store/data";
import { cn } from "../lib/utils";
import { toISODate, weekNumber } from "../lib/time";

const NAV: {
  page: Page;
  label: string;
  short: string;
  section: string;
  icon: typeof Sun;
}[] = [
  { page: "today", label: "Hôm nay", short: "Hôm nay", section: "Học tập", icon: Sun },
  {
    page: "month",
    label: "Thời khoá biểu",
    short: "TKB",
    section: "Học tập",
    icon: CalendarDays,
  },
  { page: "all", label: "Tất cả", short: "Tất cả", section: "Học tập", icon: ListTodo },
  { page: "ai", label: "AI Inbox", short: "AI", section: "Trợ lý", icon: Sparkles },
  { page: "settings", label: "Cài đặt", short: "Cài đặt", section: "Hệ thống", icon: Settings },
];

export function Sidebar() {
  const page = useUi((s) => s.page);
  const setPage = useUi((s) => s.setPage);
  const semester = useData((s) => s.data.settings.semester);
  const mode = useData((s) => s.mode);

  const today = toISODate(new Date());
  const week = weekNumber(semester.start_date, today);
  const current = NAV.find((n) => n.page === page) ?? NAV[0];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="flex h-9 items-center gap-1.5 overflow-x-auto text-[11.5px] text-muted">
          <span className="shrink-0">Trang chủ</span>
          <span className="shrink-0 text-slate-300">/</span>
          <span className="shrink-0">{current.section}</span>
          <span className="shrink-0 text-slate-300">/</span>
          <span className="shrink-0 font-semibold text-accent">{current.label}</span>
          <span className="ml-auto hidden shrink-0 items-center gap-2 pl-4 text-[11px] sm:flex">
            <span>{mode === "supabase" ? "Supabase" : "Lưu trên máy"}</span>
            <span className="text-slate-300">·</span>
            <span>
              {week < 1 || week > semester.total_weeks
                ? "Ngoài kỳ"
                : `Tuần ${week} / ${semester.total_weeks}`}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-5">
          <button
            onClick={() => setPage("month")}
            className="flex shrink-0 items-center gap-2 pb-2 text-left"
            aria-label="Track TKB — Thời khoá biểu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <CalendarRange className="h-4.5 w-4.5" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[14.5px] font-bold tracking-tight">Track TKB</span>
              <span className="block max-w-[160px] truncate text-[10.5px] text-muted">
                {semester.name}
              </span>
            </span>
          </button>

          <nav className="-mb-px flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
            {NAV.map(({ page: p, label, short, icon: Icon }) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                aria-current={page === p ? "page" : undefined}
                className={cn(
                  "relative flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-1.5 text-[12.5px] font-medium transition-colors sm:px-3.5 sm:text-[13px]",
                  page === p
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-fg",
                )}
              >
                <Icon className="hidden h-4 w-4 sm:block" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

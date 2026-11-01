import { useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarRange, Check, ListTodo, Settings, Sparkles, Sun } from "lucide-react";
import { toast } from "sonner";
import type { Page } from "../types";
import { useUi } from "../store/ui";
import { useData } from "../store/data";
import { cn } from "../lib/utils";
import { toISODate, weekNumber } from "../lib/time";
import { PROFILES, profileName, type ProfileId } from "../lib/profile";

const NAV: {
  page: Page;
  label: string;
  short: string;
  icon: typeof Sun;
}[] = [
  { page: "today", label: "Hôm nay", short: "Hôm nay", icon: Sun },
  { page: "month", label: "Thời khoá biểu", short: "TKB", icon: CalendarDays },
  { page: "all", label: "Tất cả", short: "Tất cả", icon: ListTodo },
  { page: "ai", label: "AI Inbox", short: "AI", icon: Sparkles },
  { page: "settings", label: "Cài đặt", short: "Cài đặt", icon: Settings },
];

/** Bấm logo → chọn TKB muốn xem. Mỗi TKB lưu dữ liệu riêng. */
function ProfileSwitcher() {
  const profile = useData((s) => s.profile);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: ProfileId) => {
    setOpen(false);
    if (id === profile) return;
    // Nhóm, ô đang sửa… thuộc TKB cũ — dọn đi trước khi đổi.
    const ui = useUi.getState();
    ui.clearTags();
    ui.closeEditor();
    ui.closeSessionEditor();
    useData
      .getState()
      .switchProfile(id)
      .then(() => toast.success(`Đang xem ${profileName(id)}`))
      .catch(() => {
        /* lỗi đã hiện ở màn SetupError */
      });
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/25"
        aria-label={`Track TKB — ${profileName(profile)}. Chọn thời khoá biểu`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CalendarRange className="h-5 w-5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-white p-1.5 text-fg shadow-xl"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-muted">Thời khoá biểu</p>
          {PROFILES.map((p) => (
            <button
              key={p.id}
              role="menuitemradio"
              aria-checked={p.id === profile}
              onClick={() => pick(p.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[14px] font-medium transition-colors hover:bg-surface-2",
                p.id === profile && "bg-surface-2",
              )}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: p.color }}
              >
                <CalendarRange className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.id === profile ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const page = useUi((s) => s.page);
  const setPage = useUi((s) => s.setPage);
  const semester = useData((s) => s.data.settings.semester);
  const mode = useData((s) => s.mode);
  const profile = useData((s) => s.profile);

  const today = toISODate(new Date());
  const week = weekNumber(semester.start_date, today);
  const current = NAV.find((n) => n.page === page) ?? NAV[0];
  const inSemester = week >= 1 && week <= semester.total_weeks;

  return (
    <header className="z-30 shrink-0">
      {/* Thanh đỏ trên cùng — giống app của trường */}
      <div
        className="bg-accent text-white"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-2 px-3 sm:px-6">
          <ProfileSwitcher />
          <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-tight sm:text-[18px]">
            {current.label}
          </h1>
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium tabular-nums">
            {inSemester ? `Tuần ${week}` : "Ngoài kỳ"}
          </span>
        </div>
      </div>

      {/* Tab điều hướng — gạch chân đỏ như app trường */}
      <div className="border-b border-line bg-white">
        <nav className="mx-auto flex w-full max-w-[1320px] gap-0.5 overflow-x-auto px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          {NAV.map(({ page: p, label, short, icon: Icon }) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              aria-label={label}
              aria-current={page === p ? "page" : undefined}
              className={cn(
                "relative flex h-12 shrink-0 items-center gap-1.5 border-b-[3px] px-2.5 text-[13px] font-medium transition-colors sm:px-4 sm:text-[13.5px]",
                page === p
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-600 hover:text-fg",
              )}
            >
              <Icon className="hidden h-4 w-4 sm:block" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <span className="ml-auto hidden shrink-0 items-center gap-2 pl-4 text-[11px] text-muted sm:flex">
            <span className="font-semibold text-accent">{profileName(profile)}</span>
            <span className="text-slate-300">·</span>
            <span>{mode === "supabase" ? "Supabase" : "Lưu trên máy"}</span>
            <span className="text-slate-300">·</span>
            <span className="max-w-[180px] truncate">{semester.name}</span>
          </span>
        </nav>
      </div>
    </header>
  );
}

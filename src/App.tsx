import { useEffect } from "react";
import { Toaster } from "sonner";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { AuthGate } from "./components/AuthGate";
import { TodayPage } from "./pages/Today";
import { MonthPage } from "./pages/Month";
import { AllPage } from "./pages/All";
import { AiPage } from "./pages/Ai";
import { SettingsPage } from "./pages/Settings";
import { EntryEditor, SessionEditor } from "./components/editors";
import { useUi } from "./store/ui";
import { useData } from "./store/data";
import { Button, Card } from "./components/ui";

function SetupError({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-3 flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-base font-semibold">Chưa kết nối được Supabase</h1>
        </div>
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900">
          {message}
        </p>
        <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
          <li>Chạy lần lượt <code className="rounded bg-slate-100 px-1">supabase/migrations/001_init.sql</code>, <code className="rounded bg-slate-100 px-1">002_tags.sql</code>, <code className="rounded bg-slate-100 px-1">003_recurrence_exceptions.sql</code>, <code className="rounded bg-slate-100 px-1">004_entry_repeat.sql</code>, <code className="rounded bg-slate-100 px-1">005_entry_repeat_interval.sql</code> trong SQL Editor.</li>
          <li>Project Settings → API → Exposed schemas → thêm <code className="rounded bg-slate-100 px-1">track_tkb</code>.</li>
          <li>Authentication → Users → tạo user (bật Auto Confirm).</li>
          <li>Điền đúng <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> và <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> rồi khởi động lại dev server.</li>
        </ol>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => useData.getState().init().catch(() => {})}>
            <RotateCcw className="h-4 w-4" /> Thử lại
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Shell() {
  const page = useUi((s) => s.page);
  const ready = useData((s) => s.ready);
  const error = useData((s) => s.error);

  useEffect(() => {
    useData
      .getState()
      .init()
      .catch(() => {
        /* lỗi đã hiện ở màn SetupError */
      });
  }, []);

  if (error) return <SetupError message={error} />;

  return (
    <div className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-bg">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
        {!ready ? (
          <div className="flex h-full min-h-[60vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : page === "today" ? (
          <TodayPage />
        ) : page === "month" ? (
          <MonthPage />
        ) : page === "all" ? (
          <AllPage />
        ) : page === "ai" ? (
          <AiPage />
        ) : (
          <SettingsPage />
        )}
      </main>

      <EntryEditor />
      <SessionEditor />
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <Shell />
      <Toaster
        theme="light"
        position="bottom-right"
        toastOptions={{
          style: { background: "#ffffff", border: "1px solid #e3e6ec", color: "#1f2430" },
        }}
      />
    </AuthGate>
  );
}

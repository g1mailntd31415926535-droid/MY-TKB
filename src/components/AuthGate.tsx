import { useEffect, useState, type ReactNode } from "react";
import { CalendarRange, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { getSupabase, useCloud } from "../lib/supabase";
import { Button, Card, Field, Input } from "./ui";

type Session = { user: { email?: string | null } } | null;

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | undefined>(useCloud ? undefined : null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!useCloud) return;
    let unsub: (() => void) | undefined;
    getSupabase().then((sb) => {
      if (!sb) return;
      sb.auth.getSession().then(({ data }: { data: { session: unknown } }) =>
        setSession((data.session as Session) ?? null),
      );
      const { data } = sb.auth.onAuthStateChange((_event: string, s: unknown) =>
        setSession((s as Session) ?? null),
      );
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, []);

  if (!useCloud) return <>{children}</>;

  if (session === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (session) return <>{children}</>;

  const submit = async () => {
    const sb = await getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <CalendarRange className="h-5 w-5" />
          </span>
          <h1 className="text-[20px] font-bold tracking-tight">Track TKB</h1>
          <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-muted">
            Thời khoá biểu, sự kiện và deadline trên một dòng thời gian.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="text-[15px] font-semibold">Đăng nhập</h2>
          <p className="mt-1 mb-4 text-[12px] text-muted">
            Dùng tài khoản đã tạo trong Supabase Auth.
          </p>
          <div className="grid gap-3">
            <Field label="Email">
              <Input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </Field>
            <Button variant="primary" onClick={submit} disabled={busy || !email || !password}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Đăng nhập
            </Button>
          </div>
        </Card>

        <p className="mt-4 text-center text-[11px] text-muted">Chỉ dành cho một người dùng.</p>
      </div>
    </div>
  );
}

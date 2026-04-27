import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success(mode === "signin" ? "Welcome back!" : "Account created — signing you in.");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 gradient-sidebar text-sidebar-foreground overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full gradient-brand opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[oklch(0.7_0.18_310)] opacity-20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl gradient-brand flex items-center justify-center shadow-brand">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">BS Dyeing</div>
            <div className="text-[11px] uppercase tracking-widest opacity-60">Billing Suite</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Run your dyeing business with <span className="text-gradient-brand">precision</span>.
          </h2>
          <p className="mt-4 text-sidebar-foreground/70 text-sm leading-relaxed">
            Manage parties, challans, bills and payments in one clean workspace. Fast PDFs, accurate GST,
            zero clutter.
          </p>
        </div>

        <div className="relative text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} BS Dyeing
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center shadow-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="font-display text-xl font-bold">BS Dyeing</div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {mode === "signin" ? "Sign in to continue to your workspace." : "Get started in under a minute."}
          </p>

          <form onSubmit={submit} className="space-y-4 mt-7">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11" />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 gradient-brand text-white shadow-brand hover:opacity-95 border-0">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "First time? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-foreground font-semibold hover:text-[oklch(0.55_0.22_275)] transition-colors"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

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
    if (error) {
      toast.error(error);
    } else {
      toast.success(mode === "signin" ? "Welcome back!" : "Account created — signing you in.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-primary opacity-[0.04]" />
      <Card className="w-full max-w-md shadow-elegant border-border/60 relative">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt="BS Dyeing" width={64} height={64} className="mb-3" />
            <h1 className="font-display text-2xl font-bold text-gradient-gold">BS Dyeing</h1>
            <p className="text-xs text-muted-foreground mt-1">Challan & Bill Management</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
              {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-5">
            {mode === "signin" ? "First time? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

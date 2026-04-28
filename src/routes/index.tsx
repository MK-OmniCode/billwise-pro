import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/app" : "/login", replace: true });
  }, [user, loading, navigate]);

  // Safety net: if auth takes too long, send to login so we never get stuck on this splash.
  useEffect(() => {
    const t = setTimeout(() => {
      console.log("Auth timeout - redirecting to login");
      navigate({ to: "/login", replace: true });
    }, 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 rounded-2xl gradient-brand mx-auto mb-4 animate-pulse shadow-brand" />
        <div className="font-display text-2xl font-bold tracking-tight">BS Dyeing</div>
        <p className="text-sm text-muted-foreground mt-2">Loading your workspace…</p>
      </div>
    </div>
  );
}

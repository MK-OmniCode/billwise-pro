import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  // Redirect immediately to login
  useEffect(() => {
    console.log("Redirecting to login");
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 rounded-2xl gradient-brand mx-auto mb-4 animate-pulse shadow-brand" />
        <div className="font-display text-2xl font-bold tracking-tight">BS Dyeing</div>
        <p className="text-sm text-muted-foreground mt-2">Redirecting to login…</p>
      </div>
    </div>
  );
}

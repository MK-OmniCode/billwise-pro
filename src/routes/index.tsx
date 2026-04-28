import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate({ to: "/app", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    } else if (timeoutReached) {
      // If still loading after timeout, redirect to login anyway
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate, timeoutReached]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-12 w-12 rounded-2xl gradient-brand mx-auto mb-4 animate-pulse shadow-brand" />
        <div className="font-display text-2xl font-bold tracking-tight">BS Dyeing</div>
        <p className="text-sm text-muted-foreground mt-2">
          {loading ? "Loading your workspace…" : "Redirecting…"}
        </p>
        {timeoutReached && loading && (
          <p className="text-xs text-muted-foreground mt-1">
            Taking longer than expected…
          </p>
        )}
      </div>
    </div>
  );
}

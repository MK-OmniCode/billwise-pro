import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, Receipt, Settings, LogOut, Wallet, Menu, X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/parties", label: "Parties", icon: Users },
  { to: "/app/challans", label: "Challans", icon: FileText },
  { to: "/app/bills", label: "Bills", icon: Receipt },
  { to: "/app/payments", label: "Payments", icon: Wallet },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const NavLinks = () => (
    <>
      {nav.map((n) => {
        const Icon = n.icon;
        const active = isActive(n.to, n.exact);
        return (
          <Link
            key={n.to}
            to={n.to as never}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-soft"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full gradient-brand" />
            )}
            <Icon className={`h-4 w-4 transition-colors ${active ? "text-[oklch(0.75_0.18_290)]" : ""}`} />
            {n.label}
          </Link>
        );
      })}
    </>
  );

  const Brand = () => (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-xl gradient-brand flex items-center justify-center shadow-brand">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-bold tracking-tight text-sidebar-foreground">BS Dyeing</div>
        <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Billing Suite</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 gradient-sidebar text-sidebar-foreground flex-col shrink-0 border-r border-sidebar-border">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-sidebar-accent/40 mb-2">
            <div className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div className="text-[11px] text-sidebar-foreground/70 truncate flex-1">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-3 gradient-sidebar border-b border-sidebar-border">
        <Brand />
        <Button size="icon" variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-20 gradient-sidebar p-3 space-y-1 overflow-y-auto">
          <NavLinks />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 mt-4"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      )}

      <main className="flex-1 min-w-0 overflow-x-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

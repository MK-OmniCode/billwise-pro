import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, Receipt, Settings, LogOut, Wallet, Menu, X } from "lucide-react";
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
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-sidebar text-sidebar-foreground flex-col shrink-0 border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="font-display text-base font-bold tracking-tight">BS Dyeing</div>
          <div className="text-[11px] text-sidebar-foreground/50 mt-0.5">Billing Suite</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-1.5 text-[11px] text-sidebar-foreground/50 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-12 flex items-center justify-between px-3 bg-sidebar border-b border-sidebar-border">
        <div className="font-display text-sm font-bold">BS Dyeing</div>
        <Button size="icon" variant="ghost" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-12 z-20 bg-sidebar p-3 space-y-0.5 overflow-y-auto">
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

      <main className="flex-1 min-w-0 overflow-x-auto pt-12 md:pt-0">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pb-4 border-b border-border">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

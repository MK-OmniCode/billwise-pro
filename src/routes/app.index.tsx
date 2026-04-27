import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Receipt, IndianRupee, ArrowUpRight, Plus } from "lucide-react";
import { fmtINR } from "@/lib/utils-bs";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ parties: 0, challans: 0, bills: 0, revenue: 0 });
  const [recentBills, setRecentBills] = useState<Array<{ id: string; bill_no: string; bill_date: string; total: number; party_snapshot: { name?: string } }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: pc }, { count: cc }, { count: bc }, { data: bd }, { data: allBills }] = await Promise.all([
        supabase.from("parties").select("*", { count: "exact", head: true }),
        supabase.from("challans").select("*", { count: "exact", head: true }),
        supabase.from("bills").select("*", { count: "exact", head: true }),
        supabase.from("bills").select("id,bill_no,bill_date,total,party_snapshot").order("created_at", { ascending: false }).limit(5),
        supabase.from("bills").select("total"),
      ]);
      const totalRev = (allBills ?? []).reduce((s, b) => s + Number(b.total), 0);
      setStats({ parties: pc ?? 0, challans: cc ?? 0, bills: bc ?? 0, revenue: totalRev });
      setRecentBills((bd ?? []) as typeof recentBills);
    })();
  }, [user]);

  const cards = [
    { label: "Parties", val: stats.parties, icon: Users, href: "/app/parties", tint: "oklch(0.95 0.04 200)", iconColor: "oklch(0.5 0.15 215)" },
    { label: "Challans", val: stats.challans, icon: FileText, href: "/app/challans", tint: "oklch(0.95 0.04 145)", iconColor: "oklch(0.5 0.15 155)" },
    { label: "Bills", val: stats.bills, icon: Receipt, href: "/app/bills", tint: "oklch(0.95 0.04 60)", iconColor: "oklch(0.55 0.16 65)" },
    { label: "Revenue", val: fmtINR(stats.revenue), icon: IndianRupee, href: "/app/bills", tint: "oklch(0.95 0.04 290)", iconColor: "oklch(0.55 0.22 285)" },
  ];

  return (
    <div className="p-5 md:p-8 max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""} — here's what's happening.`}
        actions={
          <Link to="/app/bills">
            <button className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg gradient-brand text-white text-sm font-medium shadow-brand hover:opacity-95 transition-opacity">
              <Plus className="h-4 w-4" /> New Bill
            </button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.href} className="group">
              <Card className="border-border/60 shadow-soft hover:shadow-brand transition-all hover:-translate-y-0.5 overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{ background: c.tint }}
                    >
                      <Icon className="h-4 w-4" style={{ color: c.iconColor }} />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{c.label}</div>
                  <div className="text-xl md:text-2xl font-bold mt-1 num truncate">{c.val}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold">Recent Bills</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your latest 5 invoices</p>
            </div>
            <Link to="/app/bills" className="text-xs font-medium text-[oklch(0.55_0.22_275)] hover:underline underline-offset-4">
              View all →
            </Link>
          </div>
          {recentBills.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12 border border-dashed border-border rounded-xl">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No bills yet.{" "}
              <Link to="/app/bills" className="text-foreground font-medium underline underline-offset-4">
                Create your first bill →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentBills.map((b) => (
                <Link
                  key={b.id}
                  to="/app/bills/$id"
                  params={{ id: b.id }}
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{b.bill_no}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {b.party_snapshot?.name || "—"} • {b.bill_date}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold num text-sm shrink-0 ml-3">{fmtINR(Number(b.total))}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

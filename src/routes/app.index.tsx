import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileText, Receipt, IndianRupee } from "lucide-react";
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
    { label: "Parties", val: stats.parties, icon: Users, href: "/app/parties" },
    { label: "Challans", val: stats.challans, icon: FileText, href: "/app/challans" },
    { label: "Bills", val: stats.bills, icon: Receipt, href: "/app/bills" },
    { label: "Total Revenue", val: fmtINR(stats.revenue), icon: IndianRupee, href: "/app/bills" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader title="Dashboard" subtitle="Overview of your business" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.href}>
              <Card className="hover:border-foreground/30 transition-colors cursor-pointer shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                    <div className="text-xl md:text-2xl font-bold mt-1 num truncate">{c.val}</div>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="shadow-none">
        <CardContent className="p-6">
          <h2 className="text-base font-semibold mb-4">Recent Bills</h2>
          {recentBills.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No bills yet. <Link to="/app/bills" className="text-foreground font-medium underline underline-offset-4">Create your first bill →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border -mx-2">
              {recentBills.map((b) => (
                <Link key={b.id} to="/app/bills/$id" params={{ id: b.id }} className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 rounded-md">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{b.bill_no}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.party_snapshot?.name || "—"} • {b.bill_date}</div>
                  </div>
                  <div className="font-semibold num text-sm shrink-0 ml-3">{fmtINR(Number(b.total))}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

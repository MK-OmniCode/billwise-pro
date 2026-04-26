import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtINR } from "@/lib/utils-bs";
import { generateBillPDF, preloadPdf } from "@/lib/pdf-lazy";
import { getCompanySettings } from "@/lib/company-cache";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/bills/")({
  component: BillsList,
});

type Bill = {
  id: string;
  bill_no: string;
  bill_date: string;
  party_snapshot: { name?: string; gstin?: string; address?: string; phone?: string; state?: string };
  items: Array<{ description: string; weight: number; rate: number; amount: number }>;
  subtotal: number;
  cgst_percent: number; sgst_percent: number; igst_percent: number;
  cgst_amount: number; sgst_amount: number; igst_amount: number;
  total: number;
  notes: string | null;
  status: string;
};

function BillsList() {
  const { user } = useAuth();
  const [list, setList] = useState<Bill[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("bills").select("*").order("bill_date", { ascending: false });
    setList((data ?? []) as unknown as Bill[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this bill?")) return;
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const downloadPdf = async (b: Bill) => {
    const { data: cs } = await supabase.from("company_settings").select("*").maybeSingle();
    await generateBillPDF({
      company: cs ?? { company_name: "BS Dyeing" },
      billNo: b.bill_no, date: b.bill_date,
      party: b.party_snapshot ?? {},
      items: b.items ?? [],
      subtotal: Number(b.subtotal),
      cgst_percent: Number(b.cgst_percent), sgst_percent: Number(b.sgst_percent), igst_percent: Number(b.igst_percent),
      cgst_amount: Number(b.cgst_amount), sgst_amount: Number(b.sgst_amount), igst_amount: Number(b.igst_amount),
      total: Number(b.total), notes: b.notes ?? "",
    });
  };

  const filtered = list.filter((b) =>
    [b.bill_no, b.party_snapshot?.name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Bills"
        subtitle="Tax invoices"
        actions={<Link to="/app/bills/$id" params={{ id: "new" }}><Button><Plus className="h-4 w-4 mr-2" />New Bill</Button></Link>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search bills…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <Card className="shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left">
                <th className="p-3 font-semibold">Bill No</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Party</th>
                <th className="p-3 font-semibold text-right">Total</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No bills yet.</td></tr>}
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{b.bill_no}</td>
                  <td className="p-3 text-muted-foreground">{b.bill_date}</td>
                  <td className="p-3">{b.party_snapshot?.name || "—"}</td>
                  <td className="p-3 text-right font-semibold num">{fmtINR(Number(b.total))}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border ${b.status === "paid" ? "border-foreground/30 bg-muted" : "border-warning/40 bg-warning/10"}`}>{b.status}</span></td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => downloadPdf(b)}><FileDown className="h-4 w-4" /></Button>
                    <Link to="/app/bills/$id" params={{ id: b.id }}><Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button></Link>
                    <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

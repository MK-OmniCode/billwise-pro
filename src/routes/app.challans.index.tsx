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
import { generateChallanPDF } from "@/lib/pdf";

export const Route = createFileRoute("/app/challans/")({
  component: ChallansList,
});

type Challan = {
  id: string;
  challan_no: string;
  challan_date: string;
  party_snapshot: { name?: string; gstin?: string; address?: string; phone?: string; state?: string };
  items: Array<{ description: string; quantity: string | number; remark?: string }>;
  remark: string | null;
  billed: boolean;
};

function ChallansList() {
  const { user } = useAuth();
  const [list, setList] = useState<Challan[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("challans").select("*").order("challan_date", { ascending: false });
    setList((data ?? []) as unknown as Challan[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this challan?")) return;
    const { error } = await supabase.from("challans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const downloadPdf = async (c: Challan) => {
    const { data: cs } = await supabase.from("company_settings").select("*").maybeSingle();
    await generateChallanPDF({
      company: cs ?? { company_name: "BS Dyeing" },
      challanNo: c.challan_no,
      date: c.challan_date,
      party: c.party_snapshot ?? {},
      items: c.items ?? [],
      remark: c.remark ?? "",
    });
  };

  const filtered = list.filter((c) =>
    [c.challan_no, c.party_snapshot?.name].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Challans"
        subtitle="Delivery challans"
        actions={<Link to="/app/challans/$id" params={{ id: "new" }}><Button><Plus className="h-4 w-4 mr-2" />New Challan</Button></Link>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by no. or party…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <Card className="shadow-none">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left">
                <th className="p-3 font-semibold">Challan No</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Party</th>
                <th className="p-3 font-semibold">Items</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No challans yet.</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.challan_no}</td>
                  <td className="p-3 text-muted-foreground">{c.challan_date}</td>
                  <td className="p-3">{c.party_snapshot?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{(c.items ?? []).length} item(s)</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border ${c.billed ? "border-foreground/30 bg-muted" : "border-warning/40 bg-warning/10"}`}>{c.billed ? "Billed" : "Pending"}</span></td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => downloadPdf(c)}><FileDown className="h-4 w-4" /></Button>
                    <Link to="/app/challans/$id" params={{ id: c.id }}><Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button></Link>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, FileDown } from "lucide-react";
import { toast } from "sonner";
import { nextDocNo, todayISO } from "@/lib/utils-bs";
import { generateChallanPDF } from "@/lib/pdf";

export const Route = createFileRoute("/app/challans/$id")({
  component: ChallanForm,
});

type Item = { description: string; quantity: string; remark: string };
type Party = { id: string; name: string; gstin: string | null; address: string | null; phone: string | null; state: string | null };

function ChallanForm() {
  const { id } = useParams({ from: "/app/challans/$id" });
  const isNew = id === "new";
  const { user } = useAuth();
  const navigate = useNavigate();

  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string>("");
  const [challanNo, setChallanNo] = useState("");
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: "", remark: "" }]);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("parties").select("id,name,gstin,address,phone,state").order("name");
      setParties((p ?? []) as Party[]);

      if (isNew) {
        const { data: cs } = await supabase.from("company_settings").select("challan_prefix").maybeSingle();
        const { data: last } = await supabase.from("challans").select("challan_no").order("created_at", { ascending: false }).limit(1).maybeSingle();
        setChallanNo(nextDocNo(cs?.challan_prefix || "CH", last?.challan_no ?? null));
      } else {
        const { data: c } = await supabase.from("challans").select("*").eq("id", id).maybeSingle();
        if (c) {
          setChallanNo(c.challan_no);
          setDate(c.challan_date);
          setPartyId(c.party_id ?? "");
          setItems((c.items as Item[]) ?? []);
          setRemark(c.remark ?? "");
        }
      }
    })();
  }, [user, id, isNew]);

  const addItem = () => setItems([...items, { description: "", quantity: "", remark: "" }]);
  const updItem = (i: number, patch: Partial<Item>) => { const c = [...items]; c[i] = { ...c[i], ...patch }; setItems(c); };
  const delItem = (i: number) => { const c = [...items]; c.splice(i, 1); setItems(c.length ? c : [{ description: "", quantity: "", remark: "" }]); };

  const buildPayload = () => {
    const party = parties.find(p => p.id === partyId);
    const party_snapshot = party ? { name: party.name, gstin: party.gstin ?? "", address: party.address ?? "", phone: party.phone ?? "", state: party.state ?? "" } : {};
    return {
      challan_no: challanNo.trim(),
      challan_date: date,
      party_id: partyId || null,
      party_snapshot,
      items: items.filter(i => i.description.trim() || i.quantity.toString().trim()),
      remark,
    };
  };

  const save = async (): Promise<string | null> => {
    if (!challanNo.trim()) { toast.error("Challan number required"); return null; }
    if (!partyId) { toast.error("Select a party"); return null; }
    setBusy(true);
    const payload = buildPayload();
    if (isNew) {
      const { data, error } = await supabase.from("challans").insert({ ...payload, user_id: user!.id }).select("id").single();
      setBusy(false);
      if (error) { toast.error(error.message); return null; }
      toast.success("Challan saved");
      navigate({ to: "/app/challans/$id", params: { id: data!.id }, replace: true });
      return data!.id;
    } else {
      const { error } = await supabase.from("challans").update(payload).eq("id", id);
      setBusy(false);
      if (error) { toast.error(error.message); return null; }
      toast.success("Challan updated");
      return id;
    }
  };

  const saveAndPdf = async () => {
    await save();
    const { data: cs } = await supabase.from("company_settings").select("*").maybeSingle();
    const p = buildPayload();
    await generateChallanPDF({
      company: cs ?? { company_name: "BS Dyeing" },
      challanNo: p.challan_no, date: p.challan_date, party: p.party_snapshot, items: p.items, remark: p.remark,
    });
  };

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title={isNew ? "New Challan" : `Challan ${challanNo}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ to: "/app/challans" })}>Cancel</Button>
            <Button variant="outline" onClick={saveAndPdf}><FileDown className="h-4 w-4 mr-2" />Save & PDF</Button>
            <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90"><Save className="h-4 w-4 mr-2" />Save</Button>
          </>
        }
      />

      <Card className="mb-4 border-border/60">
        <CardContent className="p-6 grid grid-cols-3 gap-4">
          <div><Label>Challan No</Label><Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div>
            <Label>Party</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
              <SelectContent>
                {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Items</h3>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
          </div>
          <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground px-2 mb-1">
            <div className="col-span-1">S.No</div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-3">Remark</div>
            <div className="col-span-1"></div>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                <div className="col-span-1 text-sm text-center font-medium">{i + 1}</div>
                <Input className="col-span-5" value={it.description} onChange={(e) => updItem(i, { description: e.target.value })} placeholder="Item description" />
                <Input className="col-span-2" value={it.quantity} onChange={(e) => updItem(i, { quantity: e.target.value })} placeholder="e.g. 5 pcs" />
                <Input className="col-span-3" value={it.remark} onChange={(e) => updItem(i, { remark: e.target.value })} placeholder="Optional" />
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => delItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Label>Overall Remark</Label>
            <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

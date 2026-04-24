import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Save, FileDown, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { fmtINR, nextDocNo, rateForWeight, todayISO, type PricingRule } from "@/lib/utils-bs";
import { generateBillPDF } from "@/lib/pdf";

export const Route = createFileRoute("/app/bills/$id")({
  component: BillForm,
});

type Item = { description: string; weight: number; rate: number; amount: number };
type Party = { id: string; name: string; gstin: string | null; address: string | null; phone: string | null; state: string | null };
type Settings = { company_name: string; gstin: string; address: string; phone: string; email: string; cgst_percent: number; sgst_percent: number; igst_percent: number; use_igst: boolean; signature_label: string; bill_prefix: string; challan_prefix: string };

function BillForm() {
  const { id } = useParams({ from: "/app/bills/$id" });
  const isNew = id === "new";
  const { user } = useAuth();
  const navigate = useNavigate();

  const [parties, setParties] = useState<Party[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [partyId, setPartyId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<Item[]>([{ description: "", weight: 0, rate: 0, amount: 0 }]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("unpaid");
  const [useIgst, setUseIgst] = useState(false);
  const [cgstPct, setCgstPct] = useState(0);
  const [sgstPct, setSgstPct] = useState(0);
  const [igstPct, setIgstPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [challanIds, setChallanIds] = useState<string[]>([]);

  // Pull-from-challans dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingChallans, setPendingChallans] = useState<Array<{ id: string; challan_no: string; challan_date: string; items: Array<{ description: string; quantity: string | number; remark?: string }> }>>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: r }, { data: cs }] = await Promise.all([
        supabase.from("parties").select("id,name,gstin,address,phone,state").order("name"),
        supabase.from("pricing_rules").select("*").order("min_weight"),
        supabase.from("company_settings").select("*").maybeSingle(),
      ]);
      setParties((p ?? []) as Party[]);
      setRules((r ?? []) as PricingRule[]);
      const s = cs as Settings | null;
      setSettings(s);

      if (isNew) {
        const { data: last } = await supabase.from("bills").select("bill_no").order("created_at", { ascending: false }).limit(1).maybeSingle();
        setBillNo(nextDocNo(s?.bill_prefix || "BILL", last?.bill_no ?? null));
        setUseIgst(!!s?.use_igst);
        setCgstPct(s?.use_igst ? 0 : Number(s?.cgst_percent ?? 0));
        setSgstPct(s?.use_igst ? 0 : Number(s?.sgst_percent ?? 0));
        setIgstPct(s?.use_igst ? Number(s?.igst_percent ?? 0) : 0);
      } else {
        const { data: b } = await supabase.from("bills").select("*").eq("id", id).maybeSingle();
        if (b) {
          setBillNo(b.bill_no); setDate(b.bill_date); setPartyId(b.party_id ?? "");
          setItems((b.items as unknown as Item[]) ?? []);
          setNotes(b.notes ?? ""); setStatus(b.status);
          setCgstPct(Number(b.cgst_percent)); setSgstPct(Number(b.sgst_percent)); setIgstPct(Number(b.igst_percent));
          setUseIgst(Number(b.igst_percent) > 0 && Number(b.cgst_percent) === 0);
          setChallanIds((b.challan_ids as unknown as string[]) ?? []);
        }
      }
    })();
  }, [user, id, isNew]);

  const recompute = (its: Item[]) => its.map(it => ({
    ...it,
    amount: Number((Number(it.weight || 0) * Number(it.rate || 0)).toFixed(2)),
  }));

  const updItem = (i: number, patch: Partial<Item>) => {
    const c = [...items]; c[i] = { ...c[i], ...patch };
    if (patch.weight !== undefined) {
      const auto = rateForWeight(Number(patch.weight), rules);
      if (auto > 0) c[i].rate = auto;
    }
    c[i].amount = Number((Number(c[i].weight || 0) * Number(c[i].rate || 0)).toFixed(2));
    setItems(c);
  };
  const addItem = () => setItems([...items, { description: "", weight: 0, rate: 0, amount: 0 }]);
  const delItem = (i: number) => { const c = [...items]; c.splice(i, 1); setItems(c.length ? c : [{ description: "", weight: 0, rate: 0, amount: 0 }]); };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const cgst = useIgst ? 0 : (subtotal * cgstPct) / 100;
    const sgst = useIgst ? 0 : (subtotal * sgstPct) / 100;
    const igst = useIgst ? (subtotal * igstPct) / 100 : 0;
    const total = subtotal + cgst + sgst + igst;
    return { subtotal, cgst, sgst, igst, total };
  }, [items, cgstPct, sgstPct, igstPct, useIgst]);

  const openChallanPicker = async () => {
    if (!partyId) { toast.error("Select party first"); return; }
    const { data } = await supabase.from("challans").select("id,challan_no,challan_date,items").eq("party_id", partyId).eq("billed", false).order("challan_date", { ascending: false });
    setPendingChallans((data ?? []) as typeof pendingChallans);
    setPicked(new Set());
    setPickerOpen(true);
  };

  const importChallans = () => {
    const newItems: Item[] = [];
    const ids: string[] = [];
    for (const ch of pendingChallans) {
      if (!picked.has(ch.id)) continue;
      ids.push(ch.id);
      for (const it of (ch.items ?? [])) {
        const w = parseFloat(String(it.quantity)) || 0;
        const rate = rateForWeight(w, rules);
        newItems.push({ description: it.description + (it.remark ? ` (${it.remark})` : ""), weight: w, rate, amount: Number((w * rate).toFixed(2)) });
      }
    }
    if (newItems.length === 0) { toast.error("Pick at least one challan"); return; }
    setItems([...items.filter(i => i.description.trim() || i.weight > 0), ...newItems]);
    setChallanIds(Array.from(new Set([...challanIds, ...ids])));
    setPickerOpen(false);
    toast.success(`Imported ${newItems.length} item(s)`);
  };

  const buildPayload = () => {
    const party = parties.find(p => p.id === partyId);
    const party_snapshot = party ? { name: party.name, gstin: party.gstin ?? "", address: party.address ?? "", phone: party.phone ?? "", state: party.state ?? "" } : {};
    const cleanItems = recompute(items).filter(i => i.description.trim() || i.weight > 0);
    return {
      bill_no: billNo.trim(),
      bill_date: date,
      party_id: partyId || null,
      party_snapshot,
      items: cleanItems,
      challan_ids: challanIds,
      subtotal: totals.subtotal,
      cgst_percent: useIgst ? 0 : cgstPct, sgst_percent: useIgst ? 0 : sgstPct, igst_percent: useIgst ? igstPct : 0,
      cgst_amount: totals.cgst, sgst_amount: totals.sgst, igst_amount: totals.igst,
      total: totals.total, notes, status,
    };
  };

  const save = async () => {
    if (!billNo.trim()) { toast.error("Bill number required"); return; }
    if (!partyId) { toast.error("Select a party"); return; }
    setBusy(true);
    const payload = buildPayload();
    let savedId = id;
    if (isNew) {
      const { data, error } = await supabase.from("bills").insert({ ...payload, user_id: user!.id }).select("id").single();
      if (error) { setBusy(false); toast.error(error.message); return; }
      savedId = data!.id;
      toast.success("Bill saved");
    } else {
      const { error } = await supabase.from("bills").update(payload).eq("id", id);
      if (error) { setBusy(false); toast.error(error.message); return; }
      toast.success("Bill updated");
    }
    if (challanIds.length > 0) {
      await supabase.from("challans").update({ billed: true }).in("id", challanIds);
    }
    setBusy(false);
    if (isNew) navigate({ to: "/app/bills/$id", params: { id: savedId! }, replace: true });
  };

  const saveAndPdf = async () => {
    await save();
    const p = buildPayload();
    await generateBillPDF({
      company: settings ?? { company_name: "BS Dyeing" },
      billNo: p.bill_no, date: p.bill_date, party: p.party_snapshot, items: p.items,
      subtotal: p.subtotal,
      cgst_percent: p.cgst_percent, sgst_percent: p.sgst_percent, igst_percent: p.igst_percent,
      cgst_amount: p.cgst_amount, sgst_amount: p.sgst_amount, igst_amount: p.igst_amount,
      total: p.total, notes: p.notes,
    });
  };

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title={isNew ? "New Bill" : `Bill ${billNo}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ to: "/app/bills" })}>Cancel</Button>
            <Button variant="outline" onClick={saveAndPdf}><FileDown className="h-4 w-4 mr-2" />Save & PDF</Button>
            <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90"><Save className="h-4 w-4 mr-2" />Save</Button>
          </>
        }
      />

      <Card className="mb-4 border-border/60">
        <CardContent className="p-6 grid grid-cols-4 gap-4">
          <div><Label>Bill No</Label><Input value={billNo} onChange={(e) => setBillNo(e.target.value)} /></div>
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
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 mb-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Items</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openChallanPicker}><ListPlus className="h-4 w-4 mr-1" />From Challans</Button>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Row</Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground px-2 mb-1">
            <div className="col-span-1">S.No</div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-right">Weight (kg)</div>
            <div className="col-span-2 text-right">Rate (₹/kg)</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1"></div>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                <div className="col-span-1 text-sm text-center font-medium">{i + 1}</div>
                <Input className="col-span-5" value={it.description} onChange={(e) => updItem(i, { description: e.target.value })} placeholder="Item description" />
                <Input className="col-span-2 text-right" type="number" step="0.001" value={it.weight} onChange={(e) => updItem(i, { weight: Number(e.target.value) })} />
                <Input className="col-span-2 text-right" type="number" step="0.01" value={it.rate} onChange={(e) => updItem(i, { rate: Number(e.target.value) })} />
                <div className="col-span-1 text-right font-medium text-sm">{fmtINR(it.amount)}</div>
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => delItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">💡 Rate auto-fills from your weight-based pricing rules. Edit manually if needed.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 border-border/60">
          <CardContent className="p-6">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank details, terms, thank you note…" />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-secondary/30">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="cursor-pointer flex items-center gap-2">
                <Switch checked={useIgst} onCheckedChange={setUseIgst} />
                IGST
              </Label>
            </div>
            {!useIgst ? (
              <>
                <div className="flex items-center justify-between text-sm"><span>CGST %</span><Input className="w-20 h-7 text-right" type="number" step="0.01" value={cgstPct} onChange={(e) => setCgstPct(Number(e.target.value))} /></div>
                <div className="flex items-center justify-between text-sm"><span>SGST %</span><Input className="w-20 h-7 text-right" type="number" step="0.01" value={sgstPct} onChange={(e) => setSgstPct(Number(e.target.value))} /></div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm"><span>IGST %</span><Input className="w-20 h-7 text-right" type="number" step="0.01" value={igstPct} onChange={(e) => setIgstPct(Number(e.target.value))} /></div>
            )}
            <div className="border-t border-border my-2 pt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{fmtINR(totals.subtotal)}</span></div>
              {!useIgst && <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{fmtINR(totals.cgst)}</span></div>}
              {!useIgst && <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{fmtINR(totals.sgst)}</span></div>}
              {useIgst && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span>{fmtINR(totals.igst)}</span></div>}
            </div>
            <div className="flex justify-between items-center bg-primary text-primary-foreground rounded-md px-3 py-2 mt-2">
              <span className="font-bold">TOTAL</span>
              <span className="font-bold text-lg">{fmtINR(totals.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import from Challans</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {pendingChallans.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No unbilled challans for this party.</div>}
            {pendingChallans.map(c => (
              <label key={c.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30">
                <input type="checkbox" className="mt-1" checked={picked.has(c.id)} onChange={(e) => {
                  const s = new Set(picked); if (e.target.checked) s.add(c.id); else s.delete(c.id); setPicked(s);
                }} />
                <div className="flex-1">
                  <div className="font-medium">{c.challan_no} <span className="text-xs text-muted-foreground ml-2">{c.challan_date}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">{(c.items ?? []).map(i => `${i.description} (${i.quantity})`).join(", ") || "—"}</div>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button onClick={importChallans} className="bg-primary hover:bg-primary/90">Import Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

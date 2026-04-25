import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, FileDown, Pencil, Wallet, Receipt as ReceiptIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { fmtINR, todayISO } from "@/lib/utils-bs";
import { generatePaymentReceiptPDF, generateBillGivenPDF, generatePaymentsSummaryPDF, generateBillsGivenSummaryPDF } from "@/lib/pdf";
import { NumberInput } from "@/components/NumberInput";

export const Route = createFileRoute("/app/payments")({
  component: PaymentsPage,
});

type Party = { id: string; name: string };
type PaymentRow = {
  id: string;
  payment_date: string;
  party_id: string | null;
  party_name: string;
  amount: number;
  mode: string;
  reference: string | null;
  notes: string | null;
};
type BillGivenRow = {
  id: string;
  given_date: string;
  bill_no: string;
  party_id: string | null;
  party_name: string;
  amount: number;
  notes: string | null;
};

function PaymentsPage() {
  const { user } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [billsGiven, setBillsGiven] = useState<BillGivenRow[]>([]);
  const [company, setCompany] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    const [{ data: p }, { data: pay }, { data: bg }, { data: cs }] = await Promise.all([
      supabase.from("parties").select("id,name").order("name"),
      supabase.from("payments_received").select("*").order("payment_date", { ascending: false }),
      supabase.from("bills_given").select("*").order("given_date", { ascending: false }),
      supabase.from("company_settings").select("*").maybeSingle(),
    ]);
    setParties((p ?? []) as Party[]);
    setPayments((pay ?? []) as PaymentRow[]);
    setBillsGiven((bg ?? []) as BillGivenRow[]);
    setCompany(cs as Record<string, unknown> | null);
  };
  useEffect(() => { if (user) load(); }, [user]);

  // ===== Payment Received form state =====
  const [payOpen, setPayOpen] = useState(false);
  const [payEditId, setPayEditId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(todayISO());
  const [payPartyId, setPayPartyId] = useState<string>("");
  const [payPartyName, setPayPartyName] = useState("");
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const resetPay = () => {
    setPayEditId(null); setPayDate(todayISO()); setPayPartyId(""); setPayPartyName("");
    setPayAmount(0); setPayMode("cash"); setPayRef(""); setPayNotes("");
  };
  const openNewPay = () => { resetPay(); setPayOpen(true); };
  const openEditPay = (r: PaymentRow) => {
    setPayEditId(r.id); setPayDate(r.payment_date); setPayPartyId(r.party_id ?? "");
    setPayPartyName(r.party_name); setPayAmount(Number(r.amount)); setPayMode(r.mode);
    setPayRef(r.reference ?? ""); setPayNotes(r.notes ?? ""); setPayOpen(true);
  };
  const savePay = async () => {
    const name = payPartyId ? (parties.find(p => p.id === payPartyId)?.name ?? payPartyName) : payPartyName.trim();
    if (!name) { toast.error("Party name required"); return; }
    if (!payAmount || payAmount <= 0) { toast.error("Amount must be > 0"); return; }
    const payload = {
      payment_date: payDate, party_id: payPartyId || null, party_name: name,
      amount: payAmount, mode: payMode, reference: payRef, notes: payNotes,
    };
    if (payEditId) {
      const { error } = await supabase.from("payments_received").update(payload).eq("id", payEditId);
      if (error) return toast.error(error.message);
      toast.success("Payment updated");
    } else {
      const { error } = await supabase.from("payments_received").insert({ ...payload, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Payment added");
    }
    setPayOpen(false); resetPay(); load();
  };
  const deletePay = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("payments_received").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };
  const pdfPay = async (r: PaymentRow) => {
    await generatePaymentReceiptPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      date: r.payment_date, partyName: r.party_name, amount: Number(r.amount),
      mode: r.mode, reference: r.reference ?? "", notes: r.notes ?? "",
    });
  };

  // ===== Bill Given form state =====
  const [bgOpen, setBgOpen] = useState(false);
  const [bgEditId, setBgEditId] = useState<string | null>(null);
  const [bgDate, setBgDate] = useState(todayISO());
  const [bgNo, setBgNo] = useState("");
  const [bgPartyId, setBgPartyId] = useState<string>("");
  const [bgPartyName, setBgPartyName] = useState("");
  const [bgAmount, setBgAmount] = useState<number>(0);
  const [bgNotes, setBgNotes] = useState("");

  const resetBg = () => {
    setBgEditId(null); setBgDate(todayISO()); setBgNo(""); setBgPartyId("");
    setBgPartyName(""); setBgAmount(0); setBgNotes("");
  };
  const openNewBg = () => { resetBg(); setBgOpen(true); };
  const openEditBg = (r: BillGivenRow) => {
    setBgEditId(r.id); setBgDate(r.given_date); setBgNo(r.bill_no); setBgPartyId(r.party_id ?? "");
    setBgPartyName(r.party_name); setBgAmount(Number(r.amount)); setBgNotes(r.notes ?? ""); setBgOpen(true);
  };
  const saveBg = async () => {
    const name = bgPartyId ? (parties.find(p => p.id === bgPartyId)?.name ?? bgPartyName) : bgPartyName.trim();
    if (!name) { toast.error("Party name required"); return; }
    if (!bgAmount || bgAmount <= 0) { toast.error("Amount must be > 0"); return; }
    const payload = {
      given_date: bgDate, bill_no: bgNo.trim(), party_id: bgPartyId || null, party_name: name,
      amount: bgAmount, notes: bgNotes,
    };
    if (bgEditId) {
      const { error } = await supabase.from("bills_given").update(payload).eq("id", bgEditId);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("bills_given").insert({ ...payload, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Added");
    }
    setBgOpen(false); resetBg(); load();
  };
  const deleteBg = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("bills_given").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };
  const pdfBg = async (r: BillGivenRow) => {
    await generateBillGivenPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      date: r.given_date, billNo: r.bill_no, partyName: r.party_name,
      amount: Number(r.amount), notes: r.notes ?? "",
    });
  };


  const totalReceived = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalGiven = useMemo(() => billsGiven.reduce((s, p) => s + Number(p.amount), 0), [billsGiven]);

  const exportPaymentsSummary = async () => {
    if (payments.length === 0) { toast.error("No payments to export"); return; }
    const dates = payments.map(p => p.payment_date).sort();
    await generatePaymentsSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows: payments,
      fromDate: dates[0],
      toDate: dates[dates.length - 1],
    });
  };
  const exportBillsGivenSummary = async () => {
    if (billsGiven.length === 0) { toast.error("No bills to export"); return; }
    const dates = billsGiven.map(b => b.given_date).sort();
    await generateBillsGivenSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows: billsGiven,
      fromDate: dates[0],
      toDate: dates[dates.length - 1],
    });
  };


  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader title="Manage Payments" subtitle="Track money received and bills given" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Received</div>
                <div className="text-2xl font-bold mt-1 num">{fmtINR(totalReceived)}</div>
                <div className="text-xs text-muted-foreground mt-1">{payments.length} entries</div>
              </div>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={exportPaymentsSummary}>
              <FileText className="h-4 w-4 mr-2" />Download Summary PDF
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Bills Given</div>
                <div className="text-2xl font-bold mt-1 num">{fmtINR(totalGiven)}</div>
                <div className="text-xs text-muted-foreground mt-1">{billsGiven.length} entries</div>
              </div>
              <ReceiptIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={exportBillsGivenSummary}>
              <FileText className="h-4 w-4 mr-2" />Download Summary PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="received">Payments Received</TabsTrigger>
          <TabsTrigger value="given">Bills Given</TabsTrigger>
        </TabsList>


        {/* PAYMENTS RECEIVED */}
        <TabsContent value="received" className="mt-4">
          <Card className="shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Payments Received</h3>
                <Button onClick={openNewPay}><Plus className="h-4 w-4 mr-2" />Add Payment</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Party</th>
                      <th className="p-3 font-semibold">Mode</th>
                      <th className="p-3 font-semibold">Reference</th>
                      <th className="p-3 font-semibold text-right">Amount</th>
                      <th className="p-3 font-semibold w-40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground p-8">No payments yet. Click <b>Add Payment</b>.</td></tr>
                    )}
                    {payments.map((r) => (
                      <tr key={r.id} className="border-b shadow-none hover:bg-muted/30">
                        <td className="p-3">{r.payment_date}</td>
                        <td className="p-3 font-medium">{r.party_name}</td>
                        <td className="p-3 capitalize">{r.mode}</td>
                        <td className="p-3 text-muted-foreground">{r.reference || "—"}</td>
                        <td className="p-3 text-right font-semibold">{fmtINR(Number(r.amount))}</td>
                        <td className="p-3 text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => pdfPay(r)} title="PDF"><FileDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditPay(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deletePay(r.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLS GIVEN */}
        <TabsContent value="given" className="mt-4">
          <Card className="shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Bills Given</h3>
                <Button onClick={openNewBg}><Plus className="h-4 w-4 mr-2" />Add Bill Given</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Bill No</th>
                      <th className="p-3 font-semibold">Party</th>
                      <th className="p-3 font-semibold text-right">Amount</th>
                      <th className="p-3 font-semibold">Notes</th>
                      <th className="p-3 font-semibold w-40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billsGiven.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground p-8">No entries yet. Click <b>Add Bill Given</b>.</td></tr>
                    )}
                    {billsGiven.map((r) => (
                      <tr key={r.id} className="border-b shadow-none hover:bg-muted/30">
                        <td className="p-3">{r.given_date}</td>
                        <td className="p-3 font-mono text-xs">{r.bill_no || "—"}</td>
                        <td className="p-3 font-medium">{r.party_name}</td>
                        <td className="p-3 text-right font-semibold">{fmtINR(Number(r.amount))}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-xs">{r.notes || "—"}</td>
                        <td className="p-3 text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => pdfBg(r)} title="PDF"><FileDown className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => openEditBg(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteBg(r.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={(o) => { setPayOpen(o); if (!o) resetPay(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{payEditId ? "Edit Payment" : "Add Payment Received"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
            <div>
              <Label>Mode</Label>
              <Select value={payMode} onValueChange={setPayMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Party (saved)</Label>
              <Select value={payPartyId} onValueChange={(v) => { setPayPartyId(v); setPayPartyName(parties.find(p => p.id === v)?.name ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="Pick saved party (optional)" /></SelectTrigger>
                <SelectContent>
                  {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Or type party name</Label><Input value={payPartyName} onChange={(e) => { setPayPartyName(e.target.value); setPayPartyId(""); }} placeholder="Party name" /></div>
            <div><Label>Amount (₹)</Label><NumberInput step="0.01" placeholder="0.00" value={payAmount} onChange={setPayAmount} /></div>
            <div><Label>Reference</Label><Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UPI ref / cheque no." /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={savePay}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Given dialog */}
      <Dialog open={bgOpen} onOpenChange={(o) => { setBgOpen(o); if (!o) resetBg(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{bgEditId ? "Edit Bill Given" : "Add Bill Given"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={bgDate} onChange={(e) => setBgDate(e.target.value)} /></div>
            <div><Label>Bill No</Label><Input value={bgNo} onChange={(e) => setBgNo(e.target.value)} placeholder="e.g. BILL-0021" /></div>
            <div className="col-span-2">
              <Label>Party (saved)</Label>
              <Select value={bgPartyId} onValueChange={(v) => { setBgPartyId(v); setBgPartyName(parties.find(p => p.id === v)?.name ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="Pick saved party (optional)" /></SelectTrigger>
                <SelectContent>
                  {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Or type party name</Label><Input value={bgPartyName} onChange={(e) => { setBgPartyName(e.target.value); setBgPartyId(""); }} placeholder="Party name" /></div>
            <div className="col-span-2"><Label>Amount (₹)</Label><Input type="number" step="0.01" value={bgAmount} onChange={(e) => setBgAmount(Number(e.target.value))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={bgNotes} onChange={(e) => setBgNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBgOpen(false)}>Cancel</Button>
            <Button onClick={saveBg}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

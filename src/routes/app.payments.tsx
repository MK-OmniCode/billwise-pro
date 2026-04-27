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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, FileDown, Pencil, Wallet, Receipt as ReceiptIcon, FileText, Upload, Filter, X, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { fmtINR, todayISO } from "@/lib/utils-bs";
import {
  generatePaymentReceiptPDF,
  generateBillGivenPDF,
  generatePaymentsSummaryPDF,
  generateBillsGivenSummaryPDF,
} from "@/lib/pdf-lazy";
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

// Map short codes to full party names (used in bulk import)
const PARTY_CODE_MAP: Record<string, string> = {
  M: "MALIK CARPET",
  R: "RAMISH INTERNATIONAL",
};

// Parse "DDMMYYYY" → "YYYY-MM-DD"
function parseDDMMYYYY(s: string): string | null {
  const t = s.trim();
  if (!/^\d{8}$/.test(t)) return null;
  const dd = t.slice(0, 2), mm = t.slice(2, 4), yyyy = t.slice(4, 8);
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function resolveParty(code: string): string {
  const c = code.trim().toUpperCase();
  if (PARTY_CODE_MAP[c]) return PARTY_CODE_MAP[c];
  // Underscore form: MALIK_CARPET → MALIK CARPET
  return c.replace(/_/g, " ");
}

function PaymentsPage() {
  const { user } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [billsGiven, setBillsGiven] = useState<BillGivenRow[]>([]);
  const [company, setCompany] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: pay }, { data: bg }, { data: cs }] = await Promise.all([
      supabase.from("parties").select("id,name").order("name"),
      supabase.from("payments_received").select("*").order("payment_date", { ascending: false }).limit(10000),
      supabase.from("bills_given").select("*").order("given_date", { ascending: false }).limit(10000),
      supabase.from("company_settings").select("*").maybeSingle(),
    ]);
    setParties((p ?? []) as Party[]);
    setPayments((pay ?? []) as PaymentRow[]);
    setBillsGiven((bg ?? []) as BillGivenRow[]);
    setCompany(cs as Record<string, unknown> | null);
    setLoading(false);
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

  // ===== FILTERS =====
  const ALL = "__all__";
  // Payments filters
  const [payParty, setPayParty] = useState<string>(ALL);
  const [payYear, setPayYear] = useState<string>(ALL);
  const [payMonth, setPayMonth] = useState<string>(ALL);
  const [payFrom, setPayFrom] = useState<string>("");
  const [payTo, setPayTo] = useState<string>("");
  const [paySearch, setPaySearch] = useState("");
  // Bills given filters
  const [bgParty, setBgParty] = useState<string>(ALL);
  const [bgYear, setBgYear] = useState<string>(ALL);
  const [bgMonth, setBgMonth] = useState<string>(ALL);
  const [bgFrom, setBgFrom] = useState<string>("");
  const [bgTo, setBgTo] = useState<string>("");
  const [bgSearch, setBgSearch] = useState("");

  const payYears = useMemo(() => {
    const set = new Set(payments.map(p => p.payment_date.slice(0, 4)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [payments]);
  const bgYears = useMemo(() => {
    const set = new Set(billsGiven.map(b => b.given_date.slice(0, 4)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [billsGiven]);
  const payParties = useMemo(() => Array.from(new Set(payments.map(p => p.party_name))).sort(), [payments]);
  const bgParties = useMemo(() => Array.from(new Set(billsGiven.map(b => b.party_name))).sort(), [billsGiven]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (payParty !== ALL && p.party_name !== payParty) return false;
      if (payYear !== ALL && !p.payment_date.startsWith(payYear)) return false;
      if (payMonth !== ALL && p.payment_date.slice(5, 7) !== payMonth) return false;
      if (payFrom && p.payment_date < payFrom) return false;
      if (payTo && p.payment_date > payTo) return false;
      if (paySearch) {
        const q = paySearch.toLowerCase();
        if (!p.party_name.toLowerCase().includes(q) && !(p.reference ?? "").toLowerCase().includes(q) && !(p.notes ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [payments, payParty, payYear, payMonth, payFrom, payTo, paySearch]);

  const filteredBg = useMemo(() => {
    return billsGiven.filter(b => {
      if (bgParty !== ALL && b.party_name !== bgParty) return false;
      if (bgYear !== ALL && !b.given_date.startsWith(bgYear)) return false;
      if (bgMonth !== ALL && b.given_date.slice(5, 7) !== bgMonth) return false;
      if (bgFrom && b.given_date < bgFrom) return false;
      if (bgTo && b.given_date > bgTo) return false;
      if (bgSearch) {
        const q = bgSearch.toLowerCase();
        if (!b.party_name.toLowerCase().includes(q) && !b.bill_no.toLowerCase().includes(q) && !(b.notes ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [billsGiven, bgParty, bgYear, bgMonth, bgFrom, bgTo, bgSearch]);

  const totalReceivedAll = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalGivenAll = useMemo(() => billsGiven.reduce((s, p) => s + Number(p.amount), 0), [billsGiven]);
  const totalReceivedFiltered = useMemo(() => filteredPayments.reduce((s, p) => s + Number(p.amount), 0), [filteredPayments]);
  const totalGivenFiltered = useMemo(() => filteredBg.reduce((s, p) => s + Number(p.amount), 0), [filteredBg]);

  const clearPayFilters = () => { setPayParty(ALL); setPayYear(ALL); setPayMonth(ALL); setPayFrom(""); setPayTo(""); setPaySearch(""); };
  const clearBgFilters = () => { setBgParty(ALL); setBgYear(ALL); setBgMonth(ALL); setBgFrom(""); setBgTo(""); setBgSearch(""); };

  // ===== PDF EXPORTS =====
  const exportFilteredPayments = async () => {
    if (filteredPayments.length === 0) { toast.error("No payments match filters"); return; }
    const sorted = [...filteredPayments].sort((a, b) => a.payment_date.localeCompare(b.payment_date));
    await generatePaymentsSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows: sorted,
      fromDate: sorted[0].payment_date,
      toDate: sorted[sorted.length - 1].payment_date,
    });
  };
  const exportFilteredBg = async () => {
    if (filteredBg.length === 0) { toast.error("No bills match filters"); return; }
    const sorted = [...filteredBg].sort((a, b) => a.given_date.localeCompare(b.given_date));
    await generateBillsGivenSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows: sorted,
      fromDate: sorted[0].given_date,
      toDate: sorted[sorted.length - 1].given_date,
    });
  };
  const exportYearPayments = async (year: string) => {
    const rows = payments.filter(p => p.payment_date.startsWith(year)).sort((a, b) => a.payment_date.localeCompare(b.payment_date));
    if (rows.length === 0) { toast.error(`No payments in ${year}`); return; }
    await generatePaymentsSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows, fromDate: `${year}-01-01`, toDate: `${year}-12-31`,
    });
  };
  const exportYearBg = async (year: string) => {
    const rows = billsGiven.filter(b => b.given_date.startsWith(year)).sort((a, b) => a.given_date.localeCompare(b.given_date));
    if (rows.length === 0) { toast.error(`No bills in ${year}`); return; }
    await generateBillsGivenSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows, fromDate: `${year}-01-01`, toDate: `${year}-12-31`,
    });
  };
  const exportAllPayments = async () => {
    if (payments.length === 0) { toast.error("No payments"); return; }
    const sorted = [...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date));
    await generatePaymentsSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows: sorted, fromDate: sorted[0].payment_date, toDate: sorted[sorted.length - 1].payment_date,
    });
  };
  const exportAllBg = async () => {
    if (billsGiven.length === 0) { toast.error("No bills"); return; }
    const sorted = [...billsGiven].sort((a, b) => a.given_date.localeCompare(b.given_date));
    await generateBillsGivenSummaryPDF({
      company: (company ?? { company_name: "BS Dyeing" }) as never,
      rows: sorted, fromDate: sorted[0].given_date, toDate: sorted[sorted.length - 1].given_date,
    });
  };

  // ===== BULK IMPORT =====
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState<"payments" | "bills">("payments");
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);

  const importPlaceholder = importType === "payments"
    ? "One per line. Format:  DDMMYYYY  PARTY_CODE  AMOUNT\nCodes: M = MALIK CARPET, R = RAMISH INTERNATIONAL\nExample:\n06032019 R 40000\n27102023 M 40000"
    : "One per line. Format:  DDMMYYYY  BILL_NO  PARTY_CODE  AMOUNT\nCodes: M = MALIK CARPET, R = RAMISH INTERNATIONAL (or use full name with underscores)\nExample:\n29012019 40 RAMISH_INTERNATIONAL 48603\n01032024 360 M 241950";

  const runImport = async () => {
    const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Paste some lines first"); return; }

    const errors: string[] = [];
    setImportBusy(true);

    if (importType === "payments") {
      const rows: Array<{ user_id: string; payment_date: string; party_name: string; party_id: string | null; amount: number; mode: string; reference: string; notes: string }> = [];
      lines.forEach((line, i) => {
        const parts = line.split(/\s+/);
        if (parts.length < 3) { errors.push(`L${i + 1}: need 3 columns`); return; }
        const date = parseDDMMYYYY(parts[0]);
        if (!date) { errors.push(`L${i + 1}: bad date "${parts[0]}"`); return; }
        const partyName = resolveParty(parts[1]);
        const amount = Number(parts[2]);
        if (!Number.isFinite(amount) || amount <= 0) { errors.push(`L${i + 1}: bad amount`); return; }
        const matched = parties.find(p => p.name.toUpperCase() === partyName.toUpperCase());
        rows.push({
          user_id: user!.id, payment_date: date, party_name: partyName,
          party_id: matched?.id ?? null, amount, mode: "cash", reference: "", notes: "Bulk imported",
        });
      });
      if (rows.length === 0) {
        setImportBusy(false);
        toast.error(`No valid rows. ${errors.slice(0, 3).join(" • ")}`);
        return;
      }
      // Insert in chunks of 200
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("payments_received").insert(chunk);
        if (error) { errors.push(`DB chunk ${i}: ${error.message}`); break; }
        inserted += chunk.length;
      }
      setImportBusy(false);
      toast.success(`Imported ${inserted} payments${errors.length ? ` (${errors.length} skipped)` : ""}`);
      if (errors.length) console.warn("Import errors:", errors);
      setImportOpen(false); setImportText(""); load();
    } else {
      const rows: Array<{ user_id: string; given_date: string; bill_no: string; party_name: string; party_id: string | null; amount: number; notes: string }> = [];
      lines.forEach((line, i) => {
        const parts = line.split(/\s+/);
        if (parts.length < 4) { errors.push(`L${i + 1}: need 4 columns`); return; }
        const date = parseDDMMYYYY(parts[0]);
        if (!date) { errors.push(`L${i + 1}: bad date "${parts[0]}"`); return; }
        const billNo = parts[1];
        const partyName = resolveParty(parts[2]);
        const amount = Number(parts[3]);
        if (!Number.isFinite(amount) || amount <= 0) { errors.push(`L${i + 1}: bad amount`); return; }
        const matched = parties.find(p => p.name.toUpperCase() === partyName.toUpperCase());
        rows.push({
          user_id: user!.id, given_date: date, bill_no: billNo, party_name: partyName,
          party_id: matched?.id ?? null, amount, notes: "Bulk imported",
        });
      });
      if (rows.length === 0) {
        setImportBusy(false);
        toast.error(`No valid rows. ${errors.slice(0, 3).join(" • ")}`);
        return;
      }
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("bills_given").insert(chunk);
        if (error) { errors.push(`DB chunk ${i}: ${error.message}`); break; }
        inserted += chunk.length;
      }
      setImportBusy(false);
      toast.success(`Imported ${inserted} bills${errors.length ? ` (${errors.length} skipped)` : ""}`);
      if (errors.length) console.warn("Import errors:", errors);
      setImportOpen(false); setImportText(""); load();
    }
  };

  const months = [
    { v: "01", n: "January" }, { v: "02", n: "February" }, { v: "03", n: "March" },
    { v: "04", n: "April" }, { v: "05", n: "May" }, { v: "06", n: "June" },
    { v: "07", n: "July" }, { v: "08", n: "August" }, { v: "09", n: "September" },
    { v: "10", n: "October" }, { v: "11", n: "November" }, { v: "12", n: "December" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader title="Manage Payments" subtitle="Track money received and bills given" />

      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button variant="outline" onClick={() => { setImportType("payments"); setImportOpen(true); }}>
          <Upload className="h-4 w-4 mr-2" />Bulk Import
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Received</div>
                <div className="text-2xl font-bold mt-1 num">{fmtINR(totalReceivedAll)}</div>
                <div className="text-xs text-muted-foreground mt-1">{payments.length} entries</div>
              </div>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={exportAllPayments}>
              <FileText className="h-4 w-4 mr-2" />All-time PDF
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Bills Given</div>
                <div className="text-2xl font-bold mt-1 num">{fmtINR(totalGivenAll)}</div>
                <div className="text-xs text-muted-foreground mt-1">{billsGiven.length} entries</div>
              </div>
              <ReceiptIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={exportAllBg}>
              <FileText className="h-4 w-4 mr-2" />All-time PDF
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
          <Card className="shadow-none mb-3">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />Filters
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Showing {filteredPayments.length} of {payments.length} • <b className="text-foreground">{fmtINR(totalReceivedFiltered)}</b>
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <Select value={payParty} onValueChange={setPayParty}>
                  <SelectTrigger><SelectValue placeholder="Party" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All parties</SelectItem>
                    {payParties.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={payYear} onValueChange={setPayYear}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All years</SelectItem>
                    {payYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={payMonth} onValueChange={setPayMonth}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All months</SelectItem>
                    {months.map(m => <SelectItem key={m.v} value={m.v}>{m.n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={payFrom} onChange={(e) => setPayFrom(e.target.value)} placeholder="From" />
                <Input type="date" value={payTo} onChange={(e) => setPayTo(e.target.value)} placeholder="To" />
                <Input value={paySearch} onChange={(e) => setPaySearch(e.target.value)} placeholder="Search…" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={exportFilteredPayments}>
                  <FileDown className="h-4 w-4 mr-2" />Download Filtered PDF
                </Button>
                <Button size="sm" variant="outline" onClick={clearPayFilters}>
                  <X className="h-4 w-4 mr-2" />Clear
                </Button>
                {payYears.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1 flex items-center"><CalendarRange className="h-3.5 w-3.5 mr-1" />Year PDF:</span>
                    {payYears.map(y => (
                      <Button key={y} size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => exportYearPayments(y)}>{y}</Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Payments Received</h3>
                <Button onClick={openNewPay}><Plus className="h-4 w-4 mr-2" />Add Payment</Button>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border sticky top-0">
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
                    {loading && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground p-8">Loading…</td></tr>
                    )}
                    {!loading && filteredPayments.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground p-8">
                        {payments.length === 0 ? <>No payments yet. Click <b>Add Payment</b> or <b>Bulk Import</b>.</> : "No payments match the current filters."}
                      </td></tr>
                    )}
                    {filteredPayments.map((r) => (
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
          <Card className="shadow-none mb-3">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />Filters
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  Showing {filteredBg.length} of {billsGiven.length} • <b className="text-foreground">{fmtINR(totalGivenFiltered)}</b>
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <Select value={bgParty} onValueChange={setBgParty}>
                  <SelectTrigger><SelectValue placeholder="Party" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All parties</SelectItem>
                    {bgParties.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={bgYear} onValueChange={setBgYear}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All years</SelectItem>
                    {bgYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={bgMonth} onValueChange={setBgMonth}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All months</SelectItem>
                    {months.map(m => <SelectItem key={m.v} value={m.v}>{m.n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} placeholder="From" />
                <Input type="date" value={bgTo} onChange={(e) => setBgTo(e.target.value)} placeholder="To" />
                <Input value={bgSearch} onChange={(e) => setBgSearch(e.target.value)} placeholder="Search…" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={exportFilteredBg}>
                  <FileDown className="h-4 w-4 mr-2" />Download Filtered PDF
                </Button>
                <Button size="sm" variant="outline" onClick={clearBgFilters}>
                  <X className="h-4 w-4 mr-2" />Clear
                </Button>
                {bgYears.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto flex-wrap">
                    <span className="text-xs text-muted-foreground mr-1 flex items-center"><CalendarRange className="h-3.5 w-3.5 mr-1" />Year PDF:</span>
                    {bgYears.map(y => (
                      <Button key={y} size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => exportYearBg(y)}>{y}</Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Bills Given</h3>
                <Button onClick={openNewBg}><Plus className="h-4 w-4 mr-2" />Add Bill Given</Button>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border sticky top-0">
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
                    {loading && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground p-8">Loading…</td></tr>
                    )}
                    {!loading && filteredBg.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground p-8">
                        {billsGiven.length === 0 ? <>No entries yet. Click <b>Add Bill Given</b> or <b>Bulk Import</b>.</> : "No bills match the current filters."}
                      </td></tr>
                    )}
                    {filteredBg.map((r) => (
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
            <div className="col-span-2"><Label>Amount (₹)</Label><NumberInput step="0.01" placeholder="0.00" value={bgAmount} onChange={setBgAmount} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={bgNotes} onChange={(e) => setBgNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBgOpen(false)}>Cancel</Button>
            <Button onClick={saveBg}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import</DialogTitle>
            <DialogDescription>
              Paste rows below. Use party codes <b>M = MALIK CARPET</b> and <b>R = RAMISH INTERNATIONAL</b>, or full names with underscores (e.g. <code>MALIK_CARPET</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Import into</Label>
              <Select value={importType} onValueChange={(v) => setImportType(v as "payments" | "bills")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payments">Payments Received</SelectItem>
                  <SelectItem value="bills">Bills Given</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data ({importType === "payments" ? "DDMMYYYY  CODE  AMOUNT" : "DDMMYYYY  BILL_NO  CODE  AMOUNT"})</Label>
              <Textarea
                rows={12}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={importPlaceholder}
                className="font-mono text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {importText.split(/\r?\n/).filter(l => l.trim()).length} line(s) ready to import
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importBusy}>Cancel</Button>
            <Button onClick={runImport} disabled={importBusy}>
              {importBusy ? "Importing…" : <><Upload className="h-4 w-4 mr-2" />Import</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

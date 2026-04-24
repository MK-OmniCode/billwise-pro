import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { fmtINR } from "@/lib/utils-bs";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

type Settings = {
  id?: string;
  company_name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  use_igst: boolean;
  signature_label: string;
  bill_prefix: string;
  challan_prefix: string;
};

type Rule = { id?: string; min_weight: number; max_weight: number; rate_per_kg: number; label: string; _new?: boolean };

function SettingsPage() {
  const { user } = useAuth();
  const [s, setS] = useState<Settings | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("company_settings").select("*").maybeSingle();
    if (data) setS(data as Settings);
    else {
      // create default
      const def: Settings = {
        company_name: "BS Dyeing", gstin: "", address: "", phone: "", email: "",
        cgst_percent: 2.5, sgst_percent: 2.5, igst_percent: 0, use_igst: false,
        signature_label: "For BS Dyeing", bill_prefix: "BILL", challan_prefix: "CH",
      };
      setS(def);
    }
    const { data: r } = await supabase.from("pricing_rules").select("*").order("min_weight");
    setRules((r ?? []) as Rule[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const saveSettings = async () => {
    if (!s) return;
    setSaving(true);
    const payload = { ...s, user_id: user!.id };
    const { error } = await supabase.from("company_settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    load();
  };

  const addRule = () => setRules([...rules, { min_weight: 0, max_weight: 1, rate_per_kg: 50, label: "", _new: true }]);
  const updRule = (i: number, patch: Partial<Rule>) => {
    const c = [...rules]; c[i] = { ...c[i], ...patch }; setRules(c);
  };
  const delRule = async (i: number) => {
    const r = rules[i];
    if (r.id) {
      const { error } = await supabase.from("pricing_rules").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    const c = [...rules]; c.splice(i, 1); setRules(c);
    toast.success("Rule removed");
  };
  const saveRules = async () => {
    for (const r of rules) {
      if (r.min_weight > r.max_weight) { toast.error("Min weight must be ≤ Max weight"); return; }
    }
    const toInsert = rules.filter(r => r._new).map(r => ({
      user_id: user!.id, min_weight: r.min_weight, max_weight: r.max_weight,
      rate_per_kg: r.rate_per_kg, label: r.label || "",
    }));
    const toUpdate = rules.filter(r => r.id && !r._new);
    if (toInsert.length) {
      const { error } = await supabase.from("pricing_rules").insert(toInsert);
      if (error) return toast.error(error.message);
    }
    for (const r of toUpdate) {
      const { error } = await supabase.from("pricing_rules").update({
        min_weight: r.min_weight, max_weight: r.max_weight,
        rate_per_kg: r.rate_per_kg, label: r.label || "",
      }).eq("id", r.id!);
      if (error) return toast.error(error.message);
    }
    toast.success("Pricing rules saved");
    load();
  };

  if (!s) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Settings" subtitle="Company details, taxes & pricing rules" />

      <Card className="mb-6 border-border/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Company Information</h2>
            <Button onClick={saveSettings} disabled={saving} className="bg-primary hover:bg-primary/90"><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Company Name</Label><Input value={s.company_name} onChange={(e) => setS({ ...s, company_name: e.target.value })} /></div>
            <div><Label>GSTIN</Label><Input value={s.gstin} onChange={(e) => setS({ ...s, gstin: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Textarea rows={2} value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} /></div>
            <div><Label>Signature Label</Label><Input value={s.signature_label} onChange={(e) => setS({ ...s, signature_label: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Bill Prefix</Label><Input value={s.bill_prefix} onChange={(e) => setS({ ...s, bill_prefix: e.target.value })} /></div>
              <div><Label>Challan Prefix</Label><Input value={s.challan_prefix} onChange={(e) => setS({ ...s, challan_prefix: e.target.value })} /></div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">Tax Configuration</h3>
            <div className="flex items-center gap-3 mb-4">
              <Switch checked={s.use_igst} onCheckedChange={(v) => setS({ ...s, use_igst: v })} />
              <Label className="cursor-pointer">Use IGST (inter-state) instead of CGST + SGST</Label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>CGST %</Label><Input type="number" step="0.01" value={s.cgst_percent} onChange={(e) => setS({ ...s, cgst_percent: Number(e.target.value) })} disabled={s.use_igst} /></div>
              <div><Label>SGST %</Label><Input type="number" step="0.01" value={s.sgst_percent} onChange={(e) => setS({ ...s, sgst_percent: Number(e.target.value) })} disabled={s.use_igst} /></div>
              <div><Label>IGST %</Label><Input type="number" step="0.01" value={s.igst_percent} onChange={(e) => setS({ ...s, igst_percent: Number(e.target.value) })} disabled={!s.use_igst} /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-xl font-bold">Weight-Based Pricing Rules</h2>
              <p className="text-sm text-muted-foreground">Auto-pick rate per kg based on item weight. Bills use the first matching range.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addRule}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
              <Button onClick={saveRules} className="bg-primary hover:bg-primary/90"><Save className="h-4 w-4 mr-2" />Save Rules</Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground px-2">
              <div className="col-span-2">Min Weight (kg)</div>
              <div className="col-span-2">Max Weight (kg)</div>
              <div className="col-span-3">Rate (₹/kg)</div>
              <div className="col-span-4">Label (optional)</div>
              <div className="col-span-1"></div>
            </div>
            {rules.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6 border rounded-md bg-muted/20">
                No pricing rules. Add some so bills can auto-calculate rate from weight.
              </div>
            )}
            {rules.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                <Input className="col-span-2" type="number" step="0.001" value={r.min_weight} onChange={(e) => updRule(i, { min_weight: Number(e.target.value) })} />
                <Input className="col-span-2" type="number" step="0.001" value={r.max_weight} onChange={(e) => updRule(i, { max_weight: Number(e.target.value) })} />
                <Input className="col-span-3" type="number" step="0.01" value={r.rate_per_kg} onChange={(e) => updRule(i, { rate_per_kg: Number(e.target.value) })} />
                <Input className="col-span-4" value={r.label} onChange={(e) => updRule(i, { label: e.target.value })} placeholder="e.g. Standard" />
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => delRule(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {rules.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Example: 1.5 kg → {fmtINR(rules.find(r => 1.5 >= r.min_weight && 1.5 <= r.max_weight)?.rate_per_kg ?? 0)}/kg
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

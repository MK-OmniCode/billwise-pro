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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { fmtINR, rateForWeight, type PricingRule } from "@/lib/utils-bs";
import { NumberInput } from "@/components/NumberInput";

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

type Rule = {
  id?: string;
  match_type: "between" | "equals";
  exact_weight: number;
  min_weight: number;
  max_weight: number;
  rate_per_kg: number;
  label: string;
  _new?: boolean;
};

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
    setRules(((r ?? []) as Array<Partial<Rule>>).map((x) => ({
      id: x.id,
      match_type: (x.match_type as "between" | "equals") ?? "between",
      exact_weight: Number(x.exact_weight ?? 0),
      min_weight: Number(x.min_weight ?? 0),
      max_weight: Number(x.max_weight ?? 0),
      rate_per_kg: Number(x.rate_per_kg ?? 0),
      label: x.label ?? "",
    })));
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

  const addRule = () => setRules([...rules, { match_type: "between", exact_weight: 0, min_weight: 0, max_weight: 1, rate_per_kg: 50, label: "", _new: true }]);
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
      if (r.match_type === "between" && r.min_weight > r.max_weight) {
        toast.error("Min weight must be ≤ Max weight"); return;
      }
    }
    const toRow = (r: Rule) => ({
      match_type: r.match_type,
      exact_weight: r.match_type === "equals" ? r.exact_weight : null,
      min_weight: r.match_type === "between" ? r.min_weight : 0,
      max_weight: r.match_type === "between" ? r.max_weight : 0,
      rate_per_kg: r.rate_per_kg,
      label: r.label || "",
    });
    const toInsert = rules.filter((r) => r._new).map((r) => ({ user_id: user!.id, ...toRow(r) }));
    const toUpdate = rules.filter((r) => r.id && !r._new);
    if (toInsert.length) {
      const { error } = await supabase.from("pricing_rules").insert(toInsert);
      if (error) return toast.error(error.message);
    }
    for (const r of toUpdate) {
      const { error } = await supabase.from("pricing_rules").update(toRow(r)).eq("id", r.id!);
      if (error) return toast.error(error.message);
    }
    toast.success("Pricing rules saved");
    load();
  };

  if (!s) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Settings" subtitle="Company details, taxes & pricing rules" />

      <Card className="mb-6 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Company Information</h2>
            <Button onClick={saveSettings} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}</Button>
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
              <div><Label>CGST %</Label><NumberInput step="0.01" placeholder="0" value={s.cgst_percent} onChange={(n) => setS({ ...s, cgst_percent: n })} disabled={s.use_igst} /></div>
              <div><Label>SGST %</Label><NumberInput step="0.01" placeholder="0" value={s.sgst_percent} onChange={(n) => setS({ ...s, sgst_percent: n })} disabled={s.use_igst} /></div>
              <div><Label>IGST %</Label><NumberInput step="0.01" placeholder="0" value={s.igst_percent} onChange={(n) => setS({ ...s, igst_percent: n })} disabled={!s.use_igst} /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-semibold">Weight-Based Pricing Rules</h2>
              <p className="text-sm text-muted-foreground">Auto-pick rate per kg based on item weight. Bills use the first matching range.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addRule}><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
              <Button onClick={saveRules}><Save className="h-4 w-4 mr-2" />Save Rules</Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-muted-foreground px-2">
              <div className="col-span-2">Match Type</div>
              <div className="col-span-4">Weight Condition</div>
              <div className="col-span-2">Rate (₹/kg)</div>
              <div className="col-span-3">Label</div>
              <div className="col-span-1"></div>
            </div>
            {rules.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6 border rounded-md bg-muted/20">
                No pricing rules. Add some so bills can auto-calculate rate from weight.
              </div>
            )}
            {rules.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-md">
                <div className="col-span-2">
                  <Select value={r.match_type} onValueChange={(v) => updRule(i, { match_type: v as "between" | "equals" })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="between">Between</SelectItem>
                      <SelectItem value="equals">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {r.match_type === "between" ? (
                  <div className="col-span-4 grid grid-cols-2 gap-2">
                    <NumberInput step="0.001" placeholder="Min kg" value={r.min_weight} onChange={(n) => updRule(i, { min_weight: n })} />
                    <NumberInput step="0.001" placeholder="Max kg" value={r.max_weight} onChange={(n) => updRule(i, { max_weight: n })} />
                  </div>
                ) : (
                  <div className="col-span-4">
                    <NumberInput step="0.001" placeholder="Exact kg (e.g. 5 or 3.5)" value={r.exact_weight ?? 0} onChange={(n) => updRule(i, { exact_weight: n })} />
                  </div>
                )}
                <NumberInput className="col-span-2" step="0.01" placeholder="Rate" value={r.rate_per_kg} onChange={(n) => updRule(i, { rate_per_kg: n })} />
                <Input className="col-span-3" value={r.label} onChange={(e) => updRule(i, { label: e.target.value })} placeholder="e.g. Standard" />
                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => delRule(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {rules.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p>💡 <b>Equal to</b> wins over <b>Between</b>. Decimals like <code>3.5</code> work.</p>
                <p>Test: 1.5 kg → {fmtINR(rateForWeight(1.5, rules as PricingRule[]))}/kg • 5 kg → {fmtINR(rateForWeight(5, rules as PricingRule[]))}/kg</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

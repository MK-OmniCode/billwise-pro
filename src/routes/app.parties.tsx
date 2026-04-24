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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/parties")({
  component: PartiesPage,
});

type Party = {
  id: string;
  name: string;
  gstin: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  notes: string | null;
};

function PartiesPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Party[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [form, setForm] = useState<Partial<Party>>({});

  const load = async () => {
    const { data } = await supabase.from("parties").select("*").order("name");
    setList((data ?? []) as Party[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", gstin: "", address: "", phone: "", email: "", state: "", notes: "" }); setOpen(true); };
  const openEdit = (p: Party) => { setEditing(p); setForm(p); setOpen(true); };

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name.trim(),
      gstin: form.gstin?.trim() || "",
      address: form.address?.trim() || "",
      phone: form.phone?.trim() || "",
      email: form.email?.trim() || "",
      state: form.state?.trim() || "",
      notes: form.notes?.trim() || "",
    };
    if (editing) {
      const { error } = await supabase.from("parties").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Party updated");
    } else {
      const { error } = await supabase.from("parties").insert({ ...payload, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Party added");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this party?")) return;
    const { error } = await supabase.from("parties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const filtered = list.filter((p) =>
    [p.name, p.gstin, p.phone, p.address].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Parties"
        subtitle="Customers & vendors"
        actions={<Button onClick={openNew} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Add Party</Button>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search parties…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left">
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">GSTIN</th>
                <th className="p-3 font-semibold">Phone</th>
                <th className="p-3 font-semibold">Address</th>
                <th className="p-3 font-semibold w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No parties yet.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.gstin || "—"}</td>
                  <td className="p-3 text-muted-foreground">{p.phone || "—"}</td>
                  <td className="p-3 text-muted-foreground truncate max-w-xs">{p.address || "—"}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Party" : "New Party"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name *</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>GSTIN</Label><Input value={form.gstin ?? ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-primary hover:bg-primary/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

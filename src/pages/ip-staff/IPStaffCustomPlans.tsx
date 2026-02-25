import { IPStaffLayout } from '@/components/ip-staff/IPStaffLayout';

// Re-use the existing custom plans page content but wrapped in IP Staff layout
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { Shield, Plus, Trash2, Pencil, Search, Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface CustomPlan {
  id: string;
  user_id: string;
  tier: string;
  takedowns_per_month: number;
  registry_limit: number;
  priority: boolean;
  monitoring: boolean;
  dedicated_agent: boolean;
  label: string | null;
  notes: string | null;
  assigned_by: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const defaultForm = {
  user_email: "",
  user_id: "",
  tier: "custom",
  takedowns_per_month: 5,
  registry_limit: 25,
  priority: false,
  monitoring: false,
  dedicated_agent: false,
  label: "",
  notes: "",
  expires_at: "",
};

export default function IPStaffCustomPlans() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CustomPlan | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [resolving, setResolving] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["ip-staff-custom-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ip_shield_custom_plans" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CustomPlan[];
    },
  });

  const resolveUser = async () => {
    if (!form.user_email) return;
    setResolving(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, username")
        .eq("email", form.user_email.trim())
        .single();
      if (error || !data) {
        toast.error("User not found with that email");
        return;
      }
      setForm(f => ({ ...f, user_id: data.user_id }));
      toast.success(`Found user: ${data.display_name || data.username}`);
    } finally {
      setResolving(false);
    }
  };

  const savePlan = useMutation({
    mutationFn: async () => {
      if (!form.user_id) throw new Error("Please resolve a user first");
      const payload: any = {
        user_id: form.user_id,
        tier: form.tier || "custom",
        takedowns_per_month: form.takedowns_per_month,
        registry_limit: form.registry_limit,
        priority: form.priority,
        monitoring: form.monitoring,
        dedicated_agent: form.dedicated_agent,
        label: form.label || null,
        notes: form.notes || null,
        expires_at: form.expires_at || null,
        is_active: true,
      };
      if (editingPlan) {
        const { error } = await supabase.from("ip_shield_custom_plans" as any).update(payload).eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ip_shield_custom_plans" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? "Plan updated" : "Custom plan created");
      queryClient.invalidateQueries({ queryKey: ["ip-staff-custom-plans"] });
      setShowCreate(false);
      setEditingPlan(null);
      setForm(defaultForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ip_shield_custom_plans" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan deleted");
      queryClient.invalidateQueries({ queryKey: ["ip-staff-custom-plans"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("ip_shield_custom_plans" as any).update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ip-staff-custom-plans"] }),
  });

  const openEdit = (plan: CustomPlan) => {
    setEditingPlan(plan);
    setForm({
      user_email: "",
      user_id: plan.user_id,
      tier: plan.tier,
      takedowns_per_month: plan.takedowns_per_month,
      registry_limit: plan.registry_limit,
      priority: plan.priority,
      monitoring: plan.monitoring,
      dedicated_agent: plan.dedicated_agent,
      label: plan.label || "",
      notes: plan.notes || "",
      expires_at: plan.expires_at ? plan.expires_at.split("T")[0] : "",
    });
    setShowCreate(true);
  };

  const filtered = plans?.filter(p =>
    !search || p.user_id.includes(search) || p.label?.toLowerCase().includes(search.toLowerCase()) || p.tier.includes(search)
  ) || [];

  return (
    <IPStaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" /> Custom Plans
            </h1>
            <p className="text-muted-foreground text-sm">Assign bespoke IP Shield plans to specific users</p>
          </div>
          <Button onClick={() => { setEditingPlan(null); setForm(defaultForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Create Plan
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by user ID, label, or tier..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No custom plans assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map(plan => (
              <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm">{plan.user_id.slice(0, 8)}...</span>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
                        <Badge variant="outline">{plan.label || plan.tier}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap mt-1">
                        <span>Takedowns: {plan.takedowns_per_month === -1 ? "Unlimited" : `${plan.takedowns_per_month}/mo`}</span>
                        <span>Registry: {plan.registry_limit === -1 ? "Unlimited" : plan.registry_limit}</span>
                        {plan.priority && <Badge variant="outline" className="text-[10px]">Priority</Badge>}
                        {plan.monitoring && <Badge variant="outline" className="text-[10px]">Monitoring</Badge>}
                        {plan.dedicated_agent && <Badge variant="outline" className="text-[10px]">Agent</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                        {plan.expires_at && ` · Expires ${format(new Date(plan.expires_at), "MMM d, yyyy")}`}
                      </div>
                      {plan.notes && <p className="text-xs text-muted-foreground mt-1 italic">{plan.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={plan.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: plan.id, active: checked })} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePlan.mutate(plan.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Custom Plan" : "Create Custom Plan"}</DialogTitle>
              <DialogDescription>{editingPlan ? "Update the plan settings below." : "Assign a bespoke IP Shield plan to a user."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!editingPlan && (
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <div className="flex gap-2">
                    <Input value={form.user_email} onChange={e => setForm(f => ({ ...f, user_email: e.target.value }))} placeholder="user@example.com" />
                    <Button variant="outline" onClick={resolveUser} disabled={resolving || !form.user_email}>{resolving ? "..." : "Resolve"}</Button>
                  </div>
                  {form.user_id && <p className="text-xs text-green-600">✓ User ID: {form.user_id.slice(0, 12)}...</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Label</Label>
                  <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Partner Plan" />
                </div>
                <div className="space-y-2">
                  <Label>Tier Name</Label>
                  <Input value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} placeholder="custom" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Takedowns/Month (-1 = unlimited)</Label>
                  <Input type="number" value={form.takedowns_per_month} onChange={e => setForm(f => ({ ...f, takedowns_per_month: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Registry Limit (-1 = unlimited)</Label>
                  <Input type="number" value={form.registry_limit} onChange={e => setForm(f => ({ ...f, registry_limit: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.priority} onCheckedChange={v => setForm(f => ({ ...f, priority: v }))} /><Label>Priority</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.monitoring} onCheckedChange={v => setForm(f => ({ ...f, monitoring: v }))} /><Label>Monitoring</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.dedicated_agent} onCheckedChange={v => setForm(f => ({ ...f, dedicated_agent: v }))} /><Label>Agent</Label></div>
              </div>
              <div className="space-y-2">
                <Label>Expires At (leave empty for no expiry)</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending || (!editingPlan && !form.user_id)}>
                {savePlan.isPending ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </IPStaffLayout>
  );
}

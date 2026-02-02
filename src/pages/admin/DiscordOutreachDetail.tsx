import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft, Save, ExternalLink, Users, Calendar, Hash,
  MessageSquare, CheckCircle, XCircle, Clock, Link as LinkIcon
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OutreachActivityTimeline } from "@/components/admin/OutreachActivityTimeline";

interface OutreachRecord {
  id: string;
  server_name: string;
  server_id: string | null;
  discord_invite: string | null;
  contact_name: string | null;
  contact_discord: string | null;
  member_count: number | null;
  server_type: string | null;
  status: string;
  decision: string | null;
  notes: string | null;
  contacted_at: string;
  last_followup_at: string | null;
  decided_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "contacted", label: "Contacted", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "followup", label: "Follow-up", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { value: "interested", label: "Interested", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { value: "decided", label: "Decided", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { value: "no_response", label: "No Response", color: "bg-muted text-muted-foreground" },
];

const DECISION_OPTIONS = [
  { value: "joined", label: "Joined", color: "bg-green-500/10 text-green-500" },
  { value: "declined", label: "Declined", color: "bg-red-500/10 text-red-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500/10 text-yellow-500" },
];

const SERVER_TYPES = [
  "Gaming Community",
  "Roblox Server",
  "Development Server",
  "Trading Community",
  "Content Creator",
  "Other",
];

export default function DiscordOutreachDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    server_name: "",
    server_id: "",
    discord_invite: "",
    contact_name: "",
    contact_discord: "",
    member_count: "",
    server_type: "",
    status: "contacted",
    decision: "none",
    notes: "",
  });

  const { data: record, isLoading } = useQuery({
    queryKey: ["discord-outreach-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_outreach" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as OutreachRecord;
    },
    enabled: !!id,
  });

  // Populate form when record loads
  useState(() => {
    if (record) {
      setFormData({
        server_name: record.server_name,
        server_id: record.server_id || "",
        discord_invite: record.discord_invite || "",
        contact_name: record.contact_name || "",
        contact_discord: record.contact_discord || "",
        member_count: record.member_count?.toString() || "",
        server_type: record.server_type || "",
        status: record.status,
        decision: record.decision || "none",
        notes: record.notes || "",
      });
    }
  });

  // Effect to update form when record changes
  if (record && formData.server_name === "" && record.server_name) {
    setFormData({
      server_name: record.server_name,
      server_id: record.server_id || "",
      discord_invite: record.discord_invite || "",
      contact_name: record.contact_name || "",
      contact_discord: record.contact_discord || "",
      member_count: record.member_count?.toString() || "",
      server_type: record.server_type || "",
      status: record.status,
      decision: record.decision || "none",
      notes: record.notes || "",
    });
  }

  // Helper to log activity
  const logActivity = async (
    outreachId: string,
    activityType: string,
    description?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("discord_outreach_activity" as any).insert({
      outreach_id: outreachId,
      activity_type: activityType,
      description,
      old_value: oldValue,
      new_value: newValue,
      created_by: user.user?.id,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!id || !record) throw new Error("No record to update");

      const decision = data.decision === "none" ? null : data.decision;
      const payload = {
        server_name: data.server_name,
        server_id: data.server_id || null,
        discord_invite: data.discord_invite || null,
        contact_name: data.contact_name || null,
        contact_discord: data.contact_discord || null,
        member_count: data.member_count ? parseInt(data.member_count) : null,
        server_type: data.server_type || null,
        status: data.status,
        decision,
        notes: data.notes || null,
        decided_at: decision ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("discord_outreach" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      // Log status changes
      if (record.status !== data.status) {
        const oldLabel = STATUS_OPTIONS.find(s => s.value === record.status)?.label || record.status;
        const newLabel = STATUS_OPTIONS.find(s => s.value === data.status)?.label || data.status;
        await logActivity(id, "status_change", undefined, oldLabel, newLabel);
      }

      // Log decision changes
      const oldDecision = record.decision;
      if (oldDecision !== decision) {
        if (decision) {
          const decisionLabel = DECISION_OPTIONS.find(d => d.value === decision)?.label || decision;
          await logActivity(id, "decision", `Decision: ${decisionLabel}`, oldDecision || undefined, decisionLabel);
        }
      }

      // Log follow-up if status changed to followup
      if (data.status === "followup" && record.status !== "followup") {
        await logActivity(id, "follow_up", "Follow-up recorded");
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discord-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["discord-outreach-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["outreach-activity", id] });
      toast.success("Record updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.server_name.trim()) {
      toast.error("Server name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge variant="outline" className={config?.color}>{config?.label || status}</Badge>;
  };

  const getDecisionBadge = (decision: string | null) => {
    if (!decision) return null;
    const config = DECISION_OPTIONS.find(d => d.value === decision);
    return <Badge className={config?.color}>{config?.label || decision}</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout requiredPermissions={['view_discord_outreach']}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!record) {
    return (
      <AdminLayout requiredPermissions={['view_discord_outreach']}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Record not found</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/discord-outreach")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Outreach
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredPermissions={['view_discord_outreach']}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/discord-outreach")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{record.server_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(record.status)}
                {getDecisionBadge(record.decision)}
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="font-semibold">{record.member_count?.toLocaleString() || "—"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contacted</p>
                    <p className="font-semibold text-sm">{format(new Date(record.contacted_at), "MMM d, yyyy")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Server ID</p>
                    <p className="font-semibold text-sm truncate max-w-[100px]">{record.server_id || "—"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Invite</p>
                    {record.discord_invite ? (
                      <a 
                        href={record.discord_invite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-semibold text-sm">—</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Server Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Server Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Server Name *</Label>
                    <Input
                      value={formData.server_name}
                      onChange={(e) => setFormData({ ...formData, server_name: e.target.value })}
                      placeholder="e.g., Awesome Gaming"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Server ID</Label>
                    <Input
                      value={formData.server_id}
                      onChange={(e) => setFormData({ ...formData, server_id: e.target.value })}
                      placeholder="Discord Server ID"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discord Invite Link</Label>
                  <Input
                    value={formData.discord_invite}
                    onChange={(e) => setFormData({ ...formData, discord_invite: e.target.value })}
                    placeholder="https://discord.gg/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Member Count</Label>
                    <Input
                      type="number"
                      value={formData.member_count}
                      onChange={(e) => setFormData({ ...formData, member_count: e.target.value })}
                      placeholder="Approx members"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Server Type</Label>
                    <Select value={formData.server_type} onValueChange={(v) => setFormData({ ...formData, server_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVER_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="Owner/Admin name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Discord</Label>
                    <Input
                      value={formData.contact_discord}
                      onChange={(e) => setFormData({ ...formData, contact_discord: e.target.value })}
                      placeholder="username#1234"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status & Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Decision</Label>
                    <Select value={formData.decision} onValueChange={(v) => setFormData({ ...formData, decision: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Not decided" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not decided</SelectItem>
                        {DECISION_OPTIONS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                <OutreachActivityTimeline outreachId={id!} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

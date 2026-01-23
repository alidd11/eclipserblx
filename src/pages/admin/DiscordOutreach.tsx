import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MessageSquare, Plus, Search, Users, CheckCircle, XCircle,
  Clock, Filter, Edit, Trash2, Calendar, Hash, History, AlertCircle
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function DiscordOutreach() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OutreachRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [timelineRecord, setTimelineRecord] = useState<OutreachRecord | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<OutreachRecord[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [formData, setFormData] = useState({
    server_name: "",
    server_id: "",
    discord_invite: "",
    contact_name: "",
    contact_discord: "",
    member_count: "",
    server_type: "",
    status: "contacted",
    // Radix Select disallows empty-string item values; use a sentinel for "not decided"
    decision: "none",
    notes: "",
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["discord-outreach", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("discord_outreach" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as OutreachRecord[];
    },
  });

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
    mutationFn: async (data: typeof formData & { id?: string }) => {
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

      if (data.id) {
        // Update existing record
        const { error } = await supabase
          .from("discord_outreach" as any)
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;

        // Log status changes
        if (editingRecord && editingRecord.status !== data.status) {
          const oldLabel = STATUS_OPTIONS.find(s => s.value === editingRecord.status)?.label || editingRecord.status;
          const newLabel = STATUS_OPTIONS.find(s => s.value === data.status)?.label || data.status;
          await logActivity(data.id, "status_change", undefined, oldLabel, newLabel);
        }

        // Log decision changes
        const oldDecision = editingRecord?.decision;
        if (oldDecision !== decision) {
          if (decision) {
            const decisionLabel = DECISION_OPTIONS.find(d => d.value === decision)?.label || decision;
            await logActivity(data.id, "decision", `Decision: ${decisionLabel}`, oldDecision || undefined, decisionLabel);
          }
        }

        // Log follow-up if status changed to followup
        if (data.status === "followup" && editingRecord?.status !== "followup") {
          await logActivity(data.id, "follow_up", "Follow-up recorded");
        }

        return { id: data.id, isNew: false };
      } else {
        // Create new record
        const { data: user } = await supabase.auth.getUser();
        const { data: inserted, error } = await supabase
          .from("discord_outreach" as any)
          .insert({ ...payload, created_by: user.user?.id })
          .select("id")
          .single();
        if (error) throw error;

        const newId = (inserted as any).id;
        // Log creation and initial contact
        await logActivity(newId, "created", `Added ${data.server_name} to outreach`);
        await logActivity(newId, "contacted", "Initial contact made");

        return { id: newId, isNew: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["discord-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["outreach-activity", result?.id] });
      toast.success(editingRecord ? "Record updated" : "Record added");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("discord_outreach" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discord-outreach"] });
      toast.success("Record deleted");
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
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
  };

  const openEdit = (record: OutreachRecord) => {
    setEditingRecord(record);
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
    setIsDialogOpen(true);
  };

  // Check for duplicates before submitting
  const checkForDuplicates = () => {
    if (!records || editingRecord) return []; // Skip duplicate check when editing
    
    const serverName = formData.server_name.toLowerCase().trim();
    const serverId = formData.server_id.trim();
    const discordInvite = formData.discord_invite.trim();
    
    const matches = records.filter(r => {
      // Match by server name (fuzzy)
      const nameMatch = r.server_name.toLowerCase().includes(serverName) || 
                        serverName.includes(r.server_name.toLowerCase());
      // Match by server ID (exact)
      const idMatch = serverId && r.server_id && r.server_id === serverId;
      // Match by discord invite (contains)
      const inviteMatch = discordInvite && r.discord_invite && 
                          (r.discord_invite.includes(discordInvite) || discordInvite.includes(r.discord_invite));
      
      return nameMatch || idMatch || inviteMatch;
    });
    
    return matches;
  };

  const handleSubmit = () => {
    if (!formData.server_name.trim()) {
      toast.error("Server name is required");
      return;
    }
    
    // Check for duplicates when creating new record
    if (!editingRecord) {
      const matches = checkForDuplicates();
      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setShowDuplicateWarning(true);
        return;
      }
    }
    
    saveMutation.mutate({ ...formData, id: editingRecord?.id });
  };

  const handleForceCreate = () => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    saveMutation.mutate({ ...formData, id: editingRecord?.id });
  };

  const handleOpenDuplicate = (record: OutreachRecord) => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    setIsDialogOpen(false);
    navigate(`/admin/discord-outreach/${record.id}`);
  };

  const filteredRecords = records?.filter(r =>
    r.server_name.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_discord?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: records?.length || 0,
    contacted: records?.filter(r => r.status === "contacted").length || 0,
    interested: records?.filter(r => r.status === "interested").length || 0,
    joined: records?.filter(r => r.decision === "joined").length || 0,
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

  return (
    <AdminLayout requiredRoles={["admin", "recruiter"]}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Discord Outreach</h1>
            <p className="text-muted-foreground text-sm">Track servers contacted about joining the marketplace</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Server
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <MessageSquare className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.contacted}</div>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.interested}</div>
              <p className="text-xs text-muted-foreground">Interested</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <div className="text-xl md:text-2xl font-bold">{stats.joined}</div>
              <p className="text-xs text-muted-foreground">Joined</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card className="bg-card">
          <div className="p-3 border-b border-border">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search servers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="hidden md:table-cell">Contacted</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredRecords?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No outreach records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords?.map((record) => (
                      <TableRow 
                        key={record.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/discord-outreach/${record.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.server_name}</p>
                            {record.server_type && (
                              <p className="text-xs text-muted-foreground">{record.server_type}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            {record.contact_name && <p>{record.contact_name}</p>}
                            {record.contact_discord && (
                              <p className="text-muted-foreground text-xs">{record.contact_discord}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {record.member_count?.toLocaleString() || "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>{getDecisionBadge(record.decision) || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(record.contacted_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setTimelineRecord(record)}
                              title="View timeline"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(record.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Edit Record" : "Add New Server"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingRecord ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this outreach record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Timeline Sheet */}
      <Sheet open={!!timelineRecord} onOpenChange={(open) => !open && setTimelineRecord(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity Timeline
            </SheetTitle>
            {timelineRecord && (
              <p className="text-sm text-muted-foreground">{timelineRecord.server_name}</p>
            )}
          </SheetHeader>
          <div className="mt-6">
            {timelineRecord && <OutreachActivityTimeline outreachId={timelineRecord.id} />}
          </div>
        </SheetContent>
      </Sheet>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              Potential Duplicates Found
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              We found existing records that may match the server you're trying to add. 
              Click on a record to view and update it, or create a new one anyway.
            </p>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {duplicateMatches.map((match) => (
                  <Card 
                    key={match.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleOpenDuplicate(match)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{match.server_name}</p>
                          {match.server_type && (
                            <p className="text-xs text-muted-foreground">{match.server_type}</p>
                          )}
                          {match.contact_name && (
                            <p className="text-xs text-muted-foreground mt-1">Contact: {match.contact_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {getStatusBadge(match.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(match.contacted_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDuplicateWarning(false);
                setDuplicateMatches([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={handleForceCreate}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Creating..." : "Create Anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

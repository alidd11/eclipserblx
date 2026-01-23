import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MessageSquare,
  Plus,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  FileText,
  Clock,
  Send,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  created_by: string | null;
}

interface OutreachActivityTimelineProps {
  outreachId: string;
}

const ACTIVITY_CONFIG: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  created: { icon: Plus, label: "Created", color: "text-blue-500" },
  contacted: { icon: MessageSquare, label: "Contacted", color: "text-purple-500" },
  follow_up: { icon: RefreshCw, label: "Follow-up", color: "text-orange-500" },
  status_change: { icon: ArrowRight, label: "Status Changed", color: "text-yellow-500" },
  decision: { icon: CheckCircle, label: "Decision Made", color: "text-green-500" },
  note: { icon: FileText, label: "Note", color: "text-muted-foreground" },
};

export function OutreachActivityTimeline({ outreachId }: OutreachActivityTimelineProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const { data: activities, isLoading } = useQuery({
    queryKey: ["outreach-activity", outreachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_outreach_activity" as any)
        .select("*")
        .eq("outreach_id", outreachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Activity[];
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("discord_outreach_activity" as any).insert({
        outreach_id: outreachId,
        activity_type: "note",
        description: note,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-activity", outreachId] });
      setNoteText("");
      toast.success("Note added");
    },
    onError: (error) => {
      toast.error("Failed to add note: " + error.message);
    },
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate(noteText.trim());
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Add Note Form */}
      <div className="mb-4 space-y-2">
        <Textarea
          placeholder="Add a note..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="resize-none text-sm"
          rows={2}
        />
        <Button
          size="sm"
          onClick={handleAddNote}
          disabled={!noteText.trim() || addNoteMutation.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {addNoteMutation.isPending ? "Adding..." : "Add Note"}
        </Button>
      </div>

      {!activities?.length ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No activity recorded yet</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity) => {
                const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.note;
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="relative flex gap-3 pl-0">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border ${config.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{config.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>

                      {/* Status/Decision change */}
                      {(activity.old_value || activity.new_value) && (
                        <div className="mt-1 flex items-center gap-1 text-xs">
                          {activity.old_value && (
                            <span className="text-muted-foreground">{activity.old_value}</span>
                          )}
                          {activity.old_value && activity.new_value && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          {activity.new_value && (
                            <span className="font-medium">{activity.new_value}</span>
                          )}
                        </div>
                      )}

                      {/* Description/Note */}
                      {activity.description && (
                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

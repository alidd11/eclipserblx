import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Ticket {
  id: string;
  discord_user_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  status: "open" | "claimed" | "closed";
  claimed_by: string | null;
  claimed_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  subject: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  content: string;
  is_staff_reply: boolean;
  staff_user_id: string | null;
  discord_message_id: string | null;
  attachments: { url: string; filename: string }[];
  created_at: string;
}

interface StaffProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

export default function DiscordModmail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch tickets
  const { data: tickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["discord-modmail-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_modmail_tickets" as any)
        .select("*")
        .neq("status", "closed")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data as unknown) as Ticket[];
    },
  });

  // Fetch messages for selected ticket
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["discord-modmail-messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from("discord_modmail_messages" as any)
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as unknown) as Message[];
    },
    enabled: !!selectedTicket,
  });

  // Fetch staff profiles for message attribution
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username");

      if (error) throw error;
      return data as StaffProfile[];
    },
  });

  // Real-time subscription for tickets
  useEffect(() => {
    const channel = supabase
      .channel("modmail-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discord_modmail_tickets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["discord-modmail-tickets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`modmail-messages-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discord_modmail_messages",
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["discord-modmail-messages", selectedTicket.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Claim ticket mutation
  const claimMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("discord_modmail_tickets" as any)
        .update({
          status: "claimed",
          claimed_by: user?.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discord-modmail-tickets"] });
      toast.success("Ticket claimed");
    },
    onError: (error) => {
      toast.error("Failed to claim ticket: " + error.message);
    },
  });

  // Close ticket mutation
  const closeMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("discord_modmail_tickets" as any)
        .update({
          status: "closed",
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discord-modmail-tickets"] });
      setShowCloseDialog(false);
      setSelectedTicket(null);
      toast.success("Ticket closed");
    },
    onError: (error) => {
      toast.error("Failed to close ticket: " + error.message);
    },
  });

  // Send reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const { data, error } = await supabase.functions.invoke("discord-modmail-reply", {
        body: { ticket_id: ticketId, content },
      });

      if (error) throw error;
      if (data?.error && !data?.saved_locally) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["discord-modmail-messages", selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ["discord-modmail-tickets"] });
      setReplyContent("");
      
      if (data?.saved_locally) {
        toast.warning("Reply saved but could not be sent to Discord (user may have DMs disabled)");
      } else {
        toast.success("Reply sent");
      }
    },
    onError: (error) => {
      toast.error("Failed to send reply: " + error.message);
    },
  });

  const handleSendReply = () => {
    if (!selectedTicket || !replyContent.trim()) return;
    replyMutation.mutate({ ticketId: selectedTicket.id, content: replyContent.trim() });
  };

  const getStaffName = (userId: string | null) => {
    if (!userId) return "Staff";
    const profile = staffProfiles.find((p) => p.user_id === userId);
    return profile?.display_name || profile?.username || "Staff";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Open</Badge>;
      case "claimed":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">In Progress</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">High</Badge>;
      case "normal":
        return null;
      case "low":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Low</Badge>;
      default:
        return null;
    }
  };

  const filteredTickets = tickets.filter((ticket) =>
    ticket.discord_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.discord_user_id.includes(searchQuery)
  );

  const openTickets = filteredTickets.filter((t) => t.status === "open");
  const claimedTickets = filteredTickets.filter((t) => t.status === "claimed");

  const copyDiscordId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Discord ID copied");
  };

  return (
    <AdminLayout requiredPermissions={['view_live_chat']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Discord Modmail
            </h1>
            <p className="text-muted-foreground">
              Manage customer support tickets from Discord DMs
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchTickets()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <AdminStatCard label="Open" value={openTickets.length} valueColor="green" />
          <AdminStatCard label="In Progress" value={claimedTickets.length} valueColor="blue" />
          <AdminStatCard label="Total Active" value={tickets.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <Card className="lg:col-span-1">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <CardContent className="p-0">
              <Tabs defaultValue="open" className="w-full">
                <TabsList className="w-full grid grid-cols-2 rounded-none">
                  <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
                  <TabsTrigger value="claimed">Active ({claimedTickets.length})</TabsTrigger>
                </TabsList>

                {["open", "claimed"].map((status) => (
                  <TabsContent key={status} value={status} className="m-0">
                    <ScrollArea className="h-[500px]">
                      {(status === "open" ? openTickets : claimedTickets).map(
                        (ticket) => (
                          <div
                            key={ticket.id}
                            className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedTicket?.id === ticket.id ? "bg-muted" : ""
                            }`}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={ticket.discord_avatar_url || undefined} />
                                <AvatarFallback>
                                  <User className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{ticket.discord_username}</span>
                                  {getPriorityBadge(ticket.priority)}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {ticket.subject || "No subject"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(ticket.updated_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                      {(status === "open" ? openTickets : claimedTickets).length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                          No {status} tickets
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedTicket ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedTicket.discord_avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedTicket.discord_username}
                          {getStatusBadge(selectedTicket.status)}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>ID: {selectedTicket.discord_user_id}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyDiscordId(selectedTicket.discord_user_id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedTicket.status === "open" && (
                        <Button
                          size="sm"
                          onClick={() => claimMutation.mutate(selectedTicket.id)}
                          disabled={claimMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Claim
                        </Button>
                      )}
                      {selectedTicket.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCloseDialog(true)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex flex-col h-[500px]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messagesLoading ? (
                        <div className="text-center text-muted-foreground">Loading messages...</div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-muted-foreground">No messages yet</div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.is_staff_reply ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                message.is_staff_reply
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {message.is_staff_reply && (
                                <p className="text-xs opacity-70 mb-1">
                                  {getStaffName(message.staff_user_id)}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((att, i) => (
                                    <a
                                      key={i}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      {att.filename}
                                    </a>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs opacity-50 mt-1">
                                {format(new Date(message.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Reply Input */}
                  {selectedTicket.status !== "closed" && (
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          className="min-h-[60px] resize-none"
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyContent.trim() || replyMutation.isPending}
                          className="shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="h-[600px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a ticket to view the conversation</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Close Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Ticket</DialogTitle>
              <DialogDescription>
                Are you sure you want to close this ticket? The customer will no longer be able to reply to this
                conversation.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedTicket && closeMutation.mutate(selectedTicket.id)}
                disabled={closeMutation.isPending}
              >
                Close Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

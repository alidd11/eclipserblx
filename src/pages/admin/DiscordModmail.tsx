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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  ArrowLeft,
  Zap,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIOSKeyboardFix } from "@/hooks/useIOSKeyboardFix";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { QuickResponses } from "@/components/admin/modmail/QuickResponses";

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
  const isMobile = useIsMobile();
  const { isKeyboardVisible } = useIOSKeyboardFix();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Scroll to bottom when messages change or keyboard opens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isKeyboardVisible]);

  // Handle ticket selection for mobile
  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    if (isMobile) {
      setMobileDrawerOpen(true);
    }
  };

  // Handle closing mobile drawer
  const handleCloseMobileDrawer = () => {
    setMobileDrawerOpen(false);
    // Keep the ticket selected for a moment for animation
    setTimeout(() => {
      if (!mobileDrawerOpen) {
        setSelectedTicket(null);
      }
    }, 300);
  };

  // Claim ticket mutation
  const claimMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      // Get ticket info first for notification
      const { data: ticketInfo } = await supabase
        .from("discord_modmail_tickets" as any)
        .select("discord_username, subject")
        .eq("id", ticketId)
        .single() as { data: { discord_username: string; subject: string | null } | null; error: any };

      const { error } = await supabase
        .from("discord_modmail_tickets" as any)
        .update({
          status: "claimed",
          claimed_by: user?.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Send notification to staff about the claim
      try {
        await supabase.functions.invoke("send-modmail-claim-notification", {
          body: {
            ticket_id: ticketId,
            staff_user_id: user?.id,
            discord_username: ticketInfo?.discord_username,
            subject: ticketInfo?.subject,
          },
        });
      } catch (notifyError) {
        console.error("Failed to send claim notification:", notifyError);
        // Don't fail the claim if notification fails
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discord-modmail-tickets"] });
      toast.success("Ticket claimed");
    },
    onError: (error) => {
      toast.error("Failed to claim ticket: " + error.message);
    },
  });

  // Close ticket mutation - now calls edge function to send DM notification
  const closeMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.functions.invoke("send-modmail-resolution", {
        body: { ticket_id: ticketId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["discord-modmail-tickets"] });
      setShowCloseDialog(false);
      setSelectedTicket(null);
      if (data?.dm_sent) {
        toast.success("Ticket closed and customer notified");
      } else {
        toast.success("Ticket closed (customer notification could not be sent)");
      }
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
              Discord Modmail
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage customer support tickets from Discord
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchTickets()} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <AdminStatCard label="Open" value={openTickets.length} valueColor="green" />
          <AdminStatCard label="In Progress" value={claimedTickets.length} valueColor="blue" />
          <AdminStatCard label="Total Active" value={tickets.length} />
        </div>

        {/* Mobile: Full-width ticket list, Desktop: Side-by-side layout */}
        <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Ticket List */}
          <Card className={isMobile ? '' : 'lg:col-span-1'}>
            <div className="p-2 sm:p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-base"
                />
              </div>
            </div>
            <CardContent className="p-0">
              <Tabs defaultValue="open" className="w-full">
                <TabsList className="w-full grid grid-cols-2 rounded-none h-10">
                  <TabsTrigger value="open" className="text-sm">Open ({openTickets.length})</TabsTrigger>
                  <TabsTrigger value="claimed" className="text-sm">Active ({claimedTickets.length})</TabsTrigger>
                </TabsList>

                {["open", "claimed"].map((status) => (
                  <TabsContent key={status} value={status} className="m-0">
                    <ScrollArea className="h-[400px] lg:h-[500px]">
                      {(status === "open" ? openTickets : claimedTickets).map(
                        (ticket) => (
                          <div
                            key={ticket.id}
                            className={`p-3 sm:p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted ${
                              selectedTicket?.id === ticket.id ? "bg-muted" : ""
                            }`}
                            onClick={() => handleSelectTicket(ticket)}
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                                <AvatarImage src={ticket.discord_avatar_url || undefined} />
                                <AvatarFallback>
                                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <span className="font-medium truncate text-sm sm:text-base">{ticket.discord_username}</span>
                                  {getPriorityBadge(ticket.priority)}
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  {ticket.subject || "No subject"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                  {format(new Date(ticket.updated_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                      {(status === "open" ? openTickets : claimedTickets).length === 0 && (
                        <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
                          No {status} tickets
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Chat Area - Desktop Only */}
          {!isMobile && (
          <Card className="lg:col-span-2">
            {selectedTicket ? (
              <>
                <CardHeader className="border-b py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={selectedTicket.discord_avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5 sm:h-6 sm:w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <span className="truncate">{selectedTicket.discord_username}</span>
                          {getStatusBadge(selectedTicket.status)}
                        </CardTitle>
                        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="truncate">ID: {selectedTicket.discord_user_id}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyDiscordId(selectedTicket.discord_user_id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                      {selectedTicket.status === "open" && (
                        <Button
                          size="sm"
                          onClick={() => claimMutation.mutate(selectedTicket.id)}
                          disabled={claimMutation.isPending}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Claim</span>
                        </Button>
                      )}
                      {selectedTicket.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCloseDialog(true)}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Close</span>
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
                              className={`group relative max-w-[80%] rounded-lg p-3 ${
                                message.is_staff_reply
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {/* Copy button for customer messages */}
                              {!message.is_staff_reply && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 border shadow-sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    toast.success("Message copied to clipboard");
                                  }}
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </Button>
                              )}
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
                        <div className="flex flex-col gap-2">
                          <QuickResponses
                            onSelect={(content) => setReplyContent(content)}
                            disabled={replyMutation.isPending}
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
          )}
        </div>

        {/* Mobile Chat Sheet */}
        {isMobile && (
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetContent 
              side="bottom"
              className="h-[85dvh] max-h-[85dvh] p-0 rounded-t-xl"
              style={{ 
                backgroundColor: 'hsl(var(--background))',
                paddingBottom: isKeyboardVisible ? '8px' : 'env(safe-area-inset-bottom)'
              }}
            >
              {selectedTicket && (
                <div className="flex flex-col h-full bg-background">
                  {/* Mobile Header */}
                  <SheetHeader className="border-b px-3 py-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleCloseMobileDrawer}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={selectedTicket.discord_avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <SheetTitle className="text-sm font-medium truncate text-left">
                          {selectedTicket.discord_username}
                        </SheetTitle>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(selectedTicket.status)}
                          {getPriorityBadge(selectedTicket.priority)}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {selectedTicket.status === "open" && (
                          <Button
                            size="sm"
                            onClick={() => claimMutation.mutate(selectedTicket.id)}
                            disabled={claimMutation.isPending}
                            className="h-7 px-2 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {selectedTicket.status !== "closed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCloseDialog(true)}
                            className="h-7 px-2 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 px-3 py-2">
                    <div className="space-y-3">
                      {messagesLoading ? (
                        <div className="text-center text-muted-foreground text-sm py-8">Loading messages...</div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">No messages yet</div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.is_staff_reply ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`relative max-w-[85%] rounded-lg px-3 py-2 ${
                                message.is_staff_reply
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {/* Copy button for customer messages - always visible on mobile */}
                              {!message.is_staff_reply && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-1 -right-1 h-5 w-5 bg-background/80 border shadow-sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    toast.success("Copied!");
                                  }}
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </Button>
                              )}
                              {message.is_staff_reply && (
                                <p className="text-[10px] opacity-70 mb-0.5">
                                  {getStaffName(message.staff_user_id)}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {message.attachments.map((att, i) => (
                                    <a
                                      key={i}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-[10px] underline"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                      {att.filename}
                                    </a>
                                  ))}
                                </div>
                              )}
                              <p className="text-[10px] opacity-50 mt-0.5">
                                {format(new Date(message.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Mobile Reply Input */}
                  {selectedTicket.status !== "closed" && (
                    <div 
                      className="border-t px-3 py-2 shrink-0 bg-background"
                    >
                      <div className="flex gap-2 items-end">
                        <Textarea
                          ref={textareaRef}
                          placeholder="Type your reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                          className="min-h-[44px] max-h-[160px] resize-none text-base field-sizing-content"
                          rows={1}
                        />
                        <QuickResponses
                          onSelect={(content) => setReplyContent(content)}
                          disabled={replyMutation.isPending}
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyContent.trim() || replyMutation.isPending}
                          size="icon"
                          className="h-11 w-11 shrink-0"
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Close Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Close Ticket</DialogTitle>
              <DialogDescription>
                Are you sure you want to close this ticket? The customer will no longer be able to reply to this
                conversation.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
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

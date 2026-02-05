 import { useState, useEffect, useRef } from 'react';
 import { useParams, useNavigate } from 'react-router-dom';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { Textarea } from '@/components/ui/textarea';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { ArrowLeft, Send, Clock, User, Headphones, Eye, Tag, Mail } from 'lucide-react';
 import { formatDistanceToNow, format } from 'date-fns';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 
 interface TicketMessage {
   id: string;
   ticket_id: string;
   sender_id: string | null;
   sender_type: string;
   message: string;
   is_internal_note: boolean | null;
   created_at: string;
 }
 
 interface SupportTicket {
   id: string;
   ticket_number: string | null;
   user_id: string | null;
   customer_email: string;
   subject: string;
   status: string;
   priority: string | null;
   category: string | null;
   assigned_to: string | null;
   created_at: string;
   updated_at: string;
 }
 
 const statusConfig: Record<string, { label: string; color: string }> = {
   open: { label: 'Open', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
   in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
   awaiting_customer: { label: 'Awaiting Customer', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
   resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
   closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-border' },
 };
 
 const categoryLabels: Record<string, string> = {
   order_issue: 'Order Issue',
   product_question: 'Product Question',
   technical: 'Technical',
   billing: 'Billing',
   refund: 'Refund',
   other: 'Other',
 };
 
 export default function CustomerTicketDetail() {
   const { ticketId } = useParams();
   const navigate = useNavigate();
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [newMessage, setNewMessage] = useState('');
   const [isInternalNote, setIsInternalNote] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
 
   // Fetch ticket
   const { data: ticket, isLoading: loadingTicket } = useQuery({
     queryKey: ['admin-ticket', ticketId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('support_tickets')
         .select('*')
         .eq('id', ticketId)
         .single();
       
       if (error) throw error;
       return data as SupportTicket;
     },
     enabled: !!ticketId,
   });
 
   // Fetch messages (including internal notes for staff)
   const { data: messages, isLoading: loadingMessages } = useQuery({
     queryKey: ['admin-ticket-messages', ticketId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('ticket_messages')
         .select('*')
         .eq('ticket_id', ticketId)
         .order('created_at', { ascending: true });
       
       if (error) throw error;
       return data as TicketMessage[];
     },
     enabled: !!ticketId,
   });
 
   // Fetch customer profile
   const { data: customerProfile } = useQuery({
     queryKey: ['customer-profile', ticket?.user_id],
     queryFn: async () => {
       if (!ticket?.user_id) return null;
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, display_name, avatar_url, email')
         .eq('user_id', ticket.user_id)
         .single();
       
       if (error) return null;
       return data;
     },
     enabled: !!ticket?.user_id,
   });
 
   // Subscribe to new messages
   useEffect(() => {
     if (!ticketId) return;
 
     const channel = supabase
       .channel(`admin-ticket-messages-${ticketId}`)
       .on(
         'postgres_changes',
         {
           event: 'INSERT',
           schema: 'public',
           table: 'ticket_messages',
           filter: `ticket_id=eq.${ticketId}`,
         },
         () => {
           queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticketId] });
         }
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [ticketId, queryClient]);
 
   // Scroll to bottom on new messages
   useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages]);
 
   // Send message mutation
   const sendMessage = useMutation({
     mutationFn: async ({ message, isInternal }: { message: string; isInternal: boolean }) => {
       const { error } = await supabase
         .from('ticket_messages')
         .insert({
           ticket_id: ticketId,
           sender_id: user?.id,
           sender_type: 'staff',
           message: message.trim(),
           is_internal_note: isInternal,
         });
       
       if (error) throw error;
 
       // Update ticket status
       const newStatus = isInternal ? ticket?.status : 'awaiting_customer';
       await supabase
         .from('support_tickets')
         .update({ 
           status: newStatus,
           updated_at: new Date().toISOString(),
           assigned_to: user?.id,
         })
         .eq('id', ticketId);
     },
     onSuccess: () => {
       setNewMessage('');
       setIsInternalNote(false);
       queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticketId] });
       queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
       toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
     },
     onError: () => {
       toast.error('Failed to send message');
     },
   });
 
   // Update status mutation
   const updateStatus = useMutation({
     mutationFn: async (newStatus: string) => {
       const { error } = await supabase
         .from('support_tickets')
         .update({ status: newStatus, updated_at: new Date().toISOString() })
         .eq('id', ticketId);
       
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
       toast.success('Status updated');
     },
     onError: () => {
       toast.error('Failed to update status');
     },
   });
 
   const handleSend = () => {
     if (!newMessage.trim()) return;
     sendMessage.mutate({ message: newMessage, isInternal: isInternalNote });
   };
 
   if (loadingTicket) {
     return (
       <AdminLayout>
         <div className="space-y-4">
           <Skeleton className="h-8 w-48" />
           <Skeleton className="h-64 rounded-xl" />
         </div>
       </AdminLayout>
     );
   }
 
   if (!ticket) {
     return (
       <AdminLayout>
         <div className="text-center py-12">
           <h1 className="text-2xl font-bold mb-2">Ticket not found</h1>
           <Button variant="outline" onClick={() => navigate('/admin/customer-tickets')}>
             Back to Tickets
           </Button>
         </div>
       </AdminLayout>
     );
   }
 
   const status = statusConfig[ticket.status] || statusConfig.open;
   const categoryLabel = ticket.category ? categoryLabels[ticket.category] : null;
 
   return (
     <AdminLayout>
       <div className="max-w-4xl mx-auto space-y-6">
         {/* Header */}
         <div>
           <Button
             variant="ghost"
             size="sm"
             className="mb-2 -ml-2"
             onClick={() => navigate('/admin/customer-tickets')}
           >
             <ArrowLeft className="h-4 w-4 mr-2" />
             Back to Tickets
           </Button>
 
           <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
             <div className="min-w-0">
               <div className="flex items-center gap-2 mb-1">
                 <Badge variant="outline" className="font-mono text-xs">
                   {ticket.ticket_number}
                 </Badge>
                 <Badge className={cn('text-xs', status.color)}>
                   {status.label}
                 </Badge>
                 {ticket.priority === 'high' && (
                   <Badge variant="destructive" className="text-xs">High Priority</Badge>
                 )}
               </div>
               <h1 className="text-xl font-bold">{ticket.subject}</h1>
               <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                 <span className="flex items-center gap-1">
                   <User className="h-3.5 w-3.5" />
                   {customerProfile?.display_name || ticket.customer_email}
                 </span>
                 {categoryLabel && (
                   <span className="flex items-center gap-1">
                     <Tag className="h-3.5 w-3.5" />
                     {categoryLabel}
                   </span>
                 )}
                 <span className="flex items-center gap-1">
                   <Clock className="h-3.5 w-3.5" />
                   {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                 </span>
               </div>
             </div>
 
             {/* Status Control */}
             <Select value={ticket.status} onValueChange={(v) => updateStatus.mutate(v)}>
               <SelectTrigger className="w-[180px]">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="open">Open</SelectItem>
                 <SelectItem value="in_progress">In Progress</SelectItem>
                 <SelectItem value="awaiting_customer">Awaiting Customer</SelectItem>
                 <SelectItem value="resolved">Resolved</SelectItem>
                 <SelectItem value="closed">Closed</SelectItem>
               </SelectContent>
             </Select>
           </div>
         </div>
 
         {/* Customer Info Card */}
         <Card>
           <CardHeader className="py-3">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <User className="h-4 w-4" />
               Customer Information
             </CardTitle>
           </CardHeader>
           <CardContent className="py-3">
             <div className="flex items-center gap-4">
               <Avatar className="h-12 w-12">
                 <AvatarImage src={customerProfile?.avatar_url || undefined} />
                 <AvatarFallback className="bg-primary/20 text-primary">
                   {customerProfile?.display_name?.charAt(0) || 'U'}
                 </AvatarFallback>
               </Avatar>
               <div>
                 <div className="font-medium">{customerProfile?.display_name || 'Unknown'}</div>
                 <div className="text-sm text-muted-foreground flex items-center gap-1">
                   <Mail className="h-3.5 w-3.5" />
                   {ticket.customer_email}
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Messages */}
         <Card>
           <CardHeader className="py-3">
             <CardTitle className="text-sm font-medium">Conversation</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
             {loadingMessages ? (
               <div className="space-y-4">
                 {Array.from({ length: 3 }).map((_, i) => (
                   <Skeleton key={i} className="h-16 rounded-lg" />
                 ))}
               </div>
             ) : messages?.length === 0 ? (
               <div className="text-center text-muted-foreground py-8">
                 <p>No messages yet.</p>
               </div>
             ) : (
               messages?.map((msg) => {
                 const isStaff = msg.sender_type === 'staff';
                 const isInternal = msg.is_internal_note;
 
                 return (
                   <div
                     key={msg.id}
                     className={cn(
                       'flex gap-3',
                       isStaff ? 'flex-row-reverse' : 'flex-row'
                     )}
                   >
                     <Avatar className="h-8 w-8 shrink-0">
                       {isStaff ? (
                         <AvatarFallback className="bg-green-500/20 text-green-500">
                           <Headphones className="h-4 w-4" />
                         </AvatarFallback>
                       ) : (
                         <>
                           <AvatarImage src={customerProfile?.avatar_url || undefined} />
                           <AvatarFallback className="bg-primary/20 text-primary">
                             <User className="h-4 w-4" />
                           </AvatarFallback>
                         </>
                       )}
                     </Avatar>
                     <div
                       className={cn(
                         'max-w-[75%] rounded-lg px-3 py-2',
                         isInternal
                           ? 'bg-yellow-500/10 border border-yellow-500/30'
                           : isStaff
                             ? 'bg-primary text-primary-foreground'
                             : 'bg-muted'
                       )}
                     >
                       <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                         {isInternal && <Eye className="h-3 w-3" />}
                         {isStaff ? 'Staff' : (customerProfile?.display_name || 'Customer')} •{' '}
                         {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                         {isInternal && <span className="ml-1">(Internal Note)</span>}
                       </div>
                       <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                     </div>
                   </div>
                 );
               })
             )}
             <div ref={messagesEndRef} />
           </CardContent>
         </Card>
 
         {/* Reply Input */}
         <Card>
           <CardContent className="p-4 space-y-3">
             <Textarea
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               placeholder={isInternalNote ? "Add an internal note (not visible to customer)..." : "Type your reply..."}
               className="min-h-[80px]"
             />
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Checkbox
                   id="internal"
                   checked={isInternalNote}
                   onCheckedChange={(checked) => setIsInternalNote(!!checked)}
                 />
                 <Label htmlFor="internal" className="text-sm text-muted-foreground cursor-pointer">
                   Internal note (staff only)
                 </Label>
               </div>
               <Button
                 onClick={handleSend}
                 disabled={!newMessage.trim() || sendMessage.isPending}
                 className={isInternalNote ? '' : 'gradient-button'}
                 variant={isInternalNote ? 'outline' : 'default'}
               >
                 <Send className="h-4 w-4 mr-2" />
                 {isInternalNote ? 'Add Note' : 'Send Reply'}
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     </AdminLayout>
   );
 }
 import { useState, useEffect, useRef } from 'react';
 import { useParams, useNavigate } from 'react-router-dom';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { Textarea } from '@/components/ui/textarea';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { ArrowLeft, Send, Clock, User, Headphones } from 'lucide-react';
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
   subject: string;
   status: string;
   priority: string | null;
   category: string | null;
   customer_email: string;
   created_at: string;
   updated_at: string;
 }
 
 const statusConfig: Record<string, { label: string; color: string }> = {
   open: { label: 'Open', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
   in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
   awaiting_customer: { label: 'Awaiting Reply', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
   resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
   closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-border' },
 };
 
 export default function SupportTicketDetail() {
   const { ticketId } = useParams();
   const navigate = useNavigate();
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [newMessage, setNewMessage] = useState('');
   const messagesEndRef = useRef<HTMLDivElement>(null);
 
   // Fetch ticket
   const { data: ticket, isLoading: loadingTicket } = useQuery({
     queryKey: ['support-ticket', ticketId],
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
 
   // Fetch messages
   const { data: messages, isLoading: loadingMessages } = useQuery({
     queryKey: ['ticket-messages', ticketId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('ticket_messages')
         .select('*')
         .eq('ticket_id', ticketId)
         .eq('is_internal_note', false)
         .order('created_at', { ascending: true });
       
       if (error) throw error;
       return data as TicketMessage[];
     },
     enabled: !!ticketId,
   });
 
   // Fetch staff profiles for messages
   const { data: staffProfiles } = useQuery({
     queryKey: ['staff-profiles', messages?.filter(m => m.sender_type === 'staff').map(m => m.sender_id)],
     queryFn: async () => {
       const staffIds = messages?.filter(m => m.sender_type === 'staff' && m.sender_id).map(m => m.sender_id!) || [];
       if (staffIds.length === 0) return {};
       
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, display_name, avatar_url')
         .in('user_id', staffIds);
       
       if (error) throw error;
       
       const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
       data.forEach(p => {
         map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
       });
       return map;
     },
     enabled: !!messages?.length,
   });
 
   // Subscribe to new messages
   useEffect(() => {
     if (!ticketId) return;
 
     const channel = supabase
       .channel(`ticket-messages-${ticketId}`)
       .on(
         'postgres_changes',
         {
           event: 'INSERT',
           schema: 'public',
           table: 'ticket_messages',
           filter: `ticket_id=eq.${ticketId}`,
         },
         () => {
           queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
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
     mutationFn: async (message: string) => {
       const { error } = await supabase
         .from('ticket_messages')
         .insert({
           ticket_id: ticketId,
           sender_id: user?.id,
           sender_type: 'customer',
           message: message.trim(),
           is_internal_note: false,
         });
       
       if (error) throw error;
 
       // Update ticket status and timestamp
       await supabase
         .from('support_tickets')
         .update({ 
           status: 'open',
           updated_at: new Date().toISOString() 
         })
         .eq('id', ticketId);
     },
     onSuccess: () => {
       setNewMessage('');
       queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
       queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
     },
     onError: () => {
       toast.error('Failed to send message');
     },
   });
 
   const handleSend = () => {
     if (!newMessage.trim()) return;
     sendMessage.mutate(newMessage);
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       handleSend();
     }
   };
 
   if (loadingTicket) {
     return (
       <MainLayout>
         <div className="container mx-auto px-4 py-8">
           <Skeleton className="h-8 w-48 mb-4" />
           <Skeleton className="h-64 rounded-xl" />
         </div>
       </MainLayout>
     );
   }
 
   if (!ticket) {
     return (
       <MainLayout>
         <div className="container mx-auto px-4 py-12 text-center">
           <h1 className="text-2xl font-bold mb-2">Ticket not found</h1>
           <Button variant="outline" onClick={() => navigate('/support/tickets')}>
             Back to Tickets
           </Button>
         </div>
       </MainLayout>
     );
   }
 
   const status = statusConfig[ticket.status] || statusConfig.open;
   const isTicketClosed = ticket.status === 'closed';
 
   return (
     <MainLayout>
       <div className="container mx-auto px-4 py-6 max-w-3xl">
         {/* Header */}
         <div className="mb-4">
           <Button
             variant="ghost"
             size="sm"
             className="mb-2 -ml-2"
             onClick={() => navigate('/support/tickets')}
           >
             <ArrowLeft className="h-4 w-4 mr-2" />
             Back to Tickets
           </Button>
 
           <div className="flex items-start justify-between gap-4">
             <div className="min-w-0 flex-1">
               <div className="flex items-center gap-2 mb-1">
                 <Badge variant="outline" className="text-xs shrink-0">
                   {ticket.ticket_number}
                 </Badge>
                 <Badge className={cn('text-xs shrink-0', status.color)}>
                   {status.label}
                 </Badge>
               </div>
               <h1 className="text-xl font-bold truncate">{ticket.subject}</h1>
               <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                 <Clock className="h-3 w-3" />
                 <span>Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
               </div>
             </div>
           </div>
         </div>
 
         {/* Messages */}
         <Card className="mb-4">
           <CardContent className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
             {loadingMessages ? (
               <div className="space-y-4">
                 {Array.from({ length: 3 }).map((_, i) => (
                   <Skeleton key={i} className="h-16 rounded-lg" />
                 ))}
               </div>
             ) : messages?.length === 0 ? (
               <div className="text-center text-muted-foreground py-8">
                 <p>Waiting for a response from our support team.</p>
                 <p className="text-xs mt-1">We typically respond within 24 hours.</p>
               </div>
             ) : (
               messages?.map((msg) => {
                 const isCustomer = msg.sender_type === 'customer';
                 const staffProfile = !isCustomer && msg.sender_id ? staffProfiles?.[msg.sender_id] : null;
 
                 return (
                   <div
                     key={msg.id}
                     className={cn(
                       'flex gap-3',
                       isCustomer ? 'flex-row-reverse' : 'flex-row'
                     )}
                   >
                     <Avatar className="h-8 w-8 shrink-0">
                       {isCustomer ? (
                         <>
                           <AvatarFallback className="bg-primary/20 text-primary">
                             <User className="h-4 w-4" />
                           </AvatarFallback>
                         </>
                       ) : (
                         <>
                           <AvatarImage src={staffProfile?.avatar_url || undefined} />
                           <AvatarFallback className="bg-green-500/20 text-green-500">
                             <Headphones className="h-4 w-4" />
                           </AvatarFallback>
                         </>
                       )}
                     </Avatar>
                     <div
                       className={cn(
                         'max-w-[75%] rounded-lg px-3 py-2',
                         isCustomer
                           ? 'bg-primary text-primary-foreground'
                           : 'bg-muted'
                       )}
                     >
                       <div className="text-xs opacity-70 mb-1">
                         {isCustomer ? 'You' : (staffProfile?.display_name || 'Support Team')} •{' '}
                         {format(new Date(msg.created_at), 'MMM d, h:mm a')}
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
         {!isTicketClosed ? (
           <Card>
             <CardContent className="p-3">
               <div className="flex gap-2">
                 <Textarea
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   onKeyDown={handleKeyDown}
                   placeholder="Type your reply..."
                   className="min-h-[60px] resize-none"
                 />
                 <Button
                   onClick={handleSend}
                   disabled={!newMessage.trim() || sendMessage.isPending}
                   className="shrink-0"
                 >
                   <Send className="h-4 w-4" />
                 </Button>
               </div>
             </CardContent>
           </Card>
         ) : (
           <Card className="bg-muted/50">
             <CardContent className="p-4 text-center text-muted-foreground">
               This ticket has been closed. Please create a new ticket if you need further assistance.
             </CardContent>
           </Card>
         )}
       </div>
     </MainLayout>
   );
 }
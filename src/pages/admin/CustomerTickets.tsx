 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { useNavigate } from 'react-router-dom';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Input } from '@/components/ui/input';
 import { Skeleton } from '@/components/ui/skeleton';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { 
   Search, Ticket, MessageSquare, Clock, User, ChevronRight,
   AlertCircle, CheckCircle, Filter
 } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 
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
 
 export default function CustomerTickets() {
   const { user } = useAuth();
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState<string>('all');
 
  // Fetch active tickets only (exclude resolved/closed - they go to transcripts)
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-customer-tickets', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .not('status', 'in', '("resolved","closed")')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupportTicket[];
    },
  });
 
   // Fetch customer profiles
   const { data: profiles } = useQuery({
     queryKey: ['customer-profiles', tickets?.map(t => t.user_id).filter(Boolean)],
     queryFn: async () => {
       const userIds = tickets?.map(t => t.user_id).filter(Boolean) as string[];
       if (!userIds?.length) return {};
 
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, display_name, avatar_url')
         .in('user_id', userIds);
 
       if (error) throw error;
 
       const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
       data.forEach(p => {
         map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
       });
       return map;
     },
     enabled: !!tickets?.length,
   });
 
   // Claim ticket
   const claimTicket = useMutation({
     mutationFn: async (ticketId: string) => {
       const { error } = await supabase
         .from('support_tickets')
         .update({
           assigned_to: user?.id,
           status: 'in_progress',
         })
         .eq('id', ticketId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success('Ticket claimed');
       queryClient.invalidateQueries({ queryKey: ['admin-customer-tickets'] });
     },
     onError: () => {
       toast.error('Failed to claim ticket');
     },
   });
 
   // Filter tickets by search
   const filteredTickets = tickets?.filter(ticket => {
     if (!search) return true;
     const searchLower = search.toLowerCase();
     return (
       ticket.ticket_number?.toLowerCase().includes(searchLower) ||
       ticket.subject.toLowerCase().includes(searchLower) ||
       ticket.customer_email.toLowerCase().includes(searchLower)
     );
   });
 
   // Count by status
   const openCount = tickets?.filter(t => t.status === 'open').length || 0;
   const inProgressCount = tickets?.filter(t => t.status === 'in_progress').length || 0;
   const awaitingCount = tickets?.filter(t => t.status === 'awaiting_customer').length || 0;
 
   return (
     <AdminLayout>
       <div className="space-y-6">
         {/* Header */}
         <div>
           <h1 className="text-2xl font-bold">Customer Support Tickets</h1>
           <p className="text-muted-foreground text-sm">Manage and respond to customer support requests</p>
         </div>
 
         {/* Stats */}
         <div className="grid grid-cols-3 gap-3">
           <Card>
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                   <AlertCircle className="h-5 w-5 text-yellow-500" />
                 </div>
                 <div>
                   <div className="text-2xl font-bold">{openCount}</div>
                   <div className="text-xs text-muted-foreground">Open</div>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                   <Clock className="h-5 w-5 text-blue-500" />
                 </div>
                 <div>
                   <div className="text-2xl font-bold">{inProgressCount}</div>
                   <div className="text-xs text-muted-foreground">In Progress</div>
                 </div>
               </div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                   <MessageSquare className="h-5 w-5 text-purple-500" />
                 </div>
                 <div>
                   <div className="text-2xl font-bold">{awaitingCount}</div>
                   <div className="text-xs text-muted-foreground">Awaiting</div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Filters */}
         <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search tickets..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9"
             />
           </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-full sm:w-[180px]">
               <Filter className="h-4 w-4 mr-2" />
               <SelectValue placeholder="Filter by status" />
             </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="awaiting_customer">Awaiting Customer</SelectItem>
              </SelectContent>
           </Select>
         </div>
 
         {/* Tickets List */}
         <div className="space-y-3">
           {isLoading ? (
             Array.from({ length: 5 }).map((_, i) => (
               <Skeleton key={i} className="h-24 rounded-xl" />
             ))
           ) : filteredTickets?.length === 0 ? (
             <Card className="p-8 text-center">
               <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
               <h3 className="font-semibold text-lg mb-2">No tickets found</h3>
               <p className="text-muted-foreground text-sm">
                 {search ? 'Try adjusting your search or filters' : 'No support tickets yet'}
               </p>
             </Card>
           ) : (
             filteredTickets?.map((ticket) => {
               const status = statusConfig[ticket.status] || statusConfig.open;
               const profile = ticket.user_id ? profiles?.[ticket.user_id] : null;
               const categoryLabel = ticket.category ? categoryLabels[ticket.category] : null;
 
               return (
                 <Card
                   key={ticket.id}
                   className="cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors touch-manipulation"
                   onClick={() => navigate(`/admin/customer-tickets/${ticket.id}`)}
                 >
                   <CardContent className="p-4">
                     <div className="flex items-center gap-4">
                       {/* Avatar */}
                       <Avatar className="h-10 w-10 shrink-0">
                         <AvatarImage src={profile?.avatar_url || undefined} />
                         <AvatarFallback className="bg-primary/20 text-primary">
                           <User className="h-5 w-5" />
                         </AvatarFallback>
                       </Avatar>
 
                       {/* Content */}
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <Badge variant="outline" className="text-xs font-mono shrink-0">
                             {ticket.ticket_number}
                           </Badge>
                           <Badge className={cn('text-xs shrink-0', status.color)}>
                             {status.label}
                           </Badge>
                           {ticket.priority === 'high' && (
                             <Badge variant="destructive" className="text-xs shrink-0">
                               High
                             </Badge>
                           )}
                         </div>
 
                         <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
 
                         <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                           <span>{profile?.display_name || ticket.customer_email}</span>
                           {categoryLabel && <span>• {categoryLabel}</span>}
                           <span>• {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                         </div>
                       </div>
 
                       {/* Actions */}
                       <div className="flex items-center gap-2 shrink-0">
                         {ticket.status === 'open' && !ticket.assigned_to && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={(e) => {
                               e.stopPropagation();
                               claimTicket.mutate(ticket.id);
                             }}
                           >
                             Claim
                           </Button>
                         )}
                         <ChevronRight className="h-5 w-5 text-muted-foreground" />
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               );
             })
           )}
         </div>
       </div>
     </AdminLayout>
   );
 }
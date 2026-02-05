 import { useState } from 'react';
 import { useQuery } from '@tanstack/react-query';
 import { Link } from 'react-router-dom';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Skeleton } from '@/components/ui/skeleton';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { TicketCard } from '@/components/support/TicketCard';
 import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';
 import { Plus, Ticket, MessageSquare, Clock, CheckCircle } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 
 interface SupportTicket {
   id: string;
   ticket_number: string | null;
   subject: string;
   status: string;
   priority: string | null;
   category: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export default function SupportTickets() {
   const { user } = useAuth();
   const [createDialogOpen, setCreateDialogOpen] = useState(false);
 
   const { data: tickets, isLoading, refetch } = useQuery({
     queryKey: ['my-support-tickets', user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from('support_tickets')
         .select('*')
         .eq('user_id', user.id)
         .order('created_at', { ascending: false });
       
       if (error) throw error;
       return data as SupportTicket[];
     },
     enabled: !!user,
   });
 
   // Count tickets by status
   const openCount = tickets?.filter(t => t.status === 'open').length || 0;
   const inProgressCount = tickets?.filter(t => t.status === 'in_progress').length || 0;
   const resolvedCount = tickets?.filter(t => ['resolved', 'closed'].includes(t.status)).length || 0;
 
   if (!user) {
     return (
       <MainLayout>
         <div className="container mx-auto px-4 py-12 text-center">
           <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
           <h1 className="text-2xl font-bold mb-2">Sign in to view your tickets</h1>
           <p className="text-muted-foreground mb-4">You need to be signed in to access support tickets.</p>
           <Link to="/auth">
             <Button className="gradient-button">Sign In</Button>
           </Link>
         </div>
       </MainLayout>
     );
   }
 
   return (
     <MainLayout>
       <div className="container mx-auto px-4 py-8">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
           <div>
             <h1 className="text-2xl md:text-3xl font-bold">My Support Tickets</h1>
             <p className="text-muted-foreground text-sm">Track and manage your support requests</p>
           </div>
           <Button className="gradient-button" onClick={() => setCreateDialogOpen(true)}>
             <Plus className="h-4 w-4 mr-2" />
             New Ticket
           </Button>
         </div>
 
         {/* Stats Cards */}
         <div className="grid grid-cols-3 gap-3 mb-6">
           <Card className="bg-card">
             <CardContent className="p-4 text-center">
               <MessageSquare className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
               <div className="text-2xl font-bold">{openCount}</div>
               <div className="text-xs text-muted-foreground">Open</div>
             </CardContent>
           </Card>
           <Card className="bg-card">
             <CardContent className="p-4 text-center">
               <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
               <div className="text-2xl font-bold">{inProgressCount}</div>
               <div className="text-xs text-muted-foreground">In Progress</div>
             </CardContent>
           </Card>
           <Card className="bg-card">
             <CardContent className="p-4 text-center">
               <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
               <div className="text-2xl font-bold">{resolvedCount}</div>
               <div className="text-xs text-muted-foreground">Resolved</div>
             </CardContent>
           </Card>
         </div>
 
         {/* Tickets List */}
         <div className="space-y-3">
           {isLoading ? (
             Array.from({ length: 3 }).map((_, i) => (
               <Skeleton key={i} className="h-24 rounded-xl" />
             ))
           ) : tickets?.length === 0 ? (
             <Card className="p-8 text-center">
               <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
               <h3 className="font-semibold text-lg mb-2">No tickets yet</h3>
               <p className="text-muted-foreground text-sm mb-4">
                 Need help? Submit a support ticket and our team will assist you.
               </p>
               <Button className="gradient-button" onClick={() => setCreateDialogOpen(true)}>
                 <Plus className="h-4 w-4 mr-2" />
                 Submit a Ticket
               </Button>
             </Card>
           ) : (
             tickets?.map((ticket) => (
               <TicketCard key={ticket.id} ticket={ticket} />
             ))
           )}
         </div>
 
         {/* Create Ticket Dialog */}
         <CreateTicketDialog 
           open={createDialogOpen} 
           onOpenChange={setCreateDialogOpen}
           onSuccess={() => refetch()}
         />
       </div>
     </MainLayout>
   );
 }
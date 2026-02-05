 import { Link } from 'react-router-dom';
 import { Card, CardContent } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { ChevronRight, Clock, MessageSquare, Tag } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface TicketCardProps {
   ticket: {
     id: string;
     ticket_number: string | null;
     subject: string;
     status: string;
     priority: string | null;
     category: string | null;
     created_at: string;
     updated_at: string;
   };
 }
 
 const statusConfig: Record<string, { label: string; color: string }> = {
   open: { label: 'Open', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
   in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
   awaiting_customer: { label: 'Awaiting Reply', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
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
 
 export function TicketCard({ ticket }: TicketCardProps) {
   const status = statusConfig[ticket.status] || statusConfig.open;
   const categoryLabel = ticket.category ? categoryLabels[ticket.category] || ticket.category : null;
 
   return (
     <Link to={`/support/tickets/${ticket.id}`}>
       <Card className="cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors touch-manipulation">
         <CardContent className="p-4">
           <div className="flex items-center justify-between gap-3">
             <div className="flex-1 min-w-0">
               {/* Header row with ticket number and status */}
               <div className="flex items-center gap-2 mb-1.5">
                 <Badge variant="outline" className="text-xs shrink-0 font-mono">
                   {ticket.ticket_number || 'N/A'}
                 </Badge>
                 <Badge className={cn('text-xs shrink-0', status.color)}>
                   {status.label}
                 </Badge>
                 {ticket.priority === 'high' && (
                   <Badge variant="destructive" className="text-xs shrink-0">
                     High Priority
                   </Badge>
                 )}
               </div>
 
               {/* Subject */}
               <h3 className="font-medium text-sm truncate mb-1">
                 {ticket.subject}
               </h3>
 
               {/* Meta info */}
               <div className="flex items-center gap-3 text-xs text-muted-foreground">
                 {categoryLabel && (
                   <span className="flex items-center gap-1">
                     <Tag className="h-3 w-3" />
                     {categoryLabel}
                   </span>
                 )}
                 <span className="flex items-center gap-1">
                   <Clock className="h-3 w-3" />
                   {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                 </span>
               </div>
             </div>
 
             <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
           </div>
         </CardContent>
       </Card>
     </Link>
   );
 }
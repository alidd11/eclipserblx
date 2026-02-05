 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 import { format } from 'date-fns';
 import { Banknote, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
 import { useAuth } from '@/hooks/useAuth';
 
 interface DeveloperPayment {
   id: string;
   amount: number;
   currency: string;
   payment_type: string;
   status: string;
   due_date: string | null;
   paid_date: string | null;
   payment_method: string | null;
   payment_reference: string | null;
   notes: string | null;
   created_at: string;
 }
 
 const statusConfig = {
   pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
   processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-500', icon: AlertCircle },
   completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
   failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: XCircle },
   cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: XCircle },
 };
 
 export function MyPaymentsCard() {
   const { user } = useAuth();
 
   const { data: payments, isLoading } = useQuery({
     queryKey: ['my-developer-payments', user?.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('developer_payments')
         .select('*')
         .eq('developer_id', user!.id)
         .order('created_at', { ascending: false });
       
       if (error) throw error;
       return data as DeveloperPayment[];
     },
     enabled: !!user?.id,
   });
 
   // Only show if user has payments
   if (!isLoading && (!payments || payments.length === 0)) {
     return null;
   }
 
   return (
     <Card className="max-w-full overflow-hidden">
       <CardHeader className="pb-3">
         <CardTitle className="flex items-center gap-2 text-lg">
           <Banknote className="h-4 w-4" />
           My Payments
         </CardTitle>
       </CardHeader>
       
       <CardContent>
         {isLoading ? (
           <div className="flex justify-center py-6">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
         ) : (
           <ScrollArea className="h-[300px]">
             <div className="space-y-2">
               {payments?.map((payment) => {
                 const config = statusConfig[payment.status as keyof typeof statusConfig];
                 const StatusIcon = config?.icon || Clock;
                 
                 return (
                   <div 
                     key={payment.id}
                     className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                   >
                     <div className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                       payment.status === 'completed' ? "bg-green-500/10" : "bg-yellow-500/10"
                     )}>
                       <StatusIcon className={cn(
                         "h-4 w-4",
                         payment.status === 'completed' ? "text-green-500" : "text-yellow-500"
                       )} />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-medium capitalize truncate">
                           {payment.payment_type}
                         </span>
                         <Badge className={cn("text-[10px] shrink-0", config?.color)}>
                           {config?.label}
                         </Badge>
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {payment.due_date 
                           ? `Due: ${format(new Date(payment.due_date), 'MMM d, yyyy')}`
                           : format(new Date(payment.created_at), 'MMM d, yyyy')
                         }
                         {payment.paid_date && ` • Paid: ${format(new Date(payment.paid_date), 'MMM d')}`}
                       </div>
                     </div>
                     
                     <div className={cn(
                       "font-semibold shrink-0",
                       payment.status === 'completed' ? "text-green-500" : "text-foreground"
                     )}>
                       £{payment.amount.toFixed(2)}
                     </div>
                   </div>
                 );
               })}
             </div>
           </ScrollArea>
         )}
       </CardContent>
     </Card>
   );
 }
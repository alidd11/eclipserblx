import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { format } from 'date-fns';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, CreditCard, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
 
 const statusConfig = {
   pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
   processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-500', icon: AlertCircle },
   completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
   failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: XCircle },
   cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: XCircle },
 };
 
export default function DeveloperPaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
 
   const { data: payment, isLoading } = useQuery({
     queryKey: ['developer-payment', id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('developer_payments')
         .select(`
           *,
           developer:profiles!developer_payments_developer_id_fkey(display_name, username, staff_id)
         `)
         .eq('id', id)
         .single();
       
       if (error) throw error;
       return data;
     },
     enabled: !!id,
   });
 
   const markAsPaid = useMutation({
     mutationFn: async ({ method, reference }: { method: string; reference: string }) => {
       const { error } = await supabase
         .from('developer_payments')
         .update({
           status: 'completed',
           paid_date: new Date().toISOString().split('T')[0],
           payment_method: method || null,
           payment_reference: reference || null,
         })
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['developer-payment', id] });
       queryClient.invalidateQueries({ queryKey: ['developer-payments'] });
       toast({ title: 'Payment marked as completed' });
       setIsMarkPaidOpen(false);
       setPaymentReference('');
       setPaymentMethod('');
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     },
   });
 
  if (isLoading) {
    return (
      <AdminLayout requiredRoles={['admin', 'developer']}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }
 
  if (!payment) {
    return (
      <AdminLayout requiredRoles={['admin', 'developer']}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Payment not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/developer-payments')} className="mt-4">
            Back to Payments
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Check if developer is trying to access someone else's payment
  const isOwnPayment = payment.developer_id === user?.id;
  if (!isAdmin && !isOwnPayment) {
    return (
      <AdminLayout requiredRoles={['admin', 'developer']}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have permission to view this payment</p>
          <Button variant="outline" onClick={() => navigate('/admin/developer-payments')} className="mt-4">
            Back to Payments
          </Button>
        </div>
      </AdminLayout>
    );
  }
 
   const config = statusConfig[payment.status as keyof typeof statusConfig];
   const StatusIcon = config?.icon || Clock;
 
   return (
     <AdminLayout requiredRoles={['admin', 'developer']}>
       <div className="space-y-6">
         <div className="flex items-center gap-4">
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate('/admin/developer-payments')}
             className="shrink-0"
           >
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <div className="flex-1 min-w-0">
             <h1 className="text-2xl font-bold truncate">Payment Details</h1>
             <p className="text-muted-foreground text-sm">View and manage payment information</p>
           </div>
         </div>
 
         <Card>
           <CardHeader className="pb-4">
             <div className="flex items-center justify-between flex-wrap gap-3">
               <CardTitle className="text-xl">£{payment.amount.toFixed(2)}</CardTitle>
               <Badge className={config?.color}>
                 <StatusIcon className="h-3 w-3 mr-1" />
                 {config?.label}
               </Badge>
             </div>
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="grid gap-4 sm:grid-cols-2">
               <div className="flex items-start gap-3">
                 <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                 <div>
                   <p className="text-sm text-muted-foreground">Developer</p>
                   <p className="font-medium">
                     {payment.developer?.display_name || payment.developer?.username || 'Unknown'}
                   </p>
                   {payment.developer?.staff_id && (
                     <p className="text-xs text-muted-foreground">{payment.developer.staff_id}</p>
                   )}
                 </div>
               </div>
 
               <div className="flex items-start gap-3">
                 <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                 <div>
                   <p className="text-sm text-muted-foreground">Payment Type</p>
                   <p className="font-medium capitalize">{payment.payment_type}</p>
                 </div>
               </div>
 
               <div className="flex items-start gap-3">
                 <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                 <div>
                   <p className="text-sm text-muted-foreground">Due Date</p>
                   <p className="font-medium">
                     {payment.due_date ? format(new Date(payment.due_date), 'MMM d, yyyy') : 'Not set'}
                   </p>
                 </div>
               </div>
 
               {payment.paid_date && (
                 <div className="flex items-start gap-3">
                   <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                   <div>
                     <p className="text-sm text-muted-foreground">Paid Date</p>
                     <p className="font-medium">{format(new Date(payment.paid_date), 'MMM d, yyyy')}</p>
                   </div>
                 </div>
               )}
 
               {payment.payment_method && (
                 <div className="flex items-start gap-3">
                   <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                   <div>
                     <p className="text-sm text-muted-foreground">Payment Method</p>
                     <p className="font-medium">{payment.payment_method}</p>
                   </div>
                 </div>
               )}
 
               {payment.payment_reference && (
                 <div className="flex items-start gap-3">
                   <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                   <div>
                     <p className="text-sm text-muted-foreground">Reference</p>
                     <p className="font-medium">{payment.payment_reference}</p>
                   </div>
                 </div>
               )}
             </div>
 
             {payment.notes && (
               <div className="pt-4 border-t">
                 <p className="text-sm text-muted-foreground mb-1">Notes</p>
                 <p className="text-sm">{payment.notes}</p>
               </div>
             )}
 
             <div className="pt-4 border-t text-xs text-muted-foreground">
               Created: {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
             </div>
 
              {isAdmin && (payment.status === 'pending' || payment.status === 'processing') && (
                <div className="pt-4 border-t">
                  <Button onClick={() => setIsMarkPaidOpen(true)} className="w-full sm:w-auto">
                    Mark as Paid
                  </Button>
                </div>
              )}
           </CardContent>
         </Card>
 
         <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Mark Payment as Completed</DialogTitle>
               <DialogDescription>
                 Recording payment of £{payment.amount.toFixed(2)} to{' '}
                 {payment.developer?.display_name || payment.developer?.username}
               </DialogDescription>
             </DialogHeader>
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label>Payment Method</Label>
                 <Input
                   value={paymentMethod}
                   onChange={(e) => setPaymentMethod(e.target.value)}
                   placeholder="e.g., Bank Transfer, PayPal"
                 />
               </div>
               <div className="space-y-2">
                 <Label>Payment Reference</Label>
                 <Input
                   value={paymentReference}
                   onChange={(e) => setPaymentReference(e.target.value)}
                   placeholder="e.g., Transaction ID"
                 />
               </div>
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsMarkPaidOpen(false)}>Cancel</Button>
               <Button
                 onClick={() => markAsPaid.mutate({ method: paymentMethod, reference: paymentReference })}
                 disabled={markAsPaid.isPending}
               >
                 Confirm Payment
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
     </AdminLayout>
   );
 }
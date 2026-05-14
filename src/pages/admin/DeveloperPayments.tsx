 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { toast } from 'sonner';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { formatGBP } from '@/lib/formatters';
 import { format } from '@/lib/dateUtils';
 import { Wallet, Clock, CheckCircle, XCircle, AlertCircle, Plus, CreditCard, Banknote, ChevronRight } from 'lucide-react';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface Payment {
   id: string;
   developer_id: string;
   amount: number;
   currency: string;
   payment_type: string;
   status: string;
   due_date: string | null;
   paid_date: string | null;
   payment_method: string | null;
   payment_reference: string | null;
   notes: string | null;
   created_by: string | null;
   created_at: string;
   updated_at: string;
   developer?: {
     display_name: string | null;
     username: string | null;
     staff_id: string | null;
   };
 }
 
 interface Developer {
   user_id: string;
   display_name: string | null;
   username: string | null;
   staff_id: string | null;
 }
 
 const statusConfig = {
   pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
   processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-500', icon: AlertCircle },
   completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
   failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: XCircle },
   cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: XCircle },
 };
 
 const paymentTypes = ['salary', 'commission', 'bonus', 'freelance', 'other'];
 
const safeFormatDate = (value: string | null | undefined, pattern: string) => {
  if (!value) return '—';
  try {
    return format(new Date(value), pattern);
  } catch {
    return '—';
  }
};

export default function DeveloperPayments() {
  const isInsideHub = useIsInsideHub();
  const { user } = useAuth();
  const { isAdmin, hasRole } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Developers can only see their own payments
  const isDeveloperOnly = hasRole('developer') && !isAdmin;
  
  const [newPayment, setNewPayment] = useState({
    developer_id: '',
    amount: '',
    payment_type: 'salary',
    due_date: '',
    notes: '',
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['developer-payments', isDeveloperOnly ? user?.id : 'all'],
    queryFn: async () => {
      let query = supabase
        .from('developer_payments')
        .select(`
          *,
          developer:profiles!developer_payments_developer_id_fkey(display_name, username, staff_id)
        `)
        .order('created_at', { ascending: false });
      
      // Developers only see their own payments
      if (isDeveloperOnly && user?.id) {
        query = query.eq('developer_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
  });
 
   const { data: developers } = useQuery({
     queryKey: ['staff-developers'],
     queryFn: async () => {
      // First get user_ids with developer role
      const { data: developerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'developer');
      
      if (rolesError) throw rolesError;
      if (!developerRoles?.length) return [];
      
      const developerUserIds = developerRoles.map(r => r.user_id);
      
      // Then fetch their profiles
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, display_name, username, staff_id')
        .in('user_id', developerUserIds)
         .order('display_name');
       if (error) throw error;
       return data as Developer[];
     },
   });
 
   const createPayment = useMutation({
     mutationFn: async (data: typeof newPayment) => {
       const { error } = await supabase
         .from('developer_payments')
         .insert({
           developer_id: data.developer_id,
           amount: parseFloat(data.amount),
           payment_type: data.payment_type,
           due_date: data.due_date || null,
           notes: data.notes || null,
           created_by: user?.id,
         });
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['developer-payments'] });
       toast.success('Payment record created');
       setIsAddOpen(false);
       setNewPayment({ developer_id: '', amount: '', payment_type: 'salary', due_date: '', notes: '' });
     },
     onError: (error) => {
       toast.error(error.message || 'Failed to create payment');
     },
   });
 
   const markAsPaid = useMutation({
     mutationFn: async ({ id, method, reference }: { id: string; method: string; reference: string }) => {
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
       queryClient.invalidateQueries({ queryKey: ['developer-payments'] });
       toast.success('Payment marked as completed');
       setIsMarkPaidOpen(false);
       setSelectedPayment(null);
       setPaymentReference('');
       setPaymentMethod('');
     },
     onError: (error) => {
       toast.error(error.message || 'Failed to mark as paid');
     },
   });
 
   const filteredPayments = payments?.filter(p => {
     if (activeTab === 'all') return true;
     if (activeTab === 'due') return p.status === 'pending' || p.status === 'processing';
     return p.status === activeTab;
   }) || [];
 
   const stats = {
     totalOwed: payments?.filter(p => p.status === 'pending' || p.status === 'processing')
       .reduce((sum, p) => sum + p.amount, 0) || 0,
     pendingCount: payments?.filter(p => p.status === 'pending').length || 0,
     paidThisMonth: payments?.filter(p => {
       if (p.status !== 'completed' || !p.paid_date) return false;
       const paidDate = new Date(p.paid_date);
       const now = new Date();
       return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
     }).reduce((sum, p) => sum + p.amount, 0) || 0,
   };
 
   const handleMarkPaid = (payment: Payment) => {
     setSelectedPayment(payment);
     setIsMarkPaidOpen(true);
   };
 
   return (
     <AdminLayout requiredRoles={['admin', 'developer']}>
        <div className="space-y-4">
        {!isInsideHub && (
          <AdminPageHeader
            title={isDeveloperOnly ? 'My Payments' : 'Developer Payments'}
            description={isDeveloperOnly ? 'View your payment history' : 'Track payments owed and paid to developers'}
          />
        )}
            {/* Only admins can add payments */}
            {isAdmin && !isInsideHub && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Payment Record</DialogTitle>
                    <DialogDescription>Record a new payment due to a developer</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Developer</Label>
                      <Select
                        value={newPayment.developer_id}
                        onValueChange={(v) => setNewPayment(p => ({ ...p, developer_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select developer" />
                        </SelectTrigger>
                        <SelectContent>
                          {developers?.map((dev) => (
                            <SelectItem key={dev.user_id} value={dev.user_id}>
                              {dev.display_name || dev.username} ({dev.staff_id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Amount (GBP)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newPayment.payment_type}
                          onValueChange={(v) => setNewPayment(p => ({ ...p, payment_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTypes.map((type) => (
                              <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date (optional)</Label>
                      <Input
                        type="date"
                        value={newPayment.due_date}
                        onChange={(e) => setNewPayment(p => ({ ...p, due_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={newPayment.notes}
                        onChange={(e) => setNewPayment(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Additional details..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => createPayment.mutate(newPayment)}
                      disabled={!newPayment.developer_id || !newPayment.amount || createPayment.isPending}
                    >
                      Add Payment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
 
         {!isInsideHub && (
           <div className="flex gap-3">
            <div className="border border-border rounded-xl overflow-hidden flex-1 min-w-0">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2 p-3">
                <h3 className="font-semibold text-sm text-xs font-medium truncate">Total Owed</h3>
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="p-4 p-3 pt-0">
                <div className="text-lg font-bold truncate">{formatGBP(stats.totalOwed)}</div>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden flex-1 min-w-0">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2 p-3">
                <h3 className="font-semibold text-sm text-xs font-medium truncate">Pending</h3>
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="p-4 p-3 pt-0">
                <div className="text-lg font-bold">{stats.pendingCount}</div>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden flex-1 min-w-0">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2 p-3">
                <h3 className="font-semibold text-sm text-xs font-medium truncate">This Month</h3>
                <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <div className="p-4 p-3 pt-0">
                <div className="text-lg font-bold truncate">{formatGBP(stats.paidThisMonth)}</div>
              </div>
            </div>
           </div>
         )}
 
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="hidden sm:inline-flex">
              <TabsTrigger value="due">Due</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
 
           <TabsContent value={activeTab} className="mt-6">
             {isLoading ? (
               <div className="border border-border rounded-xl overflow-hidden">
                 <div className="p-4 p-6">
                   <div className="space-y-4">
                     {[...Array(5)].map((_, i) => (
                       <Skeleton key={i} className="h-12 w-full" />
                     ))}
                   </div>
                 </div>
               </div>
             ) : filteredPayments.length === 0 ? (
               <div className="border border-border rounded-xl overflow-hidden">
                 <div className="p-4 flex flex-col items-center justify-center py-12">
                   <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                   <p className="text-muted-foreground">No payments found</p>
                 </div>
               </div>
             ) : (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => {
                    const config = statusConfig[payment.status as keyof typeof statusConfig];
                    const StatusIcon = config?.icon || Clock;
                    
                    return (
                      <div 
                        key={payment.id}
                        className="cursor-pointer active:bg-muted/50 touch-manipulation transition-colors"
                        onClick={() => navigate(`/admin/developer-payments/${payment.id}`)}
                      >
                        <div className="p-4 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold truncate">
                                  {payment.developer?.display_name || payment.developer?.username || 'Unknown'}
                                </span>
                                <Badge className={`${config?.color} shrink-0`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {config?.label}
                                </Badge>
                              </div>
                              {payment.developer?.staff_id && (
                                <p className="text-xs text-muted-foreground">{payment.developer.staff_id}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                                <span className="font-bold text-base">{formatGBP(payment.amount)}</span>
                                <span className="text-muted-foreground capitalize">{payment.payment_type}</span>
                                {payment.due_date && (
                                  <span className="text-muted-foreground">
                                    Due: {safeFormatDate(payment.due_date, 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
             )}
           </TabsContent>
         </Tabs>
 
         {/* Mark as Paid Dialog */}
         <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Mark Payment as Completed</DialogTitle>
               <DialogDescription>
                 Recording payment of {formatGBP(selectedPayment?.amount ?? 0)} to{' '}
                 {selectedPayment?.developer?.display_name || selectedPayment?.developer?.username}
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
                 onClick={() => selectedPayment && markAsPaid.mutate({
                   id: selectedPayment.id,
                   method: paymentMethod,
                   reference: paymentReference,
                 })}
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
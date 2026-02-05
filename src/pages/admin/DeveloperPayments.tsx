 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { AdminLayout } from '@/components/admin/AdminLayout';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { toast } from '@/hooks/use-toast';
 import { useAuth } from '@/hooks/useAuth';
 import { format } from 'date-fns';
 import { Wallet, Clock, CheckCircle, XCircle, AlertCircle, Plus, CreditCard, Banknote } from 'lucide-react';
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
 
 export default function DeveloperPayments() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState('pending');
   const [isAddOpen, setIsAddOpen] = useState(false);
   const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
   const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
   const [paymentReference, setPaymentReference] = useState('');
   const [paymentMethod, setPaymentMethod] = useState('');
   
   const [newPayment, setNewPayment] = useState({
     developer_id: '',
     amount: '',
     payment_type: 'salary',
     due_date: '',
     notes: '',
   });
 
   const { data: payments, isLoading } = useQuery({
     queryKey: ['developer-payments'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('developer_payments')
         .select(`
           *,
           developer:profiles!developer_payments_developer_id_fkey(display_name, username, staff_id)
         `)
         .order('created_at', { ascending: false });
       
       if (error) throw error;
       return data as Payment[];
     },
   });
 
   const { data: developers } = useQuery({
     queryKey: ['staff-developers'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, display_name, username, staff_id')
         .not('staff_id', 'is', null)
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
       toast({ title: 'Payment record created' });
       setIsAddOpen(false);
       setNewPayment({ developer_id: '', amount: '', payment_type: 'salary', due_date: '', notes: '' });
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
       toast({ title: 'Payment marked as completed' });
       setIsMarkPaidOpen(false);
       setSelectedPayment(null);
       setPaymentReference('');
       setPaymentMethod('');
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
     <AdminLayout requiredRoles={['admin']}>
       <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h1 className="text-2xl font-bold">Developer Payments</h1>
             <p className="text-muted-foreground">Track payments owed and paid to developers</p>
           </div>
           
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
         </div>
 
         {/* Summary Cards */}
         <div className="grid gap-4 md:grid-cols-3">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
               <Wallet className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">£{stats.totalOwed.toFixed(2)}</div>
               <p className="text-xs text-muted-foreground">Pending + Processing</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
               <Clock className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{stats.pendingCount}</div>
               <p className="text-xs text-muted-foreground">Awaiting payment</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
               <Banknote className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">£{stats.paidThisMonth.toFixed(2)}</div>
               <p className="text-xs text-muted-foreground">Completed payments</p>
             </CardContent>
           </Card>
         </div>
 
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList>
             <TabsTrigger value="due">Due</TabsTrigger>
             <TabsTrigger value="completed">Completed</TabsTrigger>
             <TabsTrigger value="all">All</TabsTrigger>
           </TabsList>
 
           <TabsContent value={activeTab} className="mt-6">
             {isLoading ? (
               <Card>
                 <CardContent className="p-6">
                   <div className="space-y-4">
                     {[...Array(5)].map((_, i) => (
                       <Skeleton key={i} className="h-12 w-full" />
                     ))}
                   </div>
                 </CardContent>
               </Card>
             ) : filteredPayments.length === 0 ? (
               <Card>
                 <CardContent className="flex flex-col items-center justify-center py-12">
                   <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                   <p className="text-muted-foreground">No payments found</p>
                 </CardContent>
               </Card>
             ) : (
               <Card>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Developer</TableHead>
                       <TableHead>Amount</TableHead>
                       <TableHead>Type</TableHead>
                       <TableHead>Due Date</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Reference</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredPayments.map((payment) => {
                       const config = statusConfig[payment.status as keyof typeof statusConfig];
                       const StatusIcon = config?.icon || Clock;
                       
                       return (
                         <TableRow key={payment.id}>
                           <TableCell>
                             <div>
                               <div className="font-medium">
                                 {payment.developer?.display_name || payment.developer?.username || 'Unknown'}
                               </div>
                               {payment.developer?.staff_id && (
                                 <div className="text-xs text-muted-foreground">{payment.developer.staff_id}</div>
                               )}
                             </div>
                           </TableCell>
                           <TableCell className="font-medium">
                             £{payment.amount.toFixed(2)}
                           </TableCell>
                           <TableCell className="capitalize">{payment.payment_type}</TableCell>
                           <TableCell>
                             {payment.due_date ? format(new Date(payment.due_date), 'MMM d, yyyy') : '-'}
                           </TableCell>
                           <TableCell>
                             <Badge className={config?.color}>
                               <StatusIcon className="h-3 w-3 mr-1" />
                               {config?.label}
                             </Badge>
                           </TableCell>
                           <TableCell className="text-sm text-muted-foreground">
                             {payment.payment_reference || '-'}
                           </TableCell>
                           <TableCell className="text-right">
                             {(payment.status === 'pending' || payment.status === 'processing') && (
                               <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleMarkPaid(payment)}
                               >
                                 Mark Paid
                               </Button>
                             )}
                           </TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </Card>
             )}
           </TabsContent>
         </Tabs>
 
         {/* Mark as Paid Dialog */}
         <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Mark Payment as Completed</DialogTitle>
               <DialogDescription>
                 Recording payment of £{selectedPayment?.amount.toFixed(2)} to{' '}
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
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
 import { toast } from '@/hooks/use-toast';
 import { useAdminAuth } from '@/hooks/useAdminAuth';
 import { useAuth } from '@/hooks/useAuth';
 import { format } from 'date-fns';
 import { Package, Clock, CheckCircle, XCircle, AlertCircle, Plus, Eye } from 'lucide-react';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface Submission {
   id: string;
   developer_id: string;
   product_name: string;
   product_description: string | null;
   category_id: string | null;
   price: number;
   files: any;
   status: string;
   reviewer_id: string | null;
   reviewer_notes: string | null;
   approved_product_id: string | null;
   created_at: string;
   updated_at: string;
   developer?: {
     display_name: string | null;
     username: string | null;
     staff_id: string | null;
   };
   category?: {
     name: string;
   };
 }
 
 const statusConfig = {
   pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
   approved: { label: 'Approved', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
   rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-500', icon: XCircle },
   revision_requested: { label: 'Revision', color: 'bg-orange-500/10 text-orange-500', icon: AlertCircle },
 };
 
 export default function DeveloperSubmissions() {
   const { user } = useAuth();
   const { isAdmin } = useAdminAuth();
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState('all');
   const [isSubmitOpen, setIsSubmitOpen] = useState(false);
   const [isReviewOpen, setIsReviewOpen] = useState(false);
   const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
   const [reviewNotes, setReviewNotes] = useState('');
   
   // Form state for new submission
   const [newSubmission, setNewSubmission] = useState({
     product_name: '',
     product_description: '',
     category_id: '',
     price: '',
   });
 
   const { data: submissions, isLoading } = useQuery({
     queryKey: ['developer-submissions'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('developer_product_submissions')
         .select(`
           *,
           developer:profiles!developer_product_submissions_developer_id_fkey(display_name, username, staff_id),
           category:categories(name)
         `)
         .order('created_at', { ascending: false });
       
       if (error) throw error;
       return data as Submission[];
     },
   });
 
   const { data: categories } = useQuery({
     queryKey: ['categories'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('categories')
         .select('id, name')
         .order('name');
       if (error) throw error;
       return data;
     },
   });
 
   const createSubmission = useMutation({
     mutationFn: async (data: typeof newSubmission) => {
       const { error } = await supabase
         .from('developer_product_submissions')
         .insert({
           developer_id: user?.id,
           product_name: data.product_name,
           product_description: data.product_description || null,
           category_id: data.category_id || null,
           price: parseFloat(data.price) || 0,
         });
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['developer-submissions'] });
       toast({ title: 'Submission created', description: 'Your product has been submitted for review.' });
       setIsSubmitOpen(false);
       setNewSubmission({ product_name: '', product_description: '', category_id: '', price: '' });
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     },
   });
 
   const updateSubmission = useMutation({
     mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
       const { error } = await supabase
         .from('developer_product_submissions')
         .update({
           status,
           reviewer_id: user?.id,
           reviewer_notes: notes || null,
         })
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['developer-submissions'] });
       toast({ title: 'Submission updated' });
       setIsReviewOpen(false);
       setSelectedSubmission(null);
       setReviewNotes('');
     },
     onError: (error) => {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     },
   });
 
   const filteredSubmissions = submissions?.filter(s => 
     activeTab === 'all' || s.status === activeTab
   ) || [];
 
   const counts = {
     all: submissions?.length || 0,
     pending: submissions?.filter(s => s.status === 'pending').length || 0,
     approved: submissions?.filter(s => s.status === 'approved').length || 0,
     rejected: submissions?.filter(s => s.status === 'rejected').length || 0,
   };
 
   const handleReview = (submission: Submission) => {
     setSelectedSubmission(submission);
     setReviewNotes(submission.reviewer_notes || '');
     setIsReviewOpen(true);
   };
 
   return (
     <AdminLayout requiredPermissions={['manage_developer_submissions']}>
       <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h1 className="text-2xl font-bold">Developer Submissions</h1>
             <p className="text-muted-foreground">Manage internal product submissions</p>
           </div>
           
           <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
             <DialogTrigger asChild>
               <Button>
                 <Plus className="h-4 w-4 mr-2" />
                 Submit Product
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Submit New Product</DialogTitle>
                 <DialogDescription>Submit a product for admin review</DialogDescription>
               </DialogHeader>
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>Product Name</Label>
                   <Input
                     value={newSubmission.product_name}
                     onChange={(e) => setNewSubmission(p => ({ ...p, product_name: e.target.value }))}
                     placeholder="Enter product name"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Description</Label>
                   <Textarea
                     value={newSubmission.product_description}
                     onChange={(e) => setNewSubmission(p => ({ ...p, product_description: e.target.value }))}
                     placeholder="Describe the product"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Category</Label>
                   <Select
                     value={newSubmission.category_id}
                     onValueChange={(v) => setNewSubmission(p => ({ ...p, category_id: v }))}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select category" />
                     </SelectTrigger>
                     <SelectContent>
                       {categories?.map((cat) => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label>Price (GBP)</Label>
                   <Input
                     type="number"
                     step="0.01"
                     min="0"
                     value={newSubmission.price}
                     onChange={(e) => setNewSubmission(p => ({ ...p, price: e.target.value }))}
                     placeholder="0.00"
                   />
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>Cancel</Button>
                 <Button
                   onClick={() => createSubmission.mutate(newSubmission)}
                   disabled={!newSubmission.product_name || createSubmission.isPending}
                 >
                   Submit for Review
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </div>
 
         <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList>
             <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
             <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
             <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
             <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
           </TabsList>
 
           <TabsContent value={activeTab} className="mt-6">
             {isLoading ? (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {[...Array(6)].map((_, i) => (
                   <Card key={i}>
                     <CardHeader>
                       <Skeleton className="h-5 w-3/4" />
                       <Skeleton className="h-4 w-1/2" />
                     </CardHeader>
                     <CardContent>
                       <Skeleton className="h-20" />
                     </CardContent>
                   </Card>
                 ))}
               </div>
             ) : filteredSubmissions.length === 0 ? (
               <Card>
                 <CardContent className="flex flex-col items-center justify-center py-12">
                   <Package className="h-12 w-12 text-muted-foreground mb-4" />
                   <p className="text-muted-foreground">No submissions found</p>
                 </CardContent>
               </Card>
             ) : (
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {filteredSubmissions.map((submission) => {
                   const config = statusConfig[submission.status as keyof typeof statusConfig];
                   const StatusIcon = config?.icon || Clock;
                   
                   return (
                     <Card key={submission.id}>
                       <CardHeader className="pb-3">
                         <div className="flex items-start justify-between">
                           <div className="space-y-1">
                             <CardTitle className="text-base">{submission.product_name}</CardTitle>
                             <CardDescription>
                               {submission.developer?.display_name || submission.developer?.username || 'Unknown'}
                               {submission.developer?.staff_id && (
                                 <span className="text-xs ml-1">({submission.developer.staff_id})</span>
                               )}
                             </CardDescription>
                           </div>
                           <Badge className={config?.color}>
                             <StatusIcon className="h-3 w-3 mr-1" />
                             {config?.label}
                           </Badge>
                         </div>
                       </CardHeader>
                       <CardContent className="space-y-3">
                         {submission.product_description && (
                           <p className="text-sm text-muted-foreground line-clamp-2">
                             {submission.product_description}
                           </p>
                         )}
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-muted-foreground">
                             {submission.category?.name || 'Uncategorized'}
                           </span>
                           <span className="font-medium">£{submission.price.toFixed(2)}</span>
                         </div>
                         <div className="text-xs text-muted-foreground">
                           Submitted {format(new Date(submission.created_at), 'MMM d, yyyy')}
                         </div>
                         {isAdmin && submission.status === 'pending' && (
                           <Button
                             variant="outline"
                             size="sm"
                             className="w-full"
                             onClick={() => handleReview(submission)}
                           >
                             <Eye className="h-4 w-4 mr-2" />
                             Review
                           </Button>
                         )}
                         {submission.reviewer_notes && (
                           <div className="text-xs p-2 bg-muted rounded">
                             <span className="font-medium">Notes: </span>
                             {submission.reviewer_notes}
                           </div>
                         )}
                       </CardContent>
                     </Card>
                   );
                 })}
               </div>
             )}
           </TabsContent>
         </Tabs>
 
         {/* Review Dialog */}
         <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Review Submission</DialogTitle>
               <DialogDescription>
                 {selectedSubmission?.product_name}
               </DialogDescription>
             </DialogHeader>
             <div className="space-y-4">
               <div>
                 <Label className="text-muted-foreground">Description</Label>
                 <p className="text-sm mt-1">
                   {selectedSubmission?.product_description || 'No description provided'}
                 </p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <Label className="text-muted-foreground">Category</Label>
                   <p className="text-sm mt-1">
                     {selectedSubmission?.category?.name || 'Uncategorized'}
                   </p>
                 </div>
                 <div>
                   <Label className="text-muted-foreground">Price</Label>
                   <p className="text-sm mt-1">£{selectedSubmission?.price.toFixed(2)}</p>
                 </div>
               </div>
               <div className="space-y-2">
                 <Label>Reviewer Notes</Label>
                 <Textarea
                   value={reviewNotes}
                   onChange={(e) => setReviewNotes(e.target.value)}
                   placeholder="Add feedback for the developer..."
                 />
               </div>
             </div>
             <DialogFooter className="flex-col sm:flex-row gap-2">
               <Button
                 variant="destructive"
                 onClick={() => selectedSubmission && updateSubmission.mutate({
                   id: selectedSubmission.id,
                   status: 'rejected',
                   notes: reviewNotes,
                 })}
                 disabled={updateSubmission.isPending}
               >
                 Reject
               </Button>
               <Button
                 variant="outline"
                 onClick={() => selectedSubmission && updateSubmission.mutate({
                   id: selectedSubmission.id,
                   status: 'revision_requested',
                   notes: reviewNotes,
                 })}
                 disabled={updateSubmission.isPending}
               >
                 Request Revision
               </Button>
               <Button
                 onClick={() => selectedSubmission && updateSubmission.mutate({
                   id: selectedSubmission.id,
                   status: 'approved',
                   notes: reviewNotes,
                 })}
                 disabled={updateSubmission.isPending}
               >
                 Approve
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
     </AdminLayout>
   );
 }
 import { useState } from 'react';
 import { useMutation } from '@tanstack/react-query';
 import { useNavigate } from 'react-router-dom';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
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
 import { toast } from 'sonner';
 import { Loader2 } from 'lucide-react';
 
 interface CreateTicketDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSuccess?: () => void;
 }
 
 const categories = [
   { value: 'order_issue', label: 'Order Issue' },
   { value: 'product_question', label: 'Product Question' },
   { value: 'technical', label: 'Technical Support' },
   { value: 'billing', label: 'Billing' },
   { value: 'refund', label: 'Refund Request' },
   { value: 'other', label: 'Other' },
 ];
 
 export function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
   const { user } = useAuth();
   const navigate = useNavigate();
   const [subject, setSubject] = useState('');
   const [category, setCategory] = useState('');
   const [message, setMessage] = useState('');
 
   const createTicket = useMutation({
     mutationFn: async () => {
       if (!user) throw new Error('Not authenticated');
 
       // Create the ticket
       const { data: ticket, error: ticketError } = await supabase
         .from('support_tickets')
         .insert({
           user_id: user.id,
           customer_email: user.email || '',
           subject: subject.trim(),
           category,
           status: 'open',
           priority: 'normal',
         })
         .select()
         .single();
 
       if (ticketError) throw ticketError;
 
       // Create the initial message
       const { error: messageError } = await supabase
         .from('ticket_messages')
         .insert({
           ticket_id: ticket.id,
           sender_id: user.id,
           sender_type: 'customer',
           message: message.trim(),
           is_internal_note: false,
         });
 
       if (messageError) throw messageError;
 
       return ticket;
     },
     onSuccess: (ticket) => {
       toast.success('Ticket submitted successfully');
       setSubject('');
       setCategory('');
       setMessage('');
       onOpenChange(false);
       onSuccess?.();
       // Navigate to the ticket detail page
       navigate(`/support/tickets/${ticket.id}`);
     },
     onError: (error) => {
       console.error('Failed to create ticket:', error);
       toast.error('Failed to submit ticket. Please try again.');
     },
   });
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!subject.trim() || !category || !message.trim()) {
       toast.error('Please fill in all fields');
       return;
     }
     createTicket.mutate();
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-lg">
         <DialogHeader>
           <DialogTitle>Submit a Support Ticket</DialogTitle>
           <DialogDescription>
             Describe your issue and our team will get back to you as soon as possible.
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="category">Category</Label>
             <Select value={category} onValueChange={setCategory}>
               <SelectTrigger>
                 <SelectValue placeholder="Select a category" />
               </SelectTrigger>
               <SelectContent>
                 {categories.map((cat) => (
                   <SelectItem key={cat.value} value={cat.value}>
                     {cat.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="subject">Subject</Label>
             <Input
               id="subject"
               value={subject}
               onChange={(e) => setSubject(e.target.value)}
               placeholder="Brief summary of your issue"
               maxLength={100}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="message">Description</Label>
             <Textarea
               id="message"
               value={message}
               onChange={(e) => setMessage(e.target.value)}
               placeholder="Please provide details about your issue..."
               className="min-h-[120px]"
               maxLength={2000}
             />
           </div>
 
           <div className="flex justify-end gap-2 pt-2">
             <Button
               type="button"
               variant="outline"
               onClick={() => onOpenChange(false)}
               disabled={createTicket.isPending}
             >
               Cancel
             </Button>
             <Button
               type="submit"
               className="gradient-button"
               disabled={createTicket.isPending || !subject.trim() || !category || !message.trim()}
             >
               {createTicket.isPending ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Submitting...
                 </>
               ) : (
                 'Submit Ticket'
               )}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 }
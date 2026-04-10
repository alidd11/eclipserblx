import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { DisputeEvidenceUpload } from './DisputeEvidenceUpload';
import { formatGBP } from '@/lib/formatters';

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderDisplayId: string;
  onSuccess?: () => void;
}

interface UploadedFile {
  file_path: string;
  file_name: string;
  file_size: number;
}

const disputeReasons = [
  { value: 'not_as_described', label: 'Product not as described' },
  { value: 'not_received', label: 'Product not received / no access' },
  { value: 'defective', label: 'Product is defective or broken' },
  { value: 'unauthorized', label: 'Unauthorized purchase' },
  { value: 'other', label: 'Other' },
];

export function DisputeDialog({ open, onOpenChange, orderId, orderDisplayId, onSuccess }: DisputeDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedFile[]>([]);

  // Fetch order items with product/store info
  const { data: orderItems } = useQuery({
    queryKey: ['dispute-order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, price, products(store_id)')
        .eq('order_id', orderId);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!orderId,
  });

  // Auto-select if only one item
  useEffect(() => {
    if (orderItems?.length === 1) {
      setSelectedItemId(orderItems[0].id);
    }
  }, [orderItems]);

  const selectedItem = orderItems?.find((i) => i.id === selectedItemId);
  const storeId = (selectedItem?.products as any)?.store_id;

  const createDispute = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedItem) throw new Error('Please select a product');

      const itemPrice = Number(selectedItem.price);
      const reasonLabel = disputeReasons.find(r => r.value === reason)?.label || reason;

      const { data: disputeData, error } = await supabase
        .from('refund_requests')
        .insert({
          order_id: orderId,
          order_item_id: selectedItem.id,
          customer_id: user.id,
          store_id: storeId,
          reason: reasonLabel,
          details: description.trim(),
          amount: itemPrice,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have an open dispute for this item.');
        }
        throw error;
      }

      // Save evidence files to dispute_evidence table
      if (evidenceFiles.length > 0 && disputeData) {
        const evidenceRows = evidenceFiles.map(f => ({
          dispute_id: disputeData.id,
          uploaded_by: user.id,
          file_path: f.file_path,
          file_name: f.file_name,
          file_size: f.file_size,
        }));
        await supabase.from('dispute_evidence').insert(evidenceRows);
      }

      // Send email notification to seller
      if (storeId) {
        supabase.functions.invoke('notify-seller-sale', {
          body: {
            type: 'dispute',
            store_id: storeId,
            order_id: orderId,
            product_name: selectedItem.product_name || 'Unknown product',
            reason: reasonLabel,
            amount: itemPrice,
          },
        }).catch((err) => console.error('Failed to send dispute email:', err));
      }

      // Auto-create a support ticket
      try {
        const ticketSubject = `Dispute: ${selectedItem.product_name || 'Order item'} (${orderDisplayId})`;
        const ticketMessage = `Reason: ${reasonLabel}\n\n${description.trim()}\n\n---\nOrder: ${orderDisplayId}\nProduct: ${selectedItem.product_name}\nAmount: {formatGBP(itemPrice)}`;

        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: user.id,
            customer_email: user.email || '',
            subject: ticketSubject,
            category: 'refund',
            status: 'open',
            priority: 'high',
          })
          .select()
          .single();

        if (!ticketError && ticket) {
          await supabase
            .from('ticket_messages')
            .insert({
              ticket_id: ticket.id,
              sender_id: user.id,
              sender_type: 'customer',
              message: ticketMessage,
              is_internal_note: false,
            });

          const customerName = user.user_metadata?.display_name || user.email || 'Unknown';
          
          let storeName = 'Unknown Store';
          if (storeId) {
            const { data: storeData } = await supabase
              .from('stores')
              .select('name')
              .eq('id', storeId)
              .single();
            if (storeData?.name) storeName = storeData.name;
          }
          
          supabase.functions.invoke('send-ticket-notification', {
            body: {
              ticket_number: ticket.ticket_number,
              subject: ticketSubject,
              category: 'Dispute',
              customer_name: customerName,
              store_name: storeName,
              ticket_id: ticket.id,
              type: 'customer',
              is_escalation: false,
            },
          }).catch(err => console.error('Failed to send dispute notification:', err));
        }
      } catch (err) {
        console.error('Failed to auto-create support ticket:', err);
      }
    },
    onSuccess: () => {
      toast.success('Dispute submitted and a support ticket has been created so our team can assist you.');
      setReason('');
      setDescription('');
      setSelectedItemId('');
      setEvidenceFiles([]);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to create dispute:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit dispute. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description.trim() || !selectedItemId) {
      toast.error('Please fill in all fields');
      return;
    }
    createDispute.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dispute Order {orderDisplayId}
          </DialogTitle>
          <DialogDescription>
            Your dispute will be sent to the seller first. If they don't resolve it, you can escalate to Eclipse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product selector — only if multiple items */}
          {orderItems && orderItems.length > 1 && (
            <div className="space-y-2">
              <Label>Which product?</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the product" />
                </SelectTrigger>
                <SelectContent>
                  {orderItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} — {formatGBP(Number(item.price))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {orderItems?.length === 1 && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Product: </span>
              <span className="font-medium">{orderItems[0].product_name}</span>
              <span className="text-muted-foreground"> — {formatGBP(Number(orderItems[0].price))}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dispute-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {disputeReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispute-description">Description</Label>
            <Textarea
              id="dispute-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about your issue..."
              className="min-h-[120px]"
              maxLength={2000}
            />
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label>Evidence (optional)</Label>
            <DisputeEvidenceUpload
              onFilesChange={setEvidenceFiles}
              existingFiles={evidenceFiles}
              maxFiles={5}
            />
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-amber-500">How it works:</strong> The seller will be notified and has 48 hours to respond. 
              If denied, you can escalate to Eclipse for a final decision. False or abusive disputes may result in account restrictions.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createDispute.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={createDispute.isPending || !reason || !description.trim() || !selectedItemId}
            >
              {createDispute.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Dispute'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

interface DisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderDisplayId: string;
  onSuccess?: () => void;
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

  const selectedItem = orderItems?.find((i: any) => i.id === selectedItemId);
  const storeId = (selectedItem?.products as any)?.store_id;

  const createDispute = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!selectedItem) throw new Error('Please select a product');

      const itemPrice = Number(selectedItem.price);

      const { error } = await supabase
        .from('refund_requests')
        .insert({
          order_id: orderId,
          order_item_id: selectedItem.id,
          customer_id: user.id,
          store_id: storeId,
          reason: disputeReasons.find(r => r.value === reason)?.label || reason,
          details: description.trim(),
          amount: itemPrice,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have an open dispute for this item.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Dispute submitted. The seller will review it — if unresolved, you can escalate to Eclipse.');
      setReason('');
      setDescription('');
      setSelectedItemId('');
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
                  {orderItems.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.product_name} — £{Number(item.price).toFixed(2)}
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
              <span className="text-muted-foreground"> — £{Number(orderItems[0].price).toFixed(2)}</span>
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

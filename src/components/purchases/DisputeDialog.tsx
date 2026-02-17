import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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

  const createDispute = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('order_disputes')
        .insert({
          order_id: orderId,
          user_id: user.id,
          reason,
          description: description.trim(),
          status: 'open',
        } as any);

      if (error) {
        if (error.code === '23505') {
          throw new Error('You already have an open dispute for this order.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Dispute submitted successfully. Our team will review it shortly.');
      setReason('');
      setDescription('');
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
    if (!reason || !description.trim()) {
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
            Please describe the issue with your order. Our team will review your dispute and get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-muted-foreground">
              Disputes are reviewed within 24–48 hours. False or abusive disputes may result in account restrictions.
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
              disabled={createDispute.isPending || !reason || !description.trim()}
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

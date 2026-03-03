import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useCredits } from '@/hooks/useCredits';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Coins, Megaphone, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CreatePromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePromotionDialog({ open, onOpenChange }: CreatePromotionDialogProps) {
  const { user } = useAuth();
  const { store } = useSellerStatus();
  const { balance } = useCredits();
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState('');
  const [slotType, setSlotType] = useState<'featured' | 'category_spotlight' | 'store_spotlight'>('featured');
  const [bidAmount, setBidAmount] = useState(5);

  // Fetch seller's approved products
  const { data: products } = useQuery({
    queryKey: ['seller-products-for-promo', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, images, category_id, moderation_status')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!store?.id,
  });

  // Check for existing pending bids to prevent duplicates
  const { data: existingBids } = useQuery({
    queryKey: ['seller-existing-bids', user?.id, productId, slotType],
    queryFn: async () => {
      if (!user || !productId) return [];
      const { data, error } = await supabase
        .from('product_promotions')
        .select('id, slot_type, max_bid')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('slot_type', slotType)
        .eq('status', 'pending_auction');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user && !!productId,
  });

  const hasDuplicateBid = (existingBids?.length ?? 0) > 0;
  const insufficientBalance = bidAmount > balance;

  const selectedProduct = products?.find(p => p.id === productId);

  const createPromotion = useMutation({
    mutationFn: async () => {
      if (!user || !store) throw new Error('Not authenticated');
      if (bidAmount < 5) throw new Error('Minimum bid is 5 credits');
      if (!productId) throw new Error('Select a product');
      if (insufficientBalance) throw new Error(`Insufficient credits. You need £${bidAmount} but only have £${balance.toFixed(2)}.`);
      if (hasDuplicateBid) throw new Error('You already have a pending bid for this product in this slot. Cancel it first or wait for resolution.');

      const { error } = await supabase.from('product_promotions').insert({
        store_id: store.id,
        product_id: productId,
        user_id: user.id,
        slot_type: slotType,
        max_bid: bidAmount,
        current_bid: bidAmount,
        category_id: slotType === 'category_spotlight' ? selectedProduct?.category_id : null,
        status: 'pending_auction',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-promotions'] });
      queryClient.invalidateQueries({ queryKey: ['seller-existing-bids'] });
      toast.success('Promotion bid created! It will be processed in the next weekly auction.');
      onOpenChange(false);
      setProductId('');
      setBidAmount(5);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create promotion'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Promote a Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Credit balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Credit Balance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">£{balance.toFixed(2)}</span>
              {balance < 5 && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link to="/credits">Top up</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Product selector */}
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {products?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slot type */}
          <div className="space-y-2">
            <Label>Promotion Slot</Label>
            <Select value={slotType} onValueChange={(v) => setSlotType(v as 'featured' | 'category_spotlight' | 'store_spotlight')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">
                  Featured Product — Homepage hero (1 slot)
                </SelectItem>
                <SelectItem value="category_spotlight">
                  Category Spotlight — Top of category (3 slots)
                </SelectItem>
                <SelectItem value="store_spotlight">
                  Store Spotlight — Featured store banner (1 slot)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bid amount */}
          <div className="space-y-2">
            <Label>Weekly Bid (credits)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={500}
                step={1}
                value={bidAmount}
                onChange={(e) => setBidAmount(Math.max(5, parseInt(e.target.value) || 5))}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">credits/week (min 5)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Highest bidder wins. Credits are deducted when you win a weekly auction slot.
            </p>
          </div>

          {/* Warnings */}
          {insufficientBalance && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Insufficient credits. You need £{bidAmount} but only have £{balance.toFixed(2)}. <Link to="/credits" className="underline font-medium">Top up</Link></span>
            </div>
          )}
          {hasDuplicateBid && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>You already have a pending bid for this product in this slot. Cancel it first or wait for the auction.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createPromotion.mutate()}
            disabled={!productId || bidAmount < 5 || createPromotion.isPending || insufficientBalance || hasDuplicateBid}
          >
            {createPromotion.isPending ? 'Creating...' : 'Place Bid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

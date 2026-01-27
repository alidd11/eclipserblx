import { useState, useEffect } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Percent, 
  DollarSign,
  Calendar,
  AlertCircle,
  Info
} from 'lucide-react';
import { useFormPersistence } from '@/hooks/useFormPersistence';

interface DiscountCode {
  id: string;
  store_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const INITIAL_DISCOUNT_FORM = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 10,
  min_order_amount: 0,
  max_uses: '',
  expires_at: '',
  is_active: true,
};

export default function SellerDiscounts() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData, clearFormData] = useFormPersistence('seller-discount-form', INITIAL_DISCOUNT_FORM);

  // Clear form when dialog closes
  useEffect(() => {
    if (!showCreateDialog && !editingCode) {
      clearFormData();
    }
  }, [showCreateDialog, editingCode]);

  // Fetch discount codes
  const { data: discountCodes, isLoading } = useQuery({
    queryKey: ['seller-discount-codes', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('seller_discount_codes')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiscountCode[];
    },
    enabled: !!store?.id,
  });

  // Create discount code
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');
      
      // Validate percentage limit (max 50%)
      if (data.discount_type === 'percentage' && data.discount_value > 50) {
        throw new Error('Discount percentage cannot exceed 50%');
      }

      const { error } = await supabase
        .from('seller_discount_codes')
        .insert({
          store_id: store.id,
          code: data.code.toUpperCase().trim(),
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_amount: data.min_order_amount || 0,
          max_uses: data.max_uses ? parseInt(data.max_uses) : null,
          expires_at: data.expires_at || null,
          is_active: data.is_active,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Discount code created!');
      queryClient.invalidateQueries({ queryKey: ['seller-discount-codes'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update discount code
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (data.discount_type === 'percentage' && data.discount_value > 50) {
        throw new Error('Discount percentage cannot exceed 50%');
      }

      const { error } = await supabase
        .from('seller_discount_codes')
        .update({
          code: data.code.toUpperCase().trim(),
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_amount: data.min_order_amount || 0,
          max_uses: data.max_uses ? parseInt(data.max_uses) : null,
          expires_at: data.expires_at || null,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Discount code updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-discount-codes'] });
      setEditingCode(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete discount code
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seller_discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Discount code deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-discount-codes'] });
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  // Toggle active state
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('seller_discount_codes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-discount-codes'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 0,
      max_uses: '',
      expires_at: '',
      is_active: true,
    });
  };

  const openEditDialog = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_order_amount: code.min_order_amount,
      max_uses: code.max_uses?.toString() || '',
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
      is_active: code.is_active,
    });
  };

  const handleSubmit = () => {
    if (!formData.code.trim()) {
      toast.error('Please enter a discount code');
      return;
    }
    if (formData.discount_value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Discount Codes</h1>
            <p className="text-muted-foreground">
              Create and manage discount codes for your products
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Code
          </Button>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-blue-500/5 border-blue-500/20">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500">Discount Limits</p>
              <p className="text-muted-foreground">
                To maintain platform health, seller discount codes are limited to a maximum of 50% off. 
                Customers can apply your codes at checkout for products from your store.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Discount Codes List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : discountCodes && discountCodes.length > 0 ? (
            discountCodes.map((code) => (
              <Card key={code.id} className={!code.is_active || isExpired(code.expires_at) ? 'opacity-60' : ''}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center bg-primary/10"
                    >
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{code.code}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyCode(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!code.is_active && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                        {isExpired(code.expires_at) && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          {code.discount_type === 'percentage' ? (
                            <>
                              <Percent className="h-3 w-3" />
                              {code.discount_value}% off
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-3 w-3" />
                              ${code.discount_value} off
                            </>
                          )}
                        </span>
                        {code.max_uses && (
                          <span>
                            {code.current_uses}/{code.max_uses} uses
                          </span>
                        )}
                        {code.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(code.expires_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={code.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: code.id, is_active: checked })
                      }
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(code)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeleteConfirmId(code.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Discount Codes</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first discount code to boost sales
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Code
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showCreateDialog || !!editingCode} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingCode(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Discount Code' : 'Create Discount Code'}
            </DialogTitle>
            <DialogDescription>
              {editingCode 
                ? 'Update your discount code settings' 
                : 'Create a new discount code for your products'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="SUMMER20"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => 
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  {formData.discount_type === 'percentage' ? 'Percentage (max 50%)' : 'Amount ($)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="1"
                  max={formData.discount_type === 'percentage' ? 50 : undefined}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    discount_value: Math.min(
                      parseFloat(e.target.value) || 0,
                      formData.discount_type === 'percentage' ? 50 : Infinity
                    )
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_order">Min. Order ($)</Label>
                <Input
                  id="min_order"
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">Max Uses (optional)</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiration Date (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setEditingCode(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The discount code will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SellerLayout>
  );
}

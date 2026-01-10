import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, Percent, DollarSign, Copy, Check } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DiscountForm {
  id?: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
}

const emptyForm: DiscountForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: null,
  max_uses: null,
  expires_at: null,
  is_active: true,
};

export default function AdminDiscounts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountForm | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: discounts, isLoading } = useQuery({
    queryKey: ['admin-discounts', search],
    queryFn: async () => {
      let query = supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('code', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: DiscountForm) => {
      const payload = {
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount,
        max_uses: data.max_uses,
        expires_at: data.expires_at || null,
        is_active: data.is_active,
      };

      const isNewCode = !data.id;

      if (data.id) {
        const { error } = await supabase
          .from('discount_codes')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('discount_codes')
          .insert(payload);
        if (error) throw error;
      }

      // Send notifications to subscribed users for new active discount codes
      if (isNewCode && data.is_active) {
        try {
          // Get all users who are subscribed to discounts
          const { data: subscribers } = await supabase
            .from('email_subscriptions')
            .select('user_id')
            .eq('subscribed_to_discounts', true)
            .not('user_id', 'is', null);

          if (subscribers && subscribers.length > 0) {
            const discountDisplay = data.discount_type === 'percentage' 
              ? `${data.discount_value}% off` 
              : `£${data.discount_value.toFixed(2)} off`;
            
            const notifications = subscribers.map(sub => ({
              user_id: sub.user_id!,
              title: '🏷️ New Discount Code!',
              message: `Use code ${data.code.toUpperCase()} for ${discountDisplay} your next order!`,
              type: 'discount',
              link: '/products',
            }));

            await supabase.from('notifications').insert(notifications);
          }
        } catch (e) {
          console.error('Failed to send discount notifications:', e);
          // Don't throw - discount was created successfully
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setDialogOpen(false);
      toast.success(form.id ? 'Discount updated' : 'Discount created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save discount');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setDeleteDialogOpen(false);
      toast.success('Discount deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete discount');
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (discount: any) => {
    setForm({
      id: discount.id,
      code: discount.code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      min_order_amount: discount.min_order_amount,
      max_uses: discount.max_uses,
      expires_at: discount.expires_at ? discount.expires_at.split('T')[0] : null,
      is_active: discount.is_active,
    });
    setDialogOpen(true);
  };

  const openDelete = (discount: any) => {
    setSelectedDiscount(discount);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code.trim()) {
      toast.error('Please enter a discount code');
      return;
    }
    if (form.discount_value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (form.discount_type === 'percentage' && form.discount_value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    saveMutation.mutate(form);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (discount: any) => {
    if (!discount.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    } else if (isExpired(discount.expires_at)) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (discount.max_uses && (discount.current_uses || 0) >= discount.max_uses) {
      return <Badge variant="secondary">Maxed Out</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getDiscountDisplay = (discount: any) => {
    if (discount.discount_type === 'percentage') {
      return `${discount.discount_value}%`;
    }
    return `£${discount.discount_value.toFixed(2)}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Discount Codes</h1>
            <p className="text-sm text-muted-foreground">Create and manage discount codes for your store</p>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Discount
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : discounts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No discount codes found
                  </TableCell>
                </TableRow>
              ) : (
                discounts?.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {discount.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(discount.code)}
                        >
                          {copiedCode === discount.code ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {discount.discount_type === 'percentage' ? (
                          <Percent className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                        )}
                        {getDiscountDisplay(discount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {discount.current_uses || 0}
                      {discount.max_uses && ` / ${discount.max_uses}`}
                    </TableCell>
                    <TableCell>
                      {discount.min_order_amount ? `£${discount.min_order_amount.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {discount.expires_at ? (
                        <span className={isExpired(discount.expires_at) ? 'text-destructive' : ''}>
                          {format(new Date(discount.expires_at), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(discount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(discount)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDelete(discount)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : discounts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No discount codes found</div>
          ) : (
            discounts?.map((discount) => (
              <div key={discount.id} className="border rounded-lg p-4 space-y-3 bg-card">
                {/* Header: Code + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-medium">
                      {discount.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyCode(discount.code)}
                    >
                      {copiedCode === discount.code ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  {getStatusBadge(discount)}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Discount:</span>
                    <div className="flex items-center gap-1 font-medium">
                      {discount.discount_type === 'percentage' ? (
                        <Percent className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                      )}
                      {getDiscountDisplay(discount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uses:</span>
                    <div className="font-medium">
                      {discount.current_uses || 0}
                      {discount.max_uses ? ` / ${discount.max_uses}` : ' (unlimited)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min Order:</span>
                    <div className="font-medium">
                      {discount.min_order_amount ? `£${discount.min_order_amount.toFixed(2)}` : 'None'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <div className={`font-medium ${isExpired(discount.expires_at) ? 'text-destructive' : ''}`}>
                      {discount.expires_at
                        ? format(new Date(discount.expires_at), 'MMM d, yyyy')
                        : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(discount)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => openDelete(discount)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Discount' : 'Create Discount'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Discount Code *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAVE20"
                className="uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Discount Type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setForm({ ...form, discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  {form.discount_type === 'percentage' ? 'Percentage' : 'Amount'} *
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  max={form.discount_type === 'percentage' ? 100 : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_order">Minimum Order (£)</Label>
                <Input
                  id="min_order"
                  type="number"
                  min="0"
                  value={form.min_order_amount || ''}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="No minimum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">Max Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={form.max_uses || ''}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expiry Date</Label>
              <Input
                id="expires"
                type="date"
                value={form.expires_at || ''}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : form.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the discount code "{selectedDiscount?.code}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedDiscount?.id && deleteMutation.mutate(selectedDiscount.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

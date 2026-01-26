import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, Percent, DollarSign, Copy, Check, Sparkles, Tags, Gift, Users } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

// ==================== DISCOUNT CODES ====================

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

const emptyDiscountForm: DiscountForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: null,
  max_uses: null,
  expires_at: null,
  is_active: true,
};

// ==================== SIGNUP PROMOTIONS ====================

interface PromotionForm {
  id?: string;
  name: string;
  description: string;
  promotion_type: 'signup_eclipse_plus' | 'first_purchase_eclipse_plus';
  eclipse_plus_days: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_claims: number | null;
  new_users_only: boolean;
}

const emptyPromotionForm: PromotionForm = {
  name: '',
  description: '',
  promotion_type: 'signup_eclipse_plus',
  eclipse_plus_days: 30,
  is_active: false,
  starts_at: null,
  ends_at: null,
  max_claims: null,
  new_users_only: true,
};

export default function AdminPromotions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('discounts');

  // ==================== DISCOUNT CODES STATE ====================
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountDeleteDialogOpen, setDiscountDeleteDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountForm | null>(null);
  const [discountForm, setDiscountForm] = useState<DiscountForm>(emptyDiscountForm);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ==================== SIGNUP PROMOTIONS STATE ====================
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoDeleteDialogOpen, setPromoDeleteDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromotionForm | null>(null);
  const [promoForm, setPromoForm] = useState<PromotionForm>(emptyPromotionForm);

  // ==================== DISCOUNT CODES QUERIES ====================
  const { data: discounts, isLoading: discountsLoading } = useQuery({
    queryKey: ['admin-discounts', discountSearch],
    queryFn: async () => {
      let query = supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (discountSearch) {
        query = query.ilike('code', `%${discountSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // ==================== PROMOTIONS QUERIES ====================
  const { data: promotions, isLoading: promotionsLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // ==================== DISCOUNT MUTATIONS ====================
  const saveDiscountMutation = useMutation({
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

      if (isNewCode && data.is_active) {
        try {
          await supabase.functions.invoke('notify-discount', {
            body: {
              discount_id: data.id || `new-${Date.now()}`,
              code: data.code.toUpperCase(),
              discount_type: data.discount_type,
              discount_value: data.discount_value,
              expires_at: data.expires_at,
            },
          });
        } catch (e) {
          console.error('Failed to send discount notifications:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setDiscountDialogOpen(false);
      toast.success(discountForm.id ? 'Discount updated' : 'Discount created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save discount');
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discount_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discounts'] });
      setDiscountDeleteDialogOpen(false);
      toast.success('Discount deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete discount');
    },
  });

  // ==================== PROMOTION MUTATIONS ====================
  const savePromoMutation = useMutation({
    mutationFn: async (data: PromotionForm) => {
      const payload = {
        name: data.name,
        description: data.description,
        promotion_type: data.promotion_type,
        eclipse_plus_days: data.eclipse_plus_days,
        is_active: data.is_active,
        starts_at: data.starts_at || null,
        ends_at: data.ends_at || null,
        max_claims: data.max_claims,
        new_users_only: data.new_users_only,
        created_by: user?.id,
      };

      if (data.id) {
        const { error } = await supabase
          .from('promotions')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setPromoDialogOpen(false);
      toast.success(promoForm.id ? 'Promotion updated' : 'Promotion created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save promotion');
    },
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setPromoDeleteDialogOpen(false);
      toast.success('Promotion deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete promotion');
    },
  });

  // ==================== DISCOUNT HANDLERS ====================
  const openCreateDiscount = () => {
    setDiscountForm(emptyDiscountForm);
    setDiscountDialogOpen(true);
  };

  const openEditDiscount = (discount: any) => {
    setDiscountForm({
      id: discount.id,
      code: discount.code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      min_order_amount: discount.min_order_amount,
      max_uses: discount.max_uses,
      expires_at: discount.expires_at ? discount.expires_at.split('T')[0] : null,
      is_active: discount.is_active,
    });
    setDiscountDialogOpen(true);
  };

  const openDeleteDiscount = (discount: any) => {
    setSelectedDiscount(discount);
    setDiscountDeleteDialogOpen(true);
  };

  const handleSubmitDiscount = () => {
    if (!discountForm.code.trim()) {
      toast.error('Please enter a discount code');
      return;
    }
    if (discountForm.discount_value <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (discountForm.discount_type === 'percentage' && discountForm.discount_value > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    saveDiscountMutation.mutate(discountForm);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ==================== PROMOTION HANDLERS ====================
  const openCreatePromo = () => {
    setPromoForm(emptyPromotionForm);
    setPromoDialogOpen(true);
  };

  const openEditPromo = (promo: any) => {
    setPromoForm({
      id: promo.id,
      name: promo.name,
      description: promo.description || '',
      promotion_type: promo.promotion_type,
      eclipse_plus_days: promo.eclipse_plus_days || 30,
      is_active: promo.is_active,
      starts_at: promo.starts_at ? promo.starts_at.split('T')[0] : null,
      ends_at: promo.ends_at ? promo.ends_at.split('T')[0] : null,
      max_claims: promo.max_claims,
      new_users_only: promo.new_users_only ?? true,
    });
    setPromoDialogOpen(true);
  };

  const openDeletePromo = (promo: any) => {
    setSelectedPromo(promo);
    setPromoDeleteDialogOpen(true);
  };

  const handleSubmitPromo = () => {
    if (!promoForm.name.trim()) {
      toast.error('Please enter a promotion name');
      return;
    }
    savePromoMutation.mutate(promoForm);
  };

  // ==================== HELPERS ====================
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getDiscountStatusBadge = (discount: any) => {
    if (!discount.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    } else if (isExpired(discount.expires_at)) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (discount.max_uses && (discount.current_uses || 0) >= discount.max_uses) {
      return <Badge variant="secondary">Maxed Out</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getPromoStatusBadge = (promo: any) => {
    if (!promo.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    const now = new Date();
    if (promo.starts_at && new Date(promo.starts_at) > now) {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    if (promo.ends_at && new Date(promo.ends_at) < now) {
      return <Badge variant="destructive">Ended</Badge>;
    }
    if (promo.max_claims && (promo.current_claims || 0) >= promo.max_claims) {
      return <Badge variant="secondary">Maxed Out</Badge>;
    }
    return <Badge className="bg-amber-500 hover:bg-amber-600">Active</Badge>;
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'signup_eclipse_plus':
        return 'Free Eclipse+ on Signup';
      case 'first_purchase_eclipse_plus':
        return 'Free Eclipse+ on First Purchase';
      default:
        return type;
    }
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
        <div>
          <h1 className="text-2xl font-display font-bold">Promotions</h1>
          <p className="text-sm text-muted-foreground">Manage discount codes and special offers</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="discounts" className="gap-2">
              <Tags className="h-4 w-4" />
              Discount Codes
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <Gift className="h-4 w-4" />
              Special Offers
            </TabsTrigger>
          </TabsList>

          {/* ==================== DISCOUNT CODES TAB ==================== */}
          <TabsContent value="discounts" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search codes..."
                  value={discountSearch}
                  onChange={(e) => setDiscountSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={openCreateDiscount}>
                <Plus className="h-4 w-4 mr-2" />
                Create Discount
              </Button>
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
                  {discountsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
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
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{discount.code}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(discount.code)}>
                              {copiedCode === discount.code ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {discount.discount_type === 'percentage' ? <Percent className="h-3 w-3 text-muted-foreground" /> : <DollarSign className="h-3 w-3 text-muted-foreground" />}
                            {getDiscountDisplay(discount)}
                          </div>
                        </TableCell>
                        <TableCell>{discount.current_uses || 0}{discount.max_uses && ` / ${discount.max_uses}`}</TableCell>
                        <TableCell>{discount.min_order_amount ? `£${discount.min_order_amount.toFixed(2)}` : '-'}</TableCell>
                        <TableCell>
                          {discount.expires_at ? (
                            <span className={isExpired(discount.expires_at) ? 'text-destructive' : ''}>
                              {format(new Date(discount.expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getDiscountStatusBadge(discount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDiscount(discount)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteDiscount(discount)}>
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
              {discountsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : discounts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No discount codes found</div>
              ) : (
                discounts?.map((discount) => (
                  <div key={discount.id} className="border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-medium">{discount.code}</code>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(discount.code)}>
                          {copiedCode === discount.code ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      {getDiscountStatusBadge(discount)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Discount:</span>
                        <div className="flex items-center gap-1 font-medium">
                          {discount.discount_type === 'percentage' ? <Percent className="h-3 w-3 text-muted-foreground" /> : <DollarSign className="h-3 w-3 text-muted-foreground" />}
                          {getDiscountDisplay(discount)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uses:</span>
                        <div className="font-medium">{discount.current_uses || 0}{discount.max_uses ? ` / ${discount.max_uses}` : ' (unlimited)'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDiscount(discount)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => openDeleteDiscount(discount)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* ==================== SPECIAL OFFERS TAB ==================== */}
          <TabsContent value="offers" className="space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Create special promotions like free Eclipse+ for new signups
              </p>
              <Button onClick={openCreatePromo}>
                <Plus className="h-4 w-4 mr-2" />
                Create Offer
              </Button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Claims</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : promotions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No special offers yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    promotions?.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell className="font-medium">{promo.name}</TableCell>
                        <TableCell className="text-sm">{getPromoTypeLabel(promo.promotion_type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            {promo.eclipse_plus_days} days Eclipse+
                          </div>
                        </TableCell>
                        <TableCell>{promo.current_claims || 0}{promo.max_claims && ` / ${promo.max_claims}`}</TableCell>
                        <TableCell className="text-sm">
                          {promo.starts_at || promo.ends_at ? (
                            <>
                              {promo.starts_at && format(new Date(promo.starts_at), 'MMM d')}
                              {promo.starts_at && promo.ends_at && ' - '}
                              {promo.ends_at && format(new Date(promo.ends_at), 'MMM d')}
                            </>
                          ) : 'Always'}
                        </TableCell>
                        <TableCell>{getPromoStatusBadge(promo)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPromo(promo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeletePromo(promo)}>
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
              {promotionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : promotions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No special offers yet</div>
              ) : (
                promotions?.map((promo) => (
                  <div key={promo.id} className="border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{promo.name}</span>
                      {getPromoStatusBadge(promo)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <div className="font-medium text-xs">{getPromoTypeLabel(promo.promotion_type)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reward:</span>
                        <div className="flex items-center gap-1 font-medium">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          {promo.eclipse_plus_days}d Eclipse+
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditPromo(promo)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => openDeletePromo(promo)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== DISCOUNT DIALOG ==================== */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{discountForm.id ? 'Edit Discount' : 'Create Discount'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Discount Code *</Label>
              <Input
                id="code"
                value={discountForm.code}
                onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAVE20"
                className="uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select
                  value={discountForm.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => setDiscountForm({ ...discountForm, discount_type: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={discountForm.discount_value}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_value: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order (£)</Label>
                <Input
                  type="number"
                  value={discountForm.min_order_amount || ''}
                  onChange={(e) => setDiscountForm({ ...discountForm, min_order_amount: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="No minimum"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Uses</Label>
                <Input
                  type="number"
                  value={discountForm.max_uses || ''}
                  onChange={(e) => setDiscountForm({ ...discountForm, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expires At</Label>
              <Input
                type="date"
                value={discountForm.expires_at || ''}
                onChange={(e) => setDiscountForm({ ...discountForm, expires_at: e.target.value || null })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={discountForm.is_active}
                onCheckedChange={(checked) => setDiscountForm({ ...discountForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitDiscount} disabled={saveDiscountMutation.isPending}>
              {saveDiscountMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DISCOUNT DELETE DIALOG ==================== */}
      <AlertDialog open={discountDeleteDialogOpen} onOpenChange={setDiscountDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDiscount?.code}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedDiscount?.id && deleteDiscountMutation.mutate(selectedDiscount.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== PROMOTION DIALOG ==================== */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{promoForm.id ? 'Edit Offer' : 'Create Special Offer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Offer Name *</Label>
              <Input
                value={promoForm.name}
                onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                placeholder="e.g. January Signup Bonus"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={promoForm.description}
                onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                placeholder="Internal notes about this promotion..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Promotion Type</Label>
              <Select
                value={promoForm.promotion_type}
                onValueChange={(value: 'signup_eclipse_plus' | 'first_purchase_eclipse_plus') => setPromoForm({ ...promoForm, promotion_type: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup_eclipse_plus">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Free Eclipse+ on Signup
                    </div>
                  </SelectItem>
                  <SelectItem value="first_purchase_eclipse_plus">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Free Eclipse+ on First Purchase
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Eclipse+ Days</Label>
              <Select
                value={String(promoForm.eclipse_plus_days)}
                onValueChange={(value) => setPromoForm({ ...promoForm, eclipse_plus_days: parseInt(value) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days (1 month)</SelectItem>
                  <SelectItem value="60">60 days (2 months)</SelectItem>
                  <SelectItem value="90">90 days (3 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starts At</Label>
                <Input
                  type="date"
                  value={promoForm.starts_at || ''}
                  onChange={(e) => setPromoForm({ ...promoForm, starts_at: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ends At</Label>
                <Input
                  type="date"
                  value={promoForm.ends_at || ''}
                  onChange={(e) => setPromoForm({ ...promoForm, ends_at: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Claims</Label>
              <Input
                type="number"
                value={promoForm.max_claims || ''}
                onChange={(e) => setPromoForm({ ...promoForm, max_claims: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Unlimited"
                min="1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new_users_only">New Users Only</Label>
                <p className="text-xs text-muted-foreground">Only first-time accounts can claim</p>
              </div>
              <Switch
                id="new_users_only"
                checked={promoForm.new_users_only}
                onCheckedChange={(checked) => setPromoForm({ ...promoForm, new_users_only: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="promo_active">Active</Label>
                <p className="text-xs text-muted-foreground">Enable this promotion</p>
              </div>
              <Switch
                id="promo_active"
                checked={promoForm.is_active}
                onCheckedChange={(checked) => setPromoForm({ ...promoForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitPromo} disabled={savePromoMutation.isPending}>
              {savePromoMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== PROMOTION DELETE DIALOG ==================== */}
      <AlertDialog open={promoDeleteDialogOpen} onOpenChange={setPromoDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPromo?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPromo?.id && deletePromoMutation.mutate(selectedPromo.id)}
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

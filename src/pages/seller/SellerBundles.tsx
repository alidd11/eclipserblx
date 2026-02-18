import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  PackagePlus, Plus, Trash2, Edit, Percent, Info
} from 'lucide-react';

export default function SellerBundles() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', bundle_price: 0, original_price: 0, is_active: true, max_purchases: '',
  });

  // Fetch store products for bundle creation
  const { data: products } = useQuery({
    queryKey: ['seller-products-for-bundles', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!store?.id,
  });

  const { data: bundles, isLoading } = useQuery({
    queryKey: ['seller-bundles', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('product_bundles')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store');
      if (selectedProductIds.length < 2) throw new Error('Select at least 2 products');
      const savings = form.original_price > 0 
        ? Math.round(((form.original_price - form.bundle_price) / form.original_price) * 100)
        : 0;
      const { error } = await supabase.from('product_bundles').insert({
        store_id: store.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        product_ids: selectedProductIds,
        bundle_price: form.bundle_price,
        original_price: form.original_price,
        savings_percent: savings,
        is_active: form.is_active,
        max_purchases: form.max_purchases ? parseInt(form.max_purchases) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bundle created!');
      queryClient.invalidateQueries({ queryKey: ['seller-bundles'] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (selectedProductIds.length < 2) throw new Error('Select at least 2 products');
      const savings = form.original_price > 0
        ? Math.round(((form.original_price - form.bundle_price) / form.original_price) * 100)
        : 0;
      const { error } = await supabase.from('product_bundles').update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        product_ids: selectedProductIds,
        bundle_price: form.bundle_price,
        original_price: form.original_price,
        savings_percent: savings,
        is_active: form.is_active,
        max_purchases: form.max_purchases ? parseInt(form.max_purchases) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bundle updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-bundles'] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_bundles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bundle deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-bundles'] });
      setDeleteId(null);
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditing(null);
    setForm({ name: '', description: '', bundle_price: 0, original_price: 0, is_active: true, max_purchases: '' });
    setSelectedProductIds([]);
  };

  const openEdit = (bundle: any) => {
    setEditing(bundle);
    setForm({
      name: bundle.name, description: bundle.description || '',
      bundle_price: bundle.bundle_price, original_price: bundle.original_price,
      is_active: bundle.is_active, max_purchases: bundle.max_purchases?.toString() || '',
    });
    setSelectedProductIds(bundle.product_ids || []);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // Auto-calculate original price from selected products
  const autoCalculatePrice = () => {
    const total = (products || [])
      .filter(p => selectedProductIds.includes(p.id))
      .reduce((sum, p) => sum + (p.price || 0), 0);
    setForm(f => ({ ...f, original_price: total }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.bundle_price <= 0) { toast.error('Bundle price must be greater than 0'); return; }
    editing ? updateMutation.mutate() : createMutation.mutate();
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Bundle Deals</h1>
            <p className="text-muted-foreground">Group products together at a discounted price</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />New Bundle
          </Button>
        </div>

        <Card className="mb-6 bg-blue-500/5 border-blue-500/20">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Bundles let customers buy multiple products together at a reduced price. 
              Select at least 2 products and set a bundle price below the combined total.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            [1,2].map(i => <Skeleton key={i} className="h-24" />)
          ) : bundles && bundles.length > 0 ? (
            bundles.map((bundle: any) => (
              <Card key={bundle.id} className={!bundle.is_active ? 'opacity-60' : ''}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-primary/10">
                      <PackagePlus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{bundle.name}</span>
                        {!bundle.is_active && <Badge variant="secondary">Hidden</Badge>}
                        {bundle.savings_percent > 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Percent className="h-3 w-3 mr-1" />Save {bundle.savings_percent}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bundle.product_ids?.length || 0} products · 
                        <span className="line-through ml-1">£{Number(bundle.original_price).toFixed(2)}</span>
                        <span className="text-green-600 font-medium ml-1">£{Number(bundle.bundle_price).toFixed(2)}</span>
                      </p>
                      {bundle.max_purchases && (
                        <p className="text-xs text-muted-foreground">
                          {bundle.current_purchases}/{bundle.max_purchases} purchased
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(bundle)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(bundle.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <PackagePlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Bundles</h3>
                <p className="text-muted-foreground mb-4">Create bundle deals to increase average order value</p>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />Create Bundle
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showDialog || !!editing} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Bundle' : 'New Bundle'}</DialogTitle>
            <DialogDescription>Group products at a discounted price</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bundle Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Starter Pack" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Everything you need to get started" rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Products ({selectedProductIds.length} selected)</Label>
                <Button variant="outline" size="sm" onClick={autoCalculatePrice}>
                  Auto-calculate price
                </Button>
              </div>
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                {(products || []).map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedProductIds.includes(p.id)} 
                      onChange={() => toggleProduct(p.id)}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm">{p.name}</span>
                    <span className="text-sm text-muted-foreground">£{(p.price || 0).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Original Price (£)</Label>
                <Input type="number" min="0" step="0.01" value={form.original_price}
                  onChange={e => setForm({...form, original_price: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Bundle Price (£)</Label>
                <Input type="number" min="0" step="0.01" value={form.bundle_price}
                  onChange={e => setForm({...form, bundle_price: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            {form.original_price > 0 && form.bundle_price > 0 && (
              <p className="text-sm text-green-600 font-medium">
                Customers save {Math.round(((form.original_price - form.bundle_price) / form.original_price) * 100)}%
              </p>
            )}
            <div className="space-y-2">
              <Label>Max Purchases (optional)</Label>
              <Input type="number" min="1" value={form.max_purchases}
                onChange={e => setForm({...form, max_purchases: e.target.value})} placeholder="Unlimited" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={c => setForm({...form, is_active: c})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SellerLayout>
  );
}

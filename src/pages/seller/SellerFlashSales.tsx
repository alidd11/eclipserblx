import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Zap, Plus, Trash2, Edit, Clock, Timer, Info } from 'lucide-react';

export default function SellerFlashSales() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', discount_type: 'percentage', discount_value: 20,
    apply_to_all: true, starts_at: '', ends_at: '', is_active: true,
  });

  const { data: flashSales, isLoading } = useQuery({
    queryKey: ['seller-flash-sales', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('flash_sales')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store');
      if (form.discount_type === 'percentage' && form.discount_value > 50) {
        throw new Error('Flash sale discount cannot exceed 50%');
      }
      const { error } = await supabase.from('flash_sales').insert({
        store_id: store.id,
        name: form.name.trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        apply_to_all: form.apply_to_all,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        is_active: form.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Flash sale created!');
      queryClient.invalidateQueries({ queryKey: ['seller-flash-sales'] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (form.discount_type === 'percentage' && form.discount_value > 50) {
        throw new Error('Flash sale discount cannot exceed 50%');
      }
      const { error } = await supabase.from('flash_sales').update({
        name: form.name.trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        apply_to_all: form.apply_to_all,
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Flash sale updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-flash-sales'] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('flash_sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Flash sale deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-flash-sales'] });
      setDeleteId(null);
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditing(null);
    setForm({ name: '', discount_type: 'percentage', discount_value: 20, apply_to_all: true, starts_at: '', ends_at: '', is_active: true });
  };

  const openEdit = (sale: any) => {
    setEditing(sale);
    setForm({
      name: sale.name, discount_type: sale.discount_type,
      discount_value: sale.discount_value, apply_to_all: sale.apply_to_all,
      starts_at: sale.starts_at?.slice(0, 16) || '', ends_at: sale.ends_at?.slice(0, 16) || '',
      is_active: sale.is_active,
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.starts_at || !form.ends_at) { toast.error('Start and end dates required'); return; }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) { toast.error('End must be after start'); return; }
    editing ? updateMutation.mutate() : createMutation.mutate();
  };

  const isActive = (sale: any) => sale.is_active && new Date(sale.starts_at) <= new Date() && new Date(sale.ends_at) > new Date();
  const isUpcoming = (sale: any) => sale.is_active && new Date(sale.starts_at) > new Date();
  const isExpired = (sale: any) => new Date(sale.ends_at) <= new Date();

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Flash Sales</h1>
            <p className="text-muted-foreground">Create time-limited sales for your store</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />New Flash Sale
          </Button>
        </div>

        <Card className="mb-6 bg-blue-500/5 border-blue-500/20">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Flash sales apply automatic discounts to your products during the sale period. 
              Maximum discount is 50%. Sales are visible on your store page with a countdown timer.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            [1,2].map(i => <Skeleton key={i} className="h-24" />)
          ) : flashSales && flashSales.length > 0 ? (
            flashSales.map((sale: any) => (
              <Card key={sale.id} className={isExpired(sale) ? 'opacity-60' : ''}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-primary/10">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{sale.name}</span>
                        {isActive(sale) && <Badge className="bg-green-600">Live</Badge>}
                        {isUpcoming(sale) && <Badge variant="secondary">Upcoming</Badge>}
                        {isExpired(sale) && <Badge variant="outline">Expired</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sale.discount_type === 'percentage' ? `${sale.discount_value}% off` : `£${sale.discount_value} off`}
                        {sale.apply_to_all ? ' · All products' : ' · Selected products'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Timer className="h-3 w-3 inline mr-1" />
                        {format(new Date(sale.starts_at), 'MMM d, HH:mm')} → {format(new Date(sale.ends_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sale)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(sale.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Flash Sales</h3>
                <p className="text-muted-foreground mb-4">Create a time-limited sale to boost engagement</p>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />Create Flash Sale
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showDialog || !!editing} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Flash Sale' : 'New Flash Sale'}</DialogTitle>
            <DialogDescription>Set up a time-limited discount</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sale Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Weekend Blowout" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm({...form, discount_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{form.discount_type === 'percentage' ? 'Percentage (max 50%)' : 'Amount (£)'}</Label>
                <Input type="number" min="1" max={form.discount_type === 'percentage' ? 50 : undefined}
                  value={form.discount_value}
                  onChange={e => setForm({...form, discount_value: Math.min(parseFloat(e.target.value) || 0, form.discount_type === 'percentage' ? 50 : Infinity)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starts At</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Ends At</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Apply to all products</Label>
              <Switch checked={form.apply_to_all} onCheckedChange={c => setForm({...form, apply_to_all: c})} />
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
            <AlertDialogTitle>Delete Flash Sale?</AlertDialogTitle>
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, Percent, DollarSign, Copy, Check } from 'lucide-react';
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
import { format } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';

interface DiscountForm {
  id?: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
  store_id: string | null;
}

const emptyForm: DiscountForm = {
  code: '', discount_type: 'percentage', discount_value: 10,
  min_order_amount: null, max_uses: null, expires_at: null, is_active: true, store_id: null,
};

export function DiscountCodesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DiscountForm | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: stores } = useQuery({
    queryKey: ['admin-stores-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: discounts, isLoading } = useQuery({
    queryKey: ['admin-discounts', search],
    queryFn: async () => {
      let query = supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
      if (search) query = query.ilike('code', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: DiscountForm) => {
      const payload = {
        code: data.code.toUpperCase(), discount_type: data.discount_type,
        discount_value: data.discount_value, min_order_amount: data.min_order_amount,
        max_uses: data.max_uses, expires_at: data.expires_at || null,
        is_active: data.is_active, store_id: data.store_id || null,
      };
      if (data.id) {
        const { error } = await supabase.from('discount_codes').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const isNew = true;
        const { error } = await supabase.from('discount_codes').insert({ ...payload, created_by: user?.id } as any);
        if (error) throw error;
        if (isNew) {
          await supabase.from('audit_logs').insert({ user_id: user?.id, action: 'create', resource: 'discount_code', details: { code: payload.code } } as any);
        }
      }
    },
    onSuccess: () => { toast.success('Discount saved'); queryClient.invalidateQueries({ queryKey: ['admin-discounts'] }); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discount_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['admin-discounts'] }); setDeleteDialogOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

  const getStatusBadge = (d: any) => {
    if (!d.is_active) return <Badge variant="secondary">Inactive</Badge>;
    if (isExpired(d.expires_at)) return <Badge variant="destructive">Expired</Badge>;
    if (d.max_uses && (d.current_uses || 0) >= d.max_uses) return <Badge variant="secondary">Maxed Out</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  const getDisplay = (d: any) => d.discount_type === 'percentage' ? `${d.discount_value}%` : `£${d.discount_value.toFixed(2)}`;

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000); };

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d: any) => { setForm({ id: d.id, code: d.code, discount_type: d.discount_type, discount_value: d.discount_value, min_order_amount: d.min_order_amount, max_uses: d.max_uses, expires_at: d.expires_at ? d.expires_at.split('T')[0] : null, is_active: d.is_active, store_id: d.store_id }); setDialogOpen(true); };
  const openDelete = (d: any) => { setSelected(d); setDeleteDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Discount</Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Store</TableHead><TableHead>Discount</TableHead>
              <TableHead>Uses</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : discounts?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No discount codes found</TableCell></TableRow>
            ) : discounts?.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{d.code}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(d.code)}>
                      {copiedCode === d.code ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{d.store_id ? <Badge variant="outline" className="text-xs">{stores?.find(s => s.id === d.store_id)?.name || 'Store'}</Badge> : <Badge variant="secondary" className="text-xs">Platform</Badge>}</TableCell>
                <TableCell><div className="flex items-center gap-1">{d.discount_type === 'percentage' ? <Percent className="h-3 w-3 text-muted-foreground" /> : <DollarSign className="h-3 w-3 text-muted-foreground" />}{getDisplay(d)}</div></TableCell>
                <TableCell>{d.current_uses || 0}{d.max_uses && ` / ${d.max_uses}`}</TableCell>
                <TableCell>{d.expires_at ? <span className={isExpired(d.expires_at) ? 'text-destructive' : ''}>{format(new Date(d.expires_at), 'MMM d, yyyy')}</span> : '-'}</TableCell>
                <TableCell>{getStatusBadge(d)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(d)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : discounts?.length === 0 ? <div className="text-center py-8 text-muted-foreground">No discount codes found</div> : discounts?.map((d) => (
          <div key={d.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-medium">{d.code}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(d.code)}>
                  {copiedCode === d.code ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {getStatusBadge(d)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Discount:</span><div className="flex items-center gap-1 font-medium">{d.discount_type === 'percentage' ? <Percent className="h-3 w-3 text-muted-foreground" /> : <DollarSign className="h-3 w-3 text-muted-foreground" />}{getDisplay(d)}</div></div>
              <div><span className="text-muted-foreground">Uses:</span><div className="font-medium">{d.current_uses || 0}{d.max_uses ? ` / ${d.max_uses}` : ' (unlimited)'}</div></div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => openDelete(d)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Discount Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit Discount' : 'Create Discount'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Discount Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" className="uppercase" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Type</Label><Select value={form.discount_type} onValueChange={(v: 'percentage' | 'fixed') => setForm({ ...form, discount_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (£)</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })} min="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Min Order (£)</Label><Input type="number" value={form.min_order_amount || ''} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value ? parseFloat(e.target.value) : null })} placeholder="No minimum" min="0" /></div>
              <div className="space-y-2"><Label>Max Uses</Label><Input type="number" value={form.max_uses || ''} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" min="1" /></div>
            </div>
            <div className="space-y-2">
              <Label>Store (optional)</Label>
              <Select value={form.store_id || 'platform'} onValueChange={(v) => setForm({ ...form, store_id: v === 'platform' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Platform-wide" /></SelectTrigger>
                <SelectContent><SelectItem value="platform">Platform-wide (all stores)</SelectItem>{stores?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">If set, code only works for this store's products</p>
            </div>
            <div className="space-y-2"><Label>Expires At</Label><Input type="date" value={form.expires_at || ''} onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.code.trim()) { toast.error('Code required'); return; } saveMutation.mutate(form); }} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Discount Code</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{selected?.code}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selected?.id && deleteMutation.mutate(selected.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

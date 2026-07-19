import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Sparkles, Gift, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';

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

const emptyForm: PromotionForm = {
  name: '', description: '', promotion_type: 'signup_eclipse_plus',
  eclipse_plus_days: 30, is_active: false, starts_at: null, ends_at: null, max_claims: null, new_users_only: true,
};

export function SpecialOffersTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PromotionForm | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('promotions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PromotionForm) => {
      const payload = {
        name: data.name, description: data.description, promotion_type: data.promotion_type,
        eclipse_plus_days: data.eclipse_plus_days, is_active: data.is_active,
        starts_at: data.starts_at || null, ends_at: data.ends_at || null,
        max_claims: data.max_claims, new_users_only: data.new_users_only,
      };
      if (data.id) {
        const { error } = await (supabase.from as any)('promotions').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)('promotions').insert({ ...payload, created_by: user?.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Offer saved'); queryClient.invalidateQueries({ queryKey: ['admin-promotions'] }); setDialogOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['admin-promotions'] }); setDeleteDialogOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStatusBadge = (p: any) => {
    if (!p.is_active) return <Badge variant="secondary">Inactive</Badge>;
    const now = new Date();
    if (p.starts_at && new Date(p.starts_at) > now) return <Badge variant="outline">Scheduled</Badge>;
    if (p.ends_at && new Date(p.ends_at) < now) return <Badge variant="destructive">Ended</Badge>;
    if (p.max_claims && (p.current_claims || 0) >= p.max_claims) return <Badge variant="secondary">Maxed Out</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-600">Active</Badge>;
  };

  const getTypeLabel = (t: string) => {
    switch (t) { case 'signup_eclipse_plus': return 'Signup Reward'; case 'first_purchase_eclipse_plus': return 'First Purchase Reward'; default: return t; }
  };

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (p: any) => { setForm({ id: p.id, name: p.name, description: p.description || '', promotion_type: p.promotion_type, eclipse_plus_days: p.eclipse_plus_days, is_active: p.is_active, starts_at: p.starts_at?.split('T')[0] || null, ends_at: p.ends_at?.split('T')[0] || null, max_claims: p.max_claims, new_users_only: p.new_users_only ?? true }); setDialogOpen(true); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openDelete = (p: any) => { setSelected(p); setDeleteDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground">Create special promotions and rewards for new signups</p>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Offer</Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Reward</TableHead>
              <TableHead>Claims</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : promotions?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No special offers yet</TableCell></TableRow>
            ) : promotions?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm">{getTypeLabel(p.promotion_type)}</TableCell>
                <TableCell><div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-500" />{p.eclipse_plus_days} reward days</div></TableCell>
                <TableCell>{p.current_claims || 0}{p.max_claims && ` / ${p.max_claims}`}</TableCell>
                <TableCell className="text-sm">{p.starts_at || p.ends_at ? <>{p.starts_at && format(new Date(p.starts_at), 'MMM d')}{p.starts_at && p.ends_at && ' - '}{p.ends_at && format(new Date(p.ends_at), 'MMM d')}</> : 'Always'}</TableCell>
                <TableCell>{getStatusBadge(p)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Edit" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : promotions?.length === 0 ? <div className="text-center py-8 text-muted-foreground">No special offers yet</div> : promotions?.map((p) => (
          <div key={p.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between"><span className="font-medium">{p.name}</span>{getStatusBadge(p)}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Type:</span><div className="font-medium text-xs">{getTypeLabel(p.promotion_type)}</div></div>
              <div><span className="text-muted-foreground">Reward:</span><div className="flex items-center gap-1 font-medium"><Sparkles className="h-3 w-3 text-amber-500" />{p.eclipse_plus_days}d reward</div></div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => openDelete(p)}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Promotion Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? 'Edit Offer' : 'Create Special Offer'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Offer Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. January Signup Bonus" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal notes..." rows={2} /></div>
            <div className="space-y-2">
              <Label>Promotion Type</Label>
              <Select value={form.promotion_type} onValueChange={(v: 'signup_eclipse_plus' | 'first_purchase_eclipse_plus') => setForm({ ...form, promotion_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signup_eclipse_plus"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Signup Reward</div></SelectItem>
                  <SelectItem value="first_purchase_eclipse_plus"><div className="flex items-center gap-2"><Gift className="h-4 w-4" />First Purchase Reward</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reward Days</Label>
              <Select value={String(form.eclipse_plus_days)} onValueChange={(v) => setForm({ ...form, eclipse_plus_days: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="7">7 days</SelectItem><SelectItem value="14">14 days</SelectItem><SelectItem value="30">30 days</SelectItem><SelectItem value="60">60 days</SelectItem><SelectItem value="90">90 days</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Starts At</Label><Input type="date" value={form.starts_at || ''} onChange={(e) => setForm({ ...form, starts_at: e.target.value || null })} /></div>
              <div className="space-y-2"><Label>Ends At</Label><Input type="date" value={form.ends_at || ''} onChange={(e) => setForm({ ...form, ends_at: e.target.value || null })} /></div>
            </div>
            <div className="space-y-2"><Label>Max Claims</Label><Input type="number" value={form.max_claims || ''} onChange={(e) => setForm({ ...form, max_claims: e.target.value ? parseInt(e.target.value) : null })} placeholder="Unlimited" min="1" /></div>
            <div className="flex items-center justify-between"><div><Label>New Users Only</Label><p className="text-xs text-muted-foreground">Only first-time accounts can claim</p></div><Switch checked={form.new_users_only} onCheckedChange={(c) => setForm({ ...form, new_users_only: c })} /></div>
            <div className="flex items-center justify-between"><div><Label>Active</Label><p className="text-xs text-muted-foreground">Enable this promotion</p></div><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!form.name.trim()) { toast.error('Name required'); return; } saveMutation.mutate(form); }} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Promotion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{selected?.name}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selected?.id && deleteMutation.mutate(selected.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

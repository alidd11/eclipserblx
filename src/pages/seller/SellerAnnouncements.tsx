import { useState, useEffect } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Megaphone, Plus, Trash2, Edit, Pin, PinOff, 
  ExternalLink, Calendar, Info
} from 'lucide-react';

interface Announcement {
  id: string;
  store_id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  is_active: boolean;
  pinned: boolean;
  created_at: string;
  expires_at: string | null;
}

const TYPES = [
  { id: 'general', name: 'General', color: 'bg-blue-500/10 text-blue-500' },
  { id: 'sale', name: 'Sale', color: 'bg-green-500/10 text-green-500' },
  { id: 'new_product', name: 'New Product', color: 'bg-purple-500/10 text-purple-500' },
  { id: 'update', name: 'Update', color: 'bg-amber-500/10 text-amber-500' },
];

export default function SellerAnnouncements() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', message: '', type: 'general', link_url: '', is_active: true, pinned: false, expires_at: ''
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['seller-announcements', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_announcements')
        .select('*')
        .eq('store_id', store.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!store?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store');
      const { error } = await supabase.from('store_announcements').insert({
        store_id: store.id,
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        link_url: form.link_url.trim() || null,
        is_active: form.is_active,
        pinned: form.pinned,
        expires_at: form.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Announcement created!');
      queryClient.invalidateQueries({ queryKey: ['seller-announcements'] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from('store_announcements').update({
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        link_url: form.link_url.trim() || null,
        is_active: form.is_active,
        pinned: form.pinned,
        expires_at: form.expires_at || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Announcement updated!');
      queryClient.invalidateQueries({ queryKey: ['seller-announcements'] });
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('store_announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Announcement deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-announcements'] });
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('store_announcements')
        .update({ is_active, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-announcements'] }),
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditing(null);
    setForm({ title: '', message: '', type: 'general', link_url: '', is_active: true, pinned: false, expires_at: '' });
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title, message: a.message, type: a.type,
      link_url: a.link_url || '', is_active: a.is_active, pinned: a.pinned,
      expires_at: a.expires_at ? a.expires_at.split('T')[0] : '',
    });
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (editing) updateMutation.mutate();
    else createMutation.mutate();
  };

  const getTypeBadge = (type: string) => {
    const t = TYPES.find(t => t.id === type) || TYPES[0];
    return <Badge variant="outline" className={t.color}>{t.name}</Badge>;
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">Post updates visible on your store page</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>

        <Card className="mb-6 bg-blue-500/5 border-blue-500/20">
          <CardContent className="flex items-start gap-3 py-4">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Announcements appear on your store page. Pinned announcements stay at the top. 
              Followers with notifications enabled will be alerted about new announcements.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-20" />)
          ) : announcements && announcements.length > 0 ? (
            announcements.map(a => (
              <Card key={a.id} className={!a.is_active ? 'opacity-60' : ''}>
                <CardContent className="flex items-start justify-between py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      <span className="font-semibold">{a.title}</span>
                      {getTypeBadge(a.type)}
                      {!a.is_active && <Badge variant="secondary">Hidden</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(a.created_at), 'MMM d, yyyy')}</span>
                      {a.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires {format(new Date(a.expires_at), 'MMM d')}
                        </span>
                      )}
                      {a.link_url && <ExternalLink className="h-3 w-3" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(c) => toggleActive.mutate({ id: a.id, is_active: c })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Announcements</h3>
                <p className="text-muted-foreground mb-4">
                  Create announcements to keep your customers informed
                </p>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />Create Announcement
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog || !!editing} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update your announcement' : 'Create a new announcement for your store'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Summer Sale is Live!" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Details about your announcement..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Pin to top</Label>
              <Switch checked={form.pinned} onCheckedChange={c => setForm({...form, pinned: c})} />
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
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

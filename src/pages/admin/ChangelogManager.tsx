import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { format } from '@/lib/dateUtils';

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  published_at: string | null;
  created_at: string;
}

export default function ChangelogManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'feature' });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['admin-changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChangelogEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('changelog_entries').update(form).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('changelog_entries').insert({
          ...form,
          published_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-changelog'] });
      toast.success(editingId ? 'Entry updated' : 'Entry created');
      resetForm();
    },
    onError: () => toast.error('Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('changelog_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-changelog'] });
      toast.success('Entry deleted');
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('changelog_entries')
        .update({ published_at: published ? null : new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-changelog'] }),
  });

  const resetForm = () => {
    setForm({ title: '', description: '', category: 'feature' });
    setEditingId(null);
    setDialogOpen(false);
  };

  const openEdit = (entry: ChangelogEntry) => {
    setForm({ title: entry.title, description: entry.description, category: entry.category });
    setEditingId(entry.id);
    setDialogOpen(true);
  };

  return (
    <AdminLayout requiredPermissions={['manage_settings']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Changelog</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage platform update entries</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
            <DialogTrigger asChild>
              <Button className="gradient-button border-0">
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Entry' : 'New Changelog Entry'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                />
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="fix">Fix</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Describe the change..."
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
                <Button
                  className="w-full"
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.title || !form.description || saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Publish Entry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{entry.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {entry.published_at ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => togglePublish.mutate({ id: entry.id, published: !!entry.published_at })} aria-label={entry.published_at ? 'Unpublish' : 'Publish'}>
                        {entry.published_at ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(entry)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(entry.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!entries?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No changelog entries yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

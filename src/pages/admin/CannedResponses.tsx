import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '@/hooks/usePageMeta';

interface CannedResponse {
  id: string;
  title: string;
  body: string;
  category: string | null;
  created_at: string;
}

export default function CannedResponses() {
  usePageMeta({ title: 'Canned Responses', description: 'Manage quick reply templates for support tickets.' });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');

  const { data: responses, isLoading } = useQuery({
    queryKey: ['admin-canned-responses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .order('title');
      if (error) throw error;
      return data as CannedResponse[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (editing) {
        const { error } = await supabase
          .from('canned_responses')
          .update({ title, body, category: category || null, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('canned_responses')
          .insert({ title, body, category: category || null, created_by: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-canned-responses'] });
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      toast.success(editing ? 'Response updated' : 'Response created');
      closeDialog();
    },
    onError: () => toast.error('Failed to save'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('canned_responses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-canned-responses'] });
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
      toast.success('Response deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setCategory('');
    setShowDialog(true);
  };

  const openEdit = (r: CannedResponse) => {
    setEditing(r);
    setTitle(r.title);
    setBody(r.body);
    setCategory(r.category || '');
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditing(null);
    setTitle('');
    setBody('');
    setCategory('');
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Canned Responses</h1>
            <p className="text-sm text-muted-foreground mt-1">Quick reply templates used across all ticket types</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Response
          </Button>
        </div>

        <div className="border border-border rounded-xl divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : !responses?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No canned responses yet. Create one to get started.</p>
            </div>
          ) : (
            responses.map((r) => (
              <div key={r.id} className="p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-foreground">{r.title}</span>
                    {r.category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{r.category}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Response' : 'New Canned Response'}</DialogTitle>
            <DialogDescription>Create a quick reply template that staff can insert into ticket replies.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Greeting" />
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. general, refund" />
            </div>
            <div className="space-y-1.5">
              <Label>Response Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type the response template..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!title.trim() || !body.trim() || save.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

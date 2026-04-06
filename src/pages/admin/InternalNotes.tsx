import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Pin, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';

const CATEGORIES = ['general', 'note', 'proof', 'evidence'];
const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  note: 'bg-blue-500/10 text-blue-500',
  proof: 'bg-green-500/10 text-green-500',
  evidence: 'bg-orange-500/10 text-orange-500',
};

const db = supabase as any;

export default function InternalNotes() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['internal-notes', filterCategory],
    queryFn: async () => {
      let query = db
        .from('internal_notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const { error } = await db.from('internal_notes').insert({
        author_id: user!.id,
        title: newTitle,
        content: newContent,
        category: newCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-notes'] });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      toast.success('Note created');
    },
    onError: () => toast.error('Failed to create note'),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await db.from('internal_notes').update({ is_pinned: !pinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['internal-notes'] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('internal_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-notes'] });
      toast.success('Note deleted');
    },
  });

  const filtered = notes.filter((n) =>
    !search ||
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" /> Internal Notes
            </h1>
            <p className="text-muted-foreground text-sm">Shared notes, proof, and evidence for the team.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Note</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Note</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Note title..." />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Write your note..." rows={6} />
                </div>
                <Button onClick={() => createNote.mutate()} disabled={!newTitle.trim() || !newContent.trim() || createNote.isPending} className="w-full">
                  {createNote.isPending ? 'Creating...' : 'Create Note'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="border border-border rounded-xl overflow-hidden"><div className="p-4 p-8 text-center text-muted-foreground">No notes yet. Create your first one!</div></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((note) => (
              <div key={note.id} className={note.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
                <div className="p-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {note.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                        <h3 className="font-semibold text-sm">{note.title}</h3>
                        <Badge className={`text-[10px] ${CATEGORY_COLORS[note.category] || CATEGORY_COLORS.general}`}>
                          {note.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{note.content}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-2">
                        {format(new Date(note.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePin.mutate({ id: note.id, pinned: note.is_pinned })}>
                          <Pin className={`h-3.5 w-3.5 ${note.is_pinned ? 'text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                      )}
                      {(note.author_id === user?.id || isAdmin) && (
                        <Button variant="ghost" size="icon" aria-label="Delete" className="h-8 w-8 text-destructive" onClick={() => deleteNote.mutate(note.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { FileText, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';

const EMPTY_FORM = { title: '', description: '', work_type: '', proof_urls: '', roblox_asset_ids: '', roblox_universe_ids: '', search_keywords: '' };

export default function IPShieldRegistry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [registryForm, setRegistryForm] = useState(EMPTY_FORM);

  const { data: ipRegistry, isLoading: registryLoading } = useQuery({
    queryKey: ['ip-registry', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_ip_registry')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const openAdd = () => {
    setEditingId(null);
    setRegistryForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (work: any) => {
    setEditingId(work.id);
    setRegistryForm({
      title: work.title || '',
      description: work.description || '',
      work_type: work.work_type || '',
      proof_urls: (work.proof_urls || []).join('\n'),
      roblox_asset_ids: (work.roblox_asset_ids || []).join(', '),
      roblox_universe_ids: (work.roblox_universe_ids || []).join(', '),
      search_keywords: (work.search_keywords || []).join(', '),
    });
    setShowDialog(true);
  };

  const parseForm = () => ({
    title: registryForm.title,
    description: registryForm.description || null,
    work_type: registryForm.work_type,
    proof_urls: registryForm.proof_urls ? registryForm.proof_urls.split('\n').filter(Boolean) : [],
    roblox_asset_ids: registryForm.roblox_asset_ids ? registryForm.roblox_asset_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
    roblox_universe_ids: registryForm.roblox_universe_ids ? registryForm.roblox_universe_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
    search_keywords: registryForm.search_keywords ? registryForm.search_keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
  });

  const saveWork = useMutation({
    mutationFn: async () => {
      const payload = parseForm();
      if (editingId) {
        const { error } = await supabase.from('creator_ip_registry').update(payload).eq('id', editingId).eq('creator_id', user!.id);
        if (error) throw error;
        return { id: editingId, isNew: false };
      } else {
        const { data, error } = await supabase.from('creator_ip_registry').insert({ ...payload, creator_id: user!.id }).select('id').single();
        if (error) throw error;
        return { id: data.id, isNew: true };
      }
    },
    onSuccess: async (result) => {
      toast({ title: editingId ? 'Work updated' : 'Work registered', description: editingId ? 'Changes saved.' : 'Running initial copy scan...' });
      setShowDialog(false);
      setRegistryForm(EMPTY_FORM);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['ip-registry'] });

      if (result.isNew && result.id) {
        try {
          const { data: scanData } = await supabase.functions.invoke('scan-roblox-copies', {
            body: { registry_entry_id: result.id },
          });
          toast({ title: 'Initial scan complete', description: `Found ${scanData?.total_detected || 0} potential copies.` });
          queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
          queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
        } catch {
          // Silent fail
        }
      }
    },
    onError: (error) => {
      toast({ title: editingId ? 'Failed to update' : 'Failed to register', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <IPShieldLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              IP Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Register your original works for faster takedown processing. New entries are auto-scanned.
            </p>
          </div>
          <Button variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Register Work
          </Button>
        </div>

        {registryLoading ? (
          <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : ipRegistry?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold">No registered works</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Registering your original works helps us process takedown requests faster.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {ipRegistry?.map(work => (
              <Card key={work.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{work.title}</span>
                        <Badge variant="outline" className="capitalize">{work.work_type}</Badge>
                      </div>
                      {work.description && <p className="text-sm text-muted-foreground mt-1">{work.description}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {work.roblox_universe_ids?.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{work.roblox_universe_ids.length} Universe ID{work.roblox_universe_ids.length > 1 ? 's' : ''}</Badge>
                        )}
                        {work.roblox_asset_ids?.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{work.roblox_asset_ids.length} Asset ID{work.roblox_asset_ids.length > 1 ? 's' : ''}</Badge>
                        )}
                        {work.search_keywords?.length > 0 && (
                          <Badge variant="secondary" className="text-xs">{work.search_keywords.length} Keywords</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Registered {format(new Date(work.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(work)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add / Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Registered Work' : 'Register Original Work'}</DialogTitle>
              <DialogDescription>
                {editingId ? 'Update the details of your registered work.' : 'Pre-register your intellectual property. A copy scan runs automatically after registration.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Work Title *</Label>
                <Input value={registryForm.title} onChange={e => setRegistryForm(f => ({ ...f, title: e.target.value }))} placeholder="Name of your creation" />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={registryForm.work_type} onValueChange={v => setRegistryForm(f => ({ ...f, work_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Type of work..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="script">Script</SelectItem>
                    <SelectItem value="model">Model</SelectItem>
                    <SelectItem value="ui">UI/Interface</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                    <SelectItem value="brand">Brand/Logo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={registryForm.description} onChange={e => setRegistryForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your work..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Proof URLs (one per line)</Label>
                <Textarea value={registryForm.proof_urls} onChange={e => setRegistryForm(f => ({ ...f, proof_urls: e.target.value }))} placeholder="Links to screenshots, videos..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Roblox Asset IDs (comma-separated)</Label>
                <Input value={registryForm.roblox_asset_ids} onChange={e => setRegistryForm(f => ({ ...f, roblox_asset_ids: e.target.value }))} placeholder="123456, 789012" />
              </div>

              <div className="space-y-2">
                <Label>Roblox Universe IDs (comma-separated)</Label>
                <Input value={registryForm.roblox_universe_ids} onChange={e => setRegistryForm(f => ({ ...f, roblox_universe_ids: e.target.value }))} placeholder="111111, 222222" />
              </div>

              <div className="space-y-2">
                <Label>Search Keywords (comma-separated)</Label>
                <Input value={registryForm.search_keywords} onChange={e => setRegistryForm(f => ({ ...f, search_keywords: e.target.value }))} placeholder="my game, cool script" />
                <p className="text-xs text-muted-foreground">These keywords are used to find potential copies on Roblox.</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveWork.mutate()} disabled={!registryForm.title || !registryForm.work_type || saveWork.isPending}>
                {saveWork.isPending ? (editingId ? 'Saving...' : 'Registering...') : (editingId ? 'Save Changes' : 'Register Work')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </IPShieldLayout>
  );
}

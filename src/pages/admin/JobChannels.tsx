import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Power, PowerOff, GripVertical, Briefcase, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface JobChannel {
  id: string;
  title: string;
  type: string;
  location: string;
  description: string;
  requirements: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const JOB_TYPES = ['Freelance', 'Contract', 'Volunteer', 'Part-time', 'Full-time'];

export default function JobChannels() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminAuth();
  const [editingChannel, setEditingChannel] = useState<JobChannel | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'Freelance',
    location: 'Remote',
    description: '',
    requirements: '',
    is_active: true,
  });

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['job-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_channels')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as JobChannel[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const requirements = data.requirements
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);
      
      const { error } = await supabase
        .from('job_channels')
        .insert({
          title: data.title,
          type: data.type,
          location: data.location,
          description: data.description,
          requirements,
          is_active: data.is_active,
          display_order: (channels.length + 1) * 10,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-channels'] });
      toast.success('Job channel created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create job channel');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const requirements = data.requirements
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);
      
      const { error } = await supabase
        .from('job_channels')
        .update({
          title: data.title,
          type: data.type,
          location: data.location,
          description: data.description,
          requirements,
          is_active: data.is_active,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-channels'] });
      toast.success('Job channel updated');
      setEditingChannel(null);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update job channel');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('job_channels')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-channels'] });
      toast.success('Channel status updated');
    },
    onError: () => {
      toast.error('Failed to update channel status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_channels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-channels'] });
      toast.success('Job channel deleted');
    },
    onError: () => {
      toast.error('Failed to delete job channel');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'Freelance',
      location: 'Remote',
      description: '',
      requirements: '',
      is_active: true,
    });
  };

  const openEditDialog = (channel: JobChannel) => {
    setEditingChannel(channel);
    setFormData({
      title: channel.title,
      type: channel.type,
      location: channel.location,
      description: channel.description,
      requirements: channel.requirements.join('\n'),
      is_active: channel.is_active,
    });
  };

  const handleCreate = () => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in title and description');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingChannel || !formData.title || !formData.description) {
      toast.error('Please fill in title and description');
      return;
    }
    updateMutation.mutate({ id: editingChannel.id, data: formData });
  };

  const stats = {
    total: channels.length,
    active: channels.filter(c => c.is_active).length,
    inactive: channels.filter(c => !c.is_active).length,
  };

  return (
    <AdminLayout requiredRoles={['admin', 'recruiter']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display">Job Channels</CardTitle>
                <CardDescription>Manage available job positions and openings</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Add Channel
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Job Channel</DialogTitle>
                    <DialogDescription>
                      Add a new job position that applicants can apply for
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Livery Designer"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Remote"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the role and responsibilities..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Requirements (one per line)</Label>
                      <Textarea
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                        placeholder="Proficient in Photoshop&#10;Knowledge of UK emergency services&#10;Portfolio of previous work"
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Active (visible to applicants)</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Channel'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
        </div>

        {/* Channels List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Channels ({channels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading channels...</p>
            ) : channels.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No job channels yet. Create one to get started.</p>
            ) : (
              <div className="space-y-3">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="p-4 rounded-lg bg-muted/50 border border-border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{channel.title}</h3>
                          <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                            {channel.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {channel.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {channel.location}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {channel.description}
                        </p>
                        {channel.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {channel.requirements.slice(0, 3).map((req, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                            {channel.requirements.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{channel.requirements.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActiveMutation.mutate({ id: channel.id, is_active: !channel.is_active })}
                          title={channel.is_active ? 'Disable' : 'Enable'}
                        >
                          {channel.is_active ? (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(channel)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Job Channel</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{channel.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(channel.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingChannel} onOpenChange={(open) => { if (!open) { setEditingChannel(null); resetForm(); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Channel</DialogTitle>
              <DialogDescription>
                Update the job position details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Livery Designer"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Remote"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role and responsibilities..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Requirements (one per line)</Label>
                <Textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Proficient in Photoshop&#10;Knowledge of UK emergency services&#10;Portfolio of previous work"
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active (visible to applicants)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingChannel(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
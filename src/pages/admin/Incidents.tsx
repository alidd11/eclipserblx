import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, AlertTriangle, CheckCircle, Clock, Search, Edit, Trash2, MessageSquarePlus } from 'lucide-react';
import { format } from 'date-fns';

interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  affected_services: string[] | null;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: string;
  message: string;
  created_at: string;
}

const statusOptions = [
  { value: 'investigating', label: 'Investigating', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'identified', label: 'Identified', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'monitoring', label: 'Monitoring', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

const severityOptions = [
  { value: 'minor', label: 'Minor', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'major', label: 'Major', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const serviceOptions = ['Website', 'API', 'Database', 'Authentication', 'Payments', 'File Storage'];

export default function AdminIncidents() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'investigating',
    severity: 'minor',
    affected_services: [] as string[],
  });
  
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  // Fetch incidents
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['admin-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Incident[];
    },
  });

  // Fetch incident updates for selected incident
  const { data: incidentUpdates } = useQuery({
    queryKey: ['incident-updates', selectedIncident?.id],
    queryFn: async () => {
      if (!selectedIncident) return [];
      const { data, error } = await supabase
        .from('incident_updates')
        .select('*')
        .eq('incident_id', selectedIncident.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IncidentUpdate[];
    },
    enabled: !!selectedIncident,
  });

  // Create incident mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('incidents').insert([{
        title: data.title,
        description: data.description || null,
        status: data.status,
        severity: data.severity,
        affected_services: data.affected_services.length > 0 ? data.affected_services : null,
        started_at: new Date().toISOString(),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success('Incident created successfully');
    },
    onError: (error) => {
      console.error('Failed to create incident:', error);
      toast.error('Failed to create incident');
    },
  });

  // Update incident mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Incident> }) => {
      const { error } = await supabase
        .from('incidents')
        .update(data.updates)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      setIsEditDialogOpen(false);
      setSelectedIncident(null);
      toast.success('Incident updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update incident:', error);
      toast.error('Failed to update incident');
    },
  });

  // Add incident update mutation
  const addUpdateMutation = useMutation({
    mutationFn: async (data: { incident_id: string; status: string; message: string }) => {
      // Add the update
      const { error: updateError } = await supabase.from('incident_updates').insert([data]);
      if (updateError) throw updateError;
      
      // Update the incident status
      const updates: Partial<Incident> = { status: data.status };
      if (data.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      
      const { error: incidentError } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', data.incident_id);
      if (incidentError) throw incidentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-updates'] });
      setIsUpdateDialogOpen(false);
      setUpdateMessage('');
      setUpdateStatus('');
      toast.success('Update posted successfully');
    },
    onError: (error) => {
      console.error('Failed to add update:', error);
      toast.error('Failed to add update');
    },
  });

  // Delete incident mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete updates first
      const { error: updatesError } = await supabase
        .from('incident_updates')
        .delete()
        .eq('incident_id', id);
      if (updatesError) throw updatesError;
      
      // Then delete incident
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      toast.success('Incident deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete incident:', error);
      toast.error('Failed to delete incident');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'investigating',
      severity: 'minor',
      affected_services: [],
    });
  };

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (incident: Incident) => {
    setSelectedIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description || '',
      status: incident.status,
      severity: incident.severity,
      affected_services: incident.affected_services || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedIncident) return;
    updateMutation.mutate({
      id: selectedIncident.id,
      updates: {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        severity: formData.severity,
        affected_services: formData.affected_services.length > 0 ? formData.affected_services : null,
        resolved_at: formData.status === 'resolved' ? new Date().toISOString() : null,
      },
    });
  };

  const handleAddUpdate = () => {
    if (!selectedIncident || !updateMessage.trim() || !updateStatus) {
      toast.error('Message and status are required');
      return;
    }
    addUpdateMutation.mutate({
      incident_id: selectedIncident.id,
      status: updateStatus,
      message: updateMessage,
    });
  };

  const openUpdateDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setUpdateStatus(incident.status);
    setIsUpdateDialogOpen(true);
  };

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      affected_services: prev.affected_services.includes(service)
        ? prev.affected_services.filter(s => s !== service)
        : [...prev.affected_services, service],
    }));
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    return option ? <Badge className={option.color}>{option.label}</Badge> : <Badge>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const option = severityOptions.find(o => o.value === severity);
    return option ? <Badge className={option.color}>{option.label}</Badge> : <Badge>{severity}</Badge>;
  };

  const filteredIncidents = incidents?.filter(incident =>
    incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <AdminLayout requiredRoles={['admin']}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display">Incident Management</CardTitle>
                <CardDescription>Create and manage system incidents</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Incident
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Incident</DialogTitle>
                    <DialogDescription>Report a new system incident</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Brief incident title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed description of the incident"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={v => setFormData(prev => ({ ...prev, status: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select value={formData.severity} onValueChange={v => setFormData(prev => ({ ...prev, severity: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {severityOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Affected Services</Label>
                      <div className="flex flex-wrap gap-2">
                        {serviceOptions.map(service => (
                          <Badge
                            key={service}
                            variant={formData.affected_services.includes(service) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleService(service)}
                          >
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Incident
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Incidents List */}
        <div className="space-y-4">
          {filteredIncidents?.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">No incidents found</p>
                <p className="text-muted-foreground">All systems are operating normally</p>
              </CardContent>
            </Card>
          ) : (
            filteredIncidents?.map(incident => (
              <Card key={incident.id} className="bg-card border-border">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {incident.status !== 'resolved' && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                        )}
                        {incident.status === 'resolved' && (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <h3 className="font-semibold">{incident.title}</h3>
                        {getStatusBadge(incident.status)}
                        {getSeverityBadge(incident.severity)}
                      </div>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {format(new Date(incident.started_at), 'MMM d, yyyy HH:mm')}
                        </span>
                        {incident.resolved_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Resolved: {format(new Date(incident.resolved_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                      {incident.affected_services && incident.affected_services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {incident.affected_services.map(service => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openUpdateDialog(incident)}
                      >
                        <MessageSquarePlus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Add Update</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(incident)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this incident?')) {
                            deleteMutation.mutate(incident.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Incident Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
            <DialogDescription>Update incident details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={formData.severity} onValueChange={v => setFormData(prev => ({ ...prev, severity: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Affected Services</Label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map(service => (
                  <Badge
                    key={service}
                    variant={formData.affected_services.includes(service) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleService(service)}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Update</DialogTitle>
            <DialogDescription>
              Add a status update for: {selectedIncident?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-message">Update Message *</Label>
              <Textarea
                id="update-message"
                value={updateMessage}
                onChange={e => setUpdateMessage(e.target.value)}
                placeholder="Describe the current status and any actions taken..."
                rows={4}
              />
            </div>
            
            {/* Previous Updates */}
            {incidentUpdates && incidentUpdates.length > 0 && (
              <div className="space-y-2">
                <Label>Previous Updates</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 bg-muted/50 rounded-lg p-3">
                  {incidentUpdates.map(update => (
                    <div key={update.id} className="text-sm">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(update.created_at), 'MMM d, HH:mm')}</span>
                        {getStatusBadge(update.status)}
                      </div>
                      <p className="mt-1">{update.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUpdate} disabled={addUpdateMutation.isPending}>
              {addUpdateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Post Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPStaffLayout } from '@/components/ip-staff/IPStaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Search, Mail, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  open: { label: 'Open', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'outline' },
  closed: { label: 'Closed', variant: 'outline' },
};

export default function IPStaffInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [staffNotes, setStaffNotes] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['ip-staff-inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_shield_contact_messages' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const updateMessage = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('ip_shield_contact_messages' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Message updated');
      queryClient.invalidateQueries({ queryKey: ['ip-staff-inbox'] });
      setSelectedMessage(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const markResolved = (msg: any) => {
    updateMessage.mutate({
      id: msg.id,
      updates: {
        status: 'resolved',
        responded_at: new Date().toISOString(),
        responded_by: user?.id,
        staff_notes: staffNotes || msg.staff_notes,
      },
    });
  };

  const filtered = messages?.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s) || m.subject?.toLowerCase().includes(s);
    }
    return true;
  }) || [];

  return (
    <IPStaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" /> Contact Inbox
          </h1>
          <p className="text-muted-foreground text-sm mt-1">IP Shield contact messages from users</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, or subject..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No contact messages found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(msg => (
              <Card key={msg.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setSelectedMessage(msg); setStaffNotes(msg.staff_notes || ''); }}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{msg.name}</span>
                        <span className="text-xs text-muted-foreground">{msg.email}</span>
                        <Badge variant={STATUS_BADGE[msg.status]?.variant || 'outline'}>
                          {STATUS_BADGE[msg.status]?.label || msg.status}
                        </Badge>
                        {msg.priority !== 'normal' && <Badge variant="destructive" className="text-[10px]">{msg.priority}</Badge>}
                      </div>
                      <p className="text-sm font-medium">{msg.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{msg.message}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Message Detail Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedMessage?.subject}</DialogTitle>
              <DialogDescription>From {selectedMessage?.name} ({selectedMessage?.email})</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {selectedMessage?.message}
              </div>

              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Select
                  value={selectedMessage?.status}
                  onValueChange={(status) => updateMessage.mutate({ id: selectedMessage.id, updates: { status } })}
                >
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Staff Notes</Label>
                <Textarea value={staffNotes} onChange={e => setStaffNotes(e.target.value)} placeholder="Internal notes..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMessage(null)}>Close</Button>
              <Button onClick={() => markResolved(selectedMessage)} disabled={updateMessage.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </IPStaffLayout>
  );
}

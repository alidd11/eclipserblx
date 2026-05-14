import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Eye, EyeOff, Copy, Clock } from 'lucide-react';
import { useActiveStore } from '@/contexts/ActiveStoreContext';
import { format, formatRelative } from '@/lib/dateUtils';
import { WebhookDeliveryLogs } from '@/components/seller/WebhookDeliveryLogs';

const AVAILABLE_EVENTS = [
  { value: 'order.created', label: 'New Order' },
  { value: 'order.completed', label: 'Order Completed' },
  { value: 'dispute.opened', label: 'Dispute Opened' },
  { value: 'dispute.resolved', label: 'Dispute Resolved' },
  { value: 'payout.sent', label: 'Payout Sent' },
  { value: 'review.created', label: 'New Review' },
];

export default function SellerWebhooks() {
  const { activeStoreId } = useActiveStore();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  const storeId = activeStoreId;

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['seller-webhooks', storeId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('seller_webhooks_safe' as any)
        .select('*') as any)
        .eq('store_id', storeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!storeId });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('seller_webhooks').insert({
        store_id: storeId!,
        url,
        events: selectedEvents });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-webhooks'] });
      toast.success('Webhook created');
      setDialogOpen(false);
      setUrl('');
      setSelectedEvents([]);
    },
    onError: () => toast.error('Failed to create webhook') });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('seller_webhooks')
        .update({ is_active: active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-webhooks'] }) });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seller_webhooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-webhooks'] });
      toast.success('Webhook deleted');
    } });

  const toggleSecret = (id: string) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard');
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Webhooks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Receive real-time notifications when events happen in your store
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Webhook Endpoint</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input
                    placeholder="https://your-server.com/webhook"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Events to subscribe</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <label
                        key={event.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                        />
                        {event.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!url || selectedEvents.length === 0 || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Webhook
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !webhooks?.length ? (
          <div className="border border-border rounded-xl p-8 text-center text-muted-foreground">
            <p>No webhooks configured yet.</p>
            <p className="text-sm mt-1">Add one to start receiving real-time event notifications.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Secret</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh: any) => (
                  <React.Fragment key={wh.id}>
                  <TableRow className="group">
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {wh.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(wh.events as string[]).map((e) => (
                          <Badge key={e} variant="outline" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs">
                          {revealedSecrets.has(wh.id)
                            ? wh.secret
                            : '••••••••••••'}
                        </code>
                        <Button variant="ghost" size="icon" aria-label="Toggle secret visibility" className="h-6 w-6" onClick={() => toggleSecret(wh.id)}>
                          {revealedSecrets.has(wh.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Copy secret" className="h-6 w-6" onClick={() => copySecret(wh.secret)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={wh.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: wh.id, active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {wh.last_triggered_at ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelative(wh.last_triggered_at)}
                          {wh.last_status_code && (
                            <Badge variant={wh.last_status_code < 300 ? 'outline' : 'destructive'} className="text-[10px] ml-1">
                              {wh.last_status_code}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(wh.id)}
                        aria-label="Delete webhook"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <tr>
                    <td colSpan={6} className="p-0">
                      <WebhookDeliveryLogs webhookId={wh.id} />
                    </td>
                  </tr>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* HMAC Info */}
        <div className="border border-border rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-sm">Verifying Webhook Signatures</h3>
          <p className="text-sm text-muted-foreground">
            Each webhook delivery includes an <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Webhook-Signature</code> header
            containing an HMAC-SHA256 signature of the request body using your webhook secret.
            Verify this signature to ensure requests are genuinely from Eclipse.
          </p>
        </div>
      </div>
    </SellerLayout>
  );
}

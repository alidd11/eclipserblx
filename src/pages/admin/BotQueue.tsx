import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Clock, CheckCircle2, Loader2, Package, User, AlertCircle,
  Play, Check, Eye, EyeOff, ShieldCheck, ExternalLink, Users, Copy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type BotStatus = 'pending' | 'verified' | 'installing' | 'completed';

interface BotInstallationCode {
  id: string;
  installation_code: string;
  product_name: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  used_by: string | null;
  order_id: string;
  user_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  status: BotStatus;
  discord_invite: string | null;
  discord_guild_name: string | null;
  discord_guild_icon: string | null;
  discord_member_count: number | null;
  profile?: {
    customer_id: string | null;
    display_name: string | null;
    email: string | null;
  } | null;
}

const statusConfig: Record<BotStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
  verified: { label: 'Verified', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: ShieldCheck },
  installing: { label: 'Installing', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
};

export default function BotQueue() {
  const { isAdmin } = useAdminAuth();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [selectedRequest, setSelectedRequest] = useState<BotInstallationCode | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!verifyDialogOpen) {
      setEnteredCode('');
      setCodeVerified(false);
      setShowCode(false);
      setSelectedRequest(null);
    }
  }, [verifyDialogOpen]);

  // Scroll dialog to top when opened
  useEffect(() => {
    if (verifyDialogOpen && dialogRef.current) {
      dialogRef.current.scrollTop = 0;
    }
  }, [verifyDialogOpen]);

  // Fetch all bot installation codes
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['bot-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for requests with user_id
      const userIds = data.filter(r => r.user_id).map(r => r.user_id);
      let profiles: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, customer_id, display_name, email')
          .in('user_id', userIds);
        
        if (profileData) {
          profiles = profileData.reduce((acc, p) => ({ ...acc, [p.user_id]: p }), {});
        }
      }

      return data.map(r => ({
        ...r,
        status: (r.status as BotStatus) || 'pending',
        profile: r.user_id ? profiles[r.user_id] : null
      })) as BotInstallationCode[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('bot-queue-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bot_installation_codes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bot-queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Send status update email
  const sendStatusEmail = async (request: BotInstallationCode, status: BotStatus) => {
    if (!request.profile?.email) {
      console.log('[BotQueue] No customer email found, skipping notification');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-bot-status-update', {
        body: {
          customerEmail: request.profile.email,
          productName: request.product_name,
          installationCode: request.installation_code,
          status: status,
          discordGuildName: request.discord_guild_name || undefined,
        },
      });

      if (error) {
        console.error('[BotQueue] Failed to send status email:', error);
      } else {
        console.log('[BotQueue] Status email sent successfully');
      }
    } catch (err) {
      console.error('[BotQueue] Error sending status email:', err);
    }
  };

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, additionalFields = {}, request }: { 
      id: string; 
      status: BotStatus;
      additionalFields?: Record<string, any>;
      request?: BotInstallationCode;
    }) => {
      const updateData: Record<string, any> = { status, ...additionalFields };
      
      if (status === 'verified') {
        updateData.processed_by = user?.id;
        updateData.processed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.is_used = true;
        updateData.used_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bot_installation_codes')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Send email notification for status changes
      const targetRequest = request || selectedRequest;
      if (targetRequest && ['verified', 'installing', 'completed'].includes(status)) {
        await sendStatusEmail(targetRequest, status);
      }

      // If verified, notify admins via admin chat
      if (status === 'verified' && selectedRequest) {
        const customerInfo = selectedRequest.profile?.customer_id || 'Unknown Customer';
        const customerName = selectedRequest.profile?.display_name || 'Unknown';
        
        await supabase.from('admin_chat_messages').insert({
          user_id: user?.id,
          message: `🤖 **Bot Installation Verified**\n\n` +
            `**Product:** ${selectedRequest.product_name}\n` +
            `**Customer ID:** ${customerInfo}\n` +
            `**Customer Name:** ${customerName}\n` +
            `**Order ID:** ${selectedRequest.order_id}\n\n` +
            `_Code verified by staff. Awaiting admin installation._`,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bot-queue'] });
      const statusLabel = statusConfig[variables.status].label;
      toast.success(`Request marked as ${statusLabel}`);
      setVerifyDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  // Verify code handler
  const handleVerifyCode = () => {
    if (!selectedRequest) return;
    
    if (enteredCode.trim().toUpperCase() === selectedRequest.installation_code.toUpperCase()) {
      setCodeVerified(true);
      toast.success('Code verified successfully!');
    } else {
      toast.error('Invalid code. Please check and try again.');
    }
  };

  // Filter requests by status
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const verifiedRequests = requests.filter(r => r.status === 'verified');
  const installingRequests = requests.filter(r => r.status === 'installing');
  const completedRequests = requests.filter(r => r.status === 'completed');
  const actionRequired = [...pendingRequests, ...verifiedRequests];

  // Status counts
  const counts = {
    pending: pendingRequests.length,
    verified: verifiedRequests.length,
    installing: installingRequests.length,
    completed: completedRequests.length,
  };

  const openActionDialog = (request: BotInstallationCode) => {
    setSelectedRequest(request);
    setVerifyDialogOpen(true);
  };

  const renderStatusBadge = (status: BotStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} gap-1 whitespace-nowrap`}>
        <Icon className={`h-3 w-3 ${status === 'installing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const renderRequestCard = (request: BotInstallationCode) => {
    const isExpired = new Date(request.expires_at) < new Date();
    
    return (
      <Card key={request.id} className={isExpired ? 'opacity-60' : ''}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{request.product_name}</span>
              </div>
              {renderStatusBadge(request.status)}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Customer Info */}
          {request.profile && (
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{request.profile.customer_id || 'No ID'}</span>
              </div>
              <div className="text-muted-foreground pl-5.5">
                {request.profile.display_name || 'Unknown'}
              </div>
            </div>
          )}

          {/* Admin-only: Show code */}
          {isAdmin && (
            <div className="text-xs font-mono bg-muted p-2 rounded whitespace-nowrap overflow-x-auto">
              {request.installation_code}
            </div>
          )}

          {/* Discord Server Info */}
          {request.discord_invite && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-indigo-500/10 border border-indigo-500/30">
                {request.discord_guild_icon ? (
                  <img 
                    src={request.discord_guild_icon} 
                    alt={request.discord_guild_name || 'Server'} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-indigo-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-indigo-500 truncate">
                    {request.discord_guild_name || 'Discord server'}
                  </p>
                  {request.discord_member_count && (
                    <p className="text-xs text-indigo-400 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {request.discord_member_count.toLocaleString()} members
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                onClick={() => window.open(request.discord_invite!, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Join Server
              </Button>
            </div>
          )}

          {!request.discord_invite && request.status !== 'completed' && (
            <div className="text-xs text-muted-foreground italic">
              No Discord invite provided
            </div>
          )}

          {/* Expired warning */}
          {isExpired && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Expired
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {request.status === 'pending' && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => openActionDialog(request)}
                disabled={isExpired}
              >
                Verify Code
              </Button>
            )}
            {request.status === 'verified' && isAdmin && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'installing', request })}
                disabled={updateStatusMutation.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Start Install
              </Button>
            )}
            {request.status === 'installing' && isAdmin && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed', request })}
                disabled={updateStatusMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            {request.status === 'verified' && !isAdmin && (
              <span className="text-xs text-muted-foreground">Awaiting admin installation</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bot Installation Queue</h1>
          <p className="text-muted-foreground">Manage bot installation requests and track progress</p>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.entries(counts) as [BotStatus, number][]).map(([status, count]) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <Card key={status}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className={`h-5 w-5 ${status === 'installing' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="action" className="space-y-4" onValueChange={() => {}}>
          {/* Dropdown for all devices */}
          <Select defaultValue="action" onValueChange={(value) => {
            const trigger = document.querySelector(`[data-value="${value}"]`) as HTMLElement;
            trigger?.click();
          }}>
            <SelectTrigger className="w-full max-w-md bg-card">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[100]">
              <SelectItem value="action">
                <div className="flex items-center gap-2">
                  Action Required
                  {actionRequired.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {actionRequired.length}
                    </Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="progress">
                <div className="flex items-center gap-2">
                  In Progress
                  {installingRequests.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {installingRequests.length}
                    </Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  Completed
                  {completedRequests.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {completedRequests.length}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Hidden triggers for tab switching */}
          <div className="hidden">
            <button data-value="action" onClick={() => {}} />
            <button data-value="progress" onClick={() => {}} />
            <button data-value="completed" onClick={() => {}} />
          </div>

          <TabsContent value="action" className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : actionRequired.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {actionRequired.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {installingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No installations in progress</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {installingRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No completed installations yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedRequests.slice(0, 12).map(renderRequestCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Verify/Action Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent ref={dialogRef} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === 'pending' ? 'Verify Installation Code' : 'Installation Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === 'pending' 
                ? 'Enter the code provided by the customer to verify this request.'
                : 'Review the installation details.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Info */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Product</span>
                  <span className="font-medium">{selectedRequest.product_name}</span>
                </div>
                
                {selectedRequest.profile && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Customer ID</span>
                      <span className="font-medium">{selectedRequest.profile.customer_id || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="font-medium">{selectedRequest.profile.display_name || 'Unknown'}</span>
                    </div>
                  </>
                )}

                {/* Admin-only: Show actual code */}
                {isAdmin && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Installation Code</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCode(!showCode)}
                        >
                          {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedRequest.installation_code);
                            toast.success('Code copied to clipboard');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {showCode && (
                      <code className="block mt-1 p-2 bg-background rounded text-sm font-mono whitespace-nowrap">
                        {selectedRequest.installation_code}
                      </code>
                    )}
                  </div>
                )}

                {/* Discord invite link */}
                {selectedRequest.discord_invite && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Discord Server</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 mb-2">
                      {selectedRequest.discord_guild_icon ? (
                        <img 
                          src={selectedRequest.discord_guild_icon} 
                          alt={selectedRequest.discord_guild_name || 'Server'} 
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-indigo-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-indigo-500 truncate">
                          {selectedRequest.discord_guild_name || 'Discord server'}
                        </p>
                        {selectedRequest.discord_member_count && (
                          <p className="text-sm text-indigo-400 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {selectedRequest.discord_member_count.toLocaleString()} members
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                      onClick={() => window.open(selectedRequest.discord_invite!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Discord Server
                    </Button>
                  </div>
                )}

                {!selectedRequest.discord_invite && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground italic">
                      Customer has not provided a Discord invite link yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Verification input for pending requests */}
              {selectedRequest.status === 'pending' && !codeVerified && (
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Enter Installation Code</Label>
                  <Input
                    id="verify-code"
                    placeholder="BOT-XXXX-XXXX-XXXX"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                    className="font-mono"
                    onFocus={(e) => {
                      if (isMobile) {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                      }
                    }}
                  />
                </div>
              )}

              {/* Verified indicator */}
              {codeVerified && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Code verified successfully!</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            
            {selectedRequest?.status === 'pending' && !codeVerified && (
              <Button onClick={handleVerifyCode} disabled={!enteredCode.trim()}>
                Verify Code
              </Button>
            )}
            
            {selectedRequest?.status === 'pending' && codeVerified && (
              <Button 
                onClick={() => updateStatusMutation.mutate({ 
                  id: selectedRequest.id, 
                  status: 'verified' 
                })}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit for Installation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

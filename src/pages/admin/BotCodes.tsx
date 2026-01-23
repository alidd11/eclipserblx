import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Key, CheckCircle, Clock, Copy, AlertCircle, User, IdCard, Shield, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface BotInstallationCode {
  id: string;
  installation_code: string;
  product_name: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  order_id: string;
  order_item_id: string;
  user_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  customer_profile?: {
    customer_id: string | null;
    display_name: string | null;
    email: string;
  } | null;
  processor_profile?: {
    display_name: string | null;
    email: string;
  } | null;
}

export default function AdminBotCodes() {
  const { user: currentUser } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<BotInstallationCode | null>(null);
  const [markUsedDialogOpen, setMarkUsedDialogOpen] = useState(false);
  const [usedByInput, setUsedByInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Scroll to top of dialog when it opens
  useEffect(() => {
    if (markUsedDialogOpen && dialogContentRef.current) {
      setTimeout(() => {
        dialogContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      }, 50);
    }
  }, [markUsedDialogOpen]);

  const { data: codes, isLoading } = useQuery({
    queryKey: ['admin-bot-codes', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('bot_installation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`installation_code.ilike.%${searchQuery}%,product_name.ilike.%${searchQuery}%,used_by.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      
      // Fetch customer profiles
      const userIds = data?.filter(c => c.user_id).map(c => c.user_id) || [];
      let customerMap: Record<string, { customer_id: string | null; display_name: string | null; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: customers } = await supabase
          .from('profiles')
          .select('user_id, customer_id, display_name, email')
          .in('user_id', userIds);
        
        if (customers) {
          customerMap = customers.reduce((acc, p) => {
            acc[p.user_id] = { customer_id: p.customer_id, display_name: p.display_name, email: p.email };
            return acc;
          }, {} as Record<string, { customer_id: string | null; display_name: string | null; email: string }>);
        }
      }
      
      // Fetch processor profiles
      const processedByIds = data?.filter(c => c.processed_by).map(c => c.processed_by) || [];
      let processorMap: Record<string, { display_name: string | null; email: string }> = {};
      
      if (processedByIds.length > 0) {
        const { data: processors } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', processedByIds);
        
        if (processors) {
          processorMap = processors.reduce((acc, p) => {
            acc[p.user_id] = { display_name: p.display_name, email: p.email };
            return acc;
          }, {} as Record<string, { display_name: string | null; email: string }>);
        }
      }
      
      return data?.map(code => ({
        ...code,
        customer_profile: code.user_id ? customerMap[code.user_id] : null,
        processor_profile: code.processed_by ? processorMap[code.processed_by] : null
      })) as BotInstallationCode[];
    },
  });

  // Get current user's profile for the admin message
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', currentUser.id)
        .single();
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const markAsUsedMutation = useMutation({
    mutationFn: async ({ id, usedBy, code }: { id: string; usedBy: string; code: BotInstallationCode }) => {
      // Update the bot code - mark as processed but set used_by to indicate pending admin action
      const { error } = await supabase
        .from('bot_installation_codes')
        .update({
          is_used: true,
          used_by: usedBy,
          used_at: new Date().toISOString(),
          processed_by: currentUser?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;

      // Send message to admin chat
      const staffName = currentUserProfile?.display_name || currentUserProfile?.email || 'Staff';
      const customerName = code.customer_profile?.display_name || 'Unknown';
      const customerId = code.customer_profile?.customer_id || 'N/A';
      
      const adminMessage = `🤖 **Bot Installation Request - Pending**\n\n` +
        `**Product:** ${code.product_name}\n` +
        `**Customer ID:** ${customerId}\n` +
        `**Customer Name:** ${customerName}\n` +
        `**Claimed By:** ${usedBy}\n` +
        `**Verified By:** ${staffName}\n` +
        `**Time:** ${format(new Date(), 'MMM d, yyyy h:mm a')}\n\n` +
        `_Awaiting admin installation._`;

      // Insert into admin chat
      const { error: chatError } = await supabase
        .from('admin_chat_messages')
        .insert({
          user_id: currentUser?.id,
          message: adminMessage,
        });
      
      if (chatError) {
        console.error('Failed to send admin notification:', chatError);
        // Don't throw - the main operation succeeded
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bot-codes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-bot-requests'] });
      toast.success('Code verified and sent to admin for installation');
      setMarkUsedDialogOpen(false);
      setSelectedCode(null);
      setUsedByInput('');
      setVerificationCode('');
      setIsCodeVerified(false);
    },
    onError: (error) => {
      toast.error('Failed to update code: ' + error.message);
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleVerifyCode = () => {
    if (!selectedCode) return;
    
    if (verificationCode.trim().toUpperCase() === selectedCode.installation_code.toUpperCase()) {
      setIsCodeVerified(true);
      toast.success('Code verified successfully');
    } else {
      toast.error('Code does not match. Please try again.');
      setVerificationCode('');
    }
  };

  const handleMarkAsUsed = () => {
    if (!selectedCode || !usedByInput.trim()) {
      toast.error('Please enter who claimed this code');
      return;
    }
    if (!isCodeVerified) {
      toast.error('Please verify the code first');
      return;
    }
    markAsUsedMutation.mutate({ id: selectedCode.id, usedBy: usedByInput.trim(), code: selectedCode });
  };

  const openMarkUsedDialog = (code: BotInstallationCode) => {
    setSelectedCode(code);
    setUsedByInput('');
    setVerificationCode('');
    setIsCodeVerified(false);
    setMarkUsedDialogOpen(true);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const getStatusBadge = (code: BotInstallationCode) => {
    if (code.is_used) {
      return <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="h-3 w-3" /> Claimed</Badge>;
    }
    if (isExpired(code.expires_at)) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Expired</Badge>;
    }
    return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" /> Active</Badge>;
  };

  // Stats
  const totalCodes = codes?.length ?? 0;
  const activeCodes = codes?.filter(c => !c.is_used && !isExpired(c.expires_at)).length ?? 0;
  const usedCodes = codes?.filter(c => c.is_used).length ?? 0;
  const expiredCodes = codes?.filter(c => !c.is_used && isExpired(c.expires_at)).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bot Installation Codes</h1>
          <p className="text-muted-foreground">Manage and verify bot installation codes</p>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCodes}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeCodes}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Claimed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{usedCodes}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{expiredCodes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, product name, or used by..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Installation Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading codes...</div>
            ) : !codes?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No codes found matching your search' : 'No bot installation codes yet'}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile layout */}
                <div className="md:hidden space-y-3">
                  {codes.map((code) => (
                    <div key={code.id} className="rounded-lg border bg-card p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                          {isAdmin ? (
                            <>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded whitespace-nowrap">
                                {code.installation_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => handleCopyCode(code.installation_code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Hidden</span>
                          )}
                        </div>
                        <div className="shrink-0">{getStatusBadge(code)}</div>
                      </div>

                      <div className="text-sm font-medium truncate">{code.product_name}</div>

                      {/* Customer Info Card */}
                      {code.customer_profile && (
                        <div className="bg-muted/50 rounded-md p-2 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <IdCard className="h-3 w-3" />
                            Customer Info
                          </div>
                          <div className="text-xs space-y-0.5">
                            <div className="font-mono font-medium">{code.customer_profile.customer_id || 'N/A'}</div>
                            {code.customer_profile.display_name && (
                              <div className="text-muted-foreground">{code.customer_profile.display_name}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Claimed By / Processed By */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          {code.used_by ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">Claimed: {code.used_by}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Claimed by: —</div>
                          )}
                          {code.processor_profile && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Shield className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                Processed by: {code.processor_profile.display_name || code.processor_profile.email}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          {!code.is_used && !isExpired(code.expires_at) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMarkUsedDialog(code)}
                            >
                              Mark Claimed
                            </Button>
                          )}
                          {code.is_used && code.used_at && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(code.used_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                        <span className="whitespace-nowrap">
                          Created: {format(new Date(code.created_at), 'MMM d, yyyy')}
                        </span>
                        <span className="whitespace-nowrap">
                          Expires: {format(new Date(code.expires_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop layout */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Code</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="whitespace-nowrap">Customer ID</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">Claimed By</TableHead>
                        <TableHead className="whitespace-nowrap">Processed By</TableHead>
                        <TableHead className="hidden lg:table-cell whitespace-nowrap">Created</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {codes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              {isAdmin ? (
                                <>
                                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded whitespace-nowrap">
                                    {code.installation_code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleCopyCode(code.installation_code)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Hidden</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{code.product_name}</TableCell>
                          <TableCell>
                            {code.customer_profile ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-mono">{code.customer_profile.customer_id || 'N/A'}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{getStatusBadge(code)}</TableCell>
                          <TableCell>
                            {code.used_by ? (
                              <div className="flex items-center gap-1 text-sm">
                                <User className="h-3 w-3" />
                                {code.used_by}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {code.processor_profile ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Shield className="h-3 w-3 text-primary" />
                                <span>{code.processor_profile.display_name || code.processor_profile.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(code.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {!code.is_used && !isExpired(code.expires_at) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMarkUsedDialog(code)}
                              >
                                Mark as Claimed
                              </Button>
                            )}
                            {code.is_used && code.used_at && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(code.used_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as Used Dialog */}
      <Dialog open={markUsedDialogOpen} onOpenChange={setMarkUsedDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Mark Code as Claimed</DialogTitle>
            <DialogDescription>
              Verify the installation code and enter the customer identifier.
            </DialogDescription>
          </DialogHeader>
          <div 
            ref={dialogContentRef}
            className="flex-1 overflow-y-auto space-y-4 py-4 px-1"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium">Product</p>
              <p className="text-sm text-muted-foreground">{selectedCode?.product_name}</p>
            </div>

            {selectedCode?.customer_profile && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <IdCard className="h-4 w-4" />
                  Customer Info
                </p>
                <div className="space-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Customer ID:</span>
                    <span className="ml-2 font-mono">{selectedCode.customer_profile.customer_id || 'N/A'}</span>
                  </div>
                  {selectedCode.customer_profile.display_name && (
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2">{selectedCode.customer_profile.display_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Code Verification Step */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Verify Installation Code *
              </label>
              {isCodeVerified ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Code Verified</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter the installation code to verify..."
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleVerifyCode}
                    disabled={!verificationCode.trim()}
                    className="w-full"
                  >
                    Verify Code
                  </Button>
                </div>
              )}
            </div>

            {/* Claimed By Input - Only show after verification */}
            {isCodeVerified && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Claimed By *</label>
                <Textarea
                  placeholder="Enter Discord username or customer identifier..."
                  value={usedByInput}
                  onChange={(e) => setUsedByInput(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setMarkUsedDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsUsed}
              disabled={markAsUsedMutation.isPending || !usedByInput.trim() || !isCodeVerified}
            >
              {markAsUsedMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send to Admin'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

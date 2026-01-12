import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Clock, Key, IdCard, User, Mail, Package, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PendingBotRequest {
  id: string;
  installation_code: string;
  product_name: string;
  created_at: string;
  expires_at: string;
  order_id: string;
  customer_profile: {
    customer_id: string | null;
    display_name: string | null;
    email: string;
  } | null;
}

export default function AdminBotRequests() {
  const queryClient = useQueryClient();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['admin-pending-bot-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_installation_codes')
        .select('*')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
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
      
      return data?.map(code => ({
        ...code,
        customer_profile: code.user_id ? customerMap[code.user_id] : null
      })) as PendingBotRequest[];
    },
  });

  // Real-time subscription for new bot codes
  useEffect(() => {
    const channel = supabase
      .channel('bot-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_installation_codes'
        },
        (payload) => {
          console.log('New bot code received:', payload);
          toast.info('New Bot Request', {
            description: `New installation request for ${payload.new.product_name}`,
          });
          queryClient.invalidateQueries({ queryKey: ['admin-pending-bot-requests'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bot_installation_codes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-pending-bot-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bot Installation Requests</h1>
          <p className="text-muted-foreground">Pending bot installations requiring manual processing</p>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              How Notifications Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              When a customer purchases a bot product, an installation code is automatically generated and emailed to them.
              Staff should regularly check this page for pending requests that need manual bot installation.
            </p>
            <p>
              After installing the bot for the customer, go to <Link to="/admin/bot-codes" className="text-primary underline underline-offset-2">Bot Codes</Link> and 
              mark the code as "Claimed" to track completion.
            </p>
          </CardContent>
        </Card>

        {/* Pending Requests Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-primary">{pendingCount}</div>
              {pendingCount > 0 && (
                <Badge variant="default" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Awaiting Installation
                </Badge>
              )}
              {pendingCount === 0 && (
                <Badge variant="secondary" className="gap-1 bg-green-500/20 text-green-600 border-green-500/30">
                  All caught up!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Installations</CardTitle>
            <CardDescription>Bot codes awaiting manual installation</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
            ) : !pendingRequests?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending bot installation requests
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile layout */}
                <div className="md:hidden space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded whitespace-nowrap">
                            {request.installation_code}
                          </code>
                        </div>
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.product_name}</span>
                      </div>

                      {/* Customer Info Card */}
                      {request.customer_profile && (
                        <div className="bg-muted/50 rounded-md p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <IdCard className="h-3 w-3" />
                            Customer Info
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono font-medium">{request.customer_profile.customer_id || 'N/A'}</span>
                            </div>
                            {request.customer_profile.display_name && (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span>{request.customer_profile.display_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground truncate">{request.customer_profile.email}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                        <span>Created: {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>

                      <Button asChild size="sm" className="w-full">
                        <Link to="/admin/bot-codes">Process Request</Link>
                      </Button>
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
                        <TableHead>Customer</TableHead>
                        <TableHead className="whitespace-nowrap">Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded whitespace-nowrap">
                                {request.installation_code}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{request.product_name}</TableCell>
                          <TableCell>
                            {request.customer_profile ? (
                              <span className="font-mono text-sm">{request.customer_profile.customer_id || 'N/A'}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {request.customer_profile ? (
                              <div className="space-y-0.5">
                                {request.customer_profile.display_name && (
                                  <div className="text-sm font-medium">{request.customer_profile.display_name}</div>
                                )}
                                <div className="text-xs text-muted-foreground">{request.customer_profile.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link to="/admin/bot-codes">Process</Link>
                            </Button>
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
    </AdminLayout>
  );
}

import { useState } from 'react';
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
import { Search, Key, CheckCircle, Clock, Copy, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
}

export default function AdminBotCodes() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<BotInstallationCode | null>(null);
  const [markUsedDialogOpen, setMarkUsedDialogOpen] = useState(false);
  const [usedByInput, setUsedByInput] = useState('');

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
      return data as BotInstallationCode[];
    },
  });

  const markAsUsedMutation = useMutation({
    mutationFn: async ({ id, usedBy }: { id: string; usedBy: string }) => {
      const { error } = await supabase
        .from('bot_installation_codes')
        .update({
          is_used: true,
          used_by: usedBy,
          used_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bot-codes'] });
      toast.success('Code marked as claimed');
      setMarkUsedDialogOpen(false);
      setSelectedCode(null);
      setUsedByInput('');
    },
    onError: (error) => {
      toast.error('Failed to update code: ' + error.message);
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const handleMarkAsUsed = () => {
    if (!selectedCode || !usedByInput.trim()) {
      toast.error('Please enter who claimed this code');
      return;
    }
    markAsUsedMutation.mutate({ id: selectedCode.id, usedBy: usedByInput.trim() });
  };

  const openMarkUsedDialog = (code: BotInstallationCode) => {
    setSelectedCode(code);
    setUsedByInput('');
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCodes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeCodes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Claimed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{usedCodes}</div>
            </CardContent>
          </Card>
          <Card>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
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
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{code.product_name}</TableCell>
                        <TableCell>{getStatusBadge(code)}</TableCell>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(code.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(code.expires_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark as Used Dialog */}
      <Dialog open={markUsedDialogOpen} onOpenChange={setMarkUsedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Code as Claimed</DialogTitle>
            <DialogDescription>
              Enter the Discord username or identifier of the person who claimed this code for installation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Installation Code</p>
              <code className="block text-sm font-mono bg-muted px-3 py-2 rounded">
                {selectedCode?.installation_code}
              </code>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Product</p>
              <p className="text-sm text-muted-foreground">{selectedCode?.product_name}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Claimed By *</label>
              <Textarea
                placeholder="Enter Discord username or customer identifier..."
                value={usedByInput}
                onChange={(e) => setUsedByInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkUsedDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsUsed}
              disabled={markAsUsedMutation.isPending || !usedByInput.trim()}
            >
              {markAsUsedMutation.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

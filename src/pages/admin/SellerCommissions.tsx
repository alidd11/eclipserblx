import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Percent, Calendar, Store, Edit2, RotateCcw, AlertCircle, Shield, Power, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface StoreWithCommission {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  commission_rate: number | null;
  custom_commission_rate: number | null;
  custom_rate_expires_at: string | null;
  custom_rate_set_at: string | null;
  is_active: boolean;
  status: string | null;
  is_trusted: boolean;
}

type StoreFilter = 'all' | 'active' | 'inactive';

export default function SellerCommissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<StoreWithCommission | null>(null);
  const [customRate, setCustomRate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [storeToDelete, setStoreToDelete] = useState<StoreWithCommission | null>(null);

  // Fetch all stores (not just active)
  const { data: stores, isLoading } = useQuery({
    queryKey: ['seller-commissions', storeFilter],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select('id, name, slug, owner_id, commission_rate, custom_commission_rate, custom_rate_expires_at, custom_rate_set_at, is_active, status, is_trusted')
        .order('name');
      
      if (storeFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (storeFilter === 'inactive') {
        query = query.eq('is_active', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StoreWithCommission[];
    },
  });

  // Fetch default commission rates from settings
  const { data: settings } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['marketplace_default_commission_rate', 'marketplace_eclipse_commission_rate']);
      
      if (error) throw error;
      return data.reduce((acc, s) => ({ ...acc, [s.key]: Number(s.value) || 0 }), {} as Record<string, number>);
    },
  });

  const defaultRate = settings?.marketplace_default_commission_rate ?? 15;
  const eclipseRate = settings?.marketplace_eclipse_commission_rate ?? 10;

  // Update custom rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async ({ storeId, rate, expiresAt }: { storeId: string; rate: number | null; expiresAt: string | null }) => {
      const { error } = await supabase
        .from('stores')
        .update({
          custom_commission_rate: rate,
          custom_rate_expires_at: expiresAt,
          custom_rate_set_by: user?.id,
          custom_rate_set_at: rate ? new Date().toISOString() : null,
        })
        .eq('id', storeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
      toast.success('Commission rate updated successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update commission rate: ' + error.message);
    },
  });

  // Toggle trusted seller mutation
  const toggleTrustedMutation = useMutation({
    mutationFn: async ({ storeId, isTrusted }: { storeId: string; isTrusted: boolean }) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_trusted: isTrusted })
        .eq('id', storeId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isTrusted }) => {
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
      toast.success(isTrusted ? 'Trusted Seller badge granted' : 'Trusted Seller badge removed');
    },
    onError: (error) => {
      toast.error('Failed to update trusted status: ' + error.message);
    },
  });

  // Toggle store active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: isActive })
        .eq('id', storeId);
      
      if (error) throw error;

      // Send deactivation email if store is being deactivated
      if (!isActive) {
        try {
          await supabase.functions.invoke('send-store-deactivation-email', {
            body: { store_id: storeId },
          });
        } catch (emailError) {
          console.error('Failed to send deactivation email:', emailError);
          // Don't throw - the store was still deactivated successfully
        }
      }
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
      toast.success(isActive ? 'Store activated' : 'Store deactivated - owner notified via email');
    },
    onError: (error) => {
      toast.error('Failed to update store status: ' + error.message);
    },
  });

  // Delete store mutation
  const deleteStoreMutation = useMutation({
    mutationFn: async (storeId: string) => {
      // First delete related records
      await supabase.from('store_follows').delete().eq('store_id', storeId);
      await supabase.from('store_team_members').delete().eq('store_id', storeId);
      
      // Deactivate products instead of deleting (preserve order history)
      await supabase.from('products').update({ is_active: false }).eq('store_id', storeId);
      
      // Finally delete the store
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-commissions'] });
      toast.success('Store deleted successfully');
      setStoreToDelete(null);
    },
    onError: (error) => {
      toast.error('Failed to delete store: ' + error.message);
    },
  });

  const resetForm = () => {
    setSelectedStore(null);
    setCustomRate('');
    setExpirationDate('');
  };

  const handleEditClick = (store: StoreWithCommission) => {
    setSelectedStore(store);
    setCustomRate(store.custom_commission_rate?.toString() || '');
    setExpirationDate(store.custom_rate_expires_at ? store.custom_rate_expires_at.split('T')[0] : '');
    setIsDialogOpen(true);
  };

  const handleSaveCustomRate = () => {
    if (!selectedStore) return;
    
    const rate = customRate ? parseFloat(customRate) : null;
    if (rate !== null && (rate < 0 || rate > 100)) {
      toast.error('Commission rate must be between 0 and 100');
      return;
    }

    const expiresAt = expirationDate ? new Date(expirationDate).toISOString() : null;
    
    updateRateMutation.mutate({
      storeId: selectedStore.id,
      rate,
      expiresAt,
    });
  };

  const handleRevertRate = (store: StoreWithCommission) => {
    updateRateMutation.mutate({
      storeId: store.id,
      rate: null,
      expiresAt: null,
    });
  };

  const getEffectiveRate = (store: StoreWithCommission) => {
    // Check if custom rate has expired
    if (store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date()) {
      return store.commission_rate ?? defaultRate;
    }
    return store.custom_commission_rate ?? store.commission_rate ?? defaultRate;
  };

  const isCustomRateActive = (store: StoreWithCommission) => {
    if (!store.custom_commission_rate) return false;
    if (store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date()) {
      return false;
    }
    return true;
  };

  const activeCount = stores?.filter(s => s.is_active).length ?? 0;
  const inactiveCount = stores?.filter(s => !s.is_active).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Commissions</h1>
          <p className="text-muted-foreground">
            Manage custom commission rates and store status for individual sellers
          </p>
        </div>

        {/* Default Rates Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Default Commission Rates
            </CardTitle>
            <CardDescription>
              These are the default rates applied when no custom rate is set
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Standard</Badge>
                <span className="font-medium">{defaultRate}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">Eclipse+</Badge>
                <span className="font-medium">{eclipseRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Seller Stores
                </CardTitle>
                <CardDescription>
                  Set custom commission rates, manage store status, or delete stores
                </CardDescription>
              </div>
              <Select value={storeFilter} onValueChange={(v) => setStoreFilter(v as StoreFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores ({(stores?.length ?? 0)})</SelectItem>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-500" />
                      Active ({activeCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      Inactive ({inactiveCount})
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
            ) : stores && stores.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trusted Seller</TableHead>
                    <TableHead>Default Rate</TableHead>
                    <TableHead>Custom Rate</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Effective Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id} className={!store.is_active ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {store.name}
                          {store.is_trusted && (
                            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-xs">
                              <Shield className="h-3 w-3" />
                              Trusted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={store.is_active}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ storeId: store.id, isActive: checked })}
                            disabled={toggleActiveMutation.isPending}
                          />
                          <Badge variant={store.is_active ? 'default' : 'secondary'}>
                            {store.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={store.is_trusted}
                          onCheckedChange={(checked) => toggleTrustedMutation.mutate({ storeId: store.id, isTrusted: checked })}
                          disabled={toggleTrustedMutation.isPending || !store.is_active}
                        />
                      </TableCell>
                      <TableCell>{store.commission_rate ?? defaultRate}%</TableCell>
                      <TableCell>
                        {isCustomRateActive(store) ? (
                          <Badge variant="outline" className="border-primary text-primary">
                            {store.custom_commission_rate}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {store.custom_rate_expires_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(store.custom_rate_expires_at), 'MMM d, yyyy')}
                            {new Date(store.custom_rate_expires_at) <= new Date() && (
                              <Badge variant="destructive" className="text-xs ml-1">Expired</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isCustomRateActive(store) ? 'default' : 'secondary'}>
                          {getEffectiveRate(store)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(store)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Commission
                            </DropdownMenuItem>
                            {isCustomRateActive(store) && (
                              <DropdownMenuItem onClick={() => handleRevertRate(store)}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset to Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleActiveMutation.mutate({ storeId: store.id, isActive: !store.is_active })}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              {store.is_active ? 'Deactivate Store' : 'Activate Store'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setStoreToDelete(store)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No seller stores found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Custom Commission Rate</DialogTitle>
              <DialogDescription>
                Set a custom commission rate for {selectedStore?.name}. Leave empty to use the default rate.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customRate">Custom Rate (%)</Label>
                <Input
                  id="customRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder={`Default: ${selectedStore?.commission_rate ?? defaultRate}%`}
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a value between 0 and 100, or leave empty to use the store's default rate
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The custom rate will automatically revert to the default on this date
                </p>
              </div>

              {customRate && !expirationDate && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-500">
                    No expiration date set. This custom rate will remain active indefinitely until manually removed.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCustomRate}
                disabled={updateRateMutation.isPending}
              >
                {updateRateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!storeToDelete} onOpenChange={() => setStoreToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Store</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete <strong>{storeToDelete?.name}</strong>?</p>
                <p className="text-destructive">This action cannot be undone. The store will be permanently removed, and all its products will be deactivated.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => storeToDelete && deleteStoreMutation.mutate(storeToDelete.id)}
                disabled={deleteStoreMutation.isPending}
              >
                {deleteStoreMutation.isPending ? 'Deleting...' : 'Delete Store'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Percent, Calendar, Store, Edit2, RotateCcw, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';

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

export default function SellerCommissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<StoreWithCommission | null>(null);
  const [customRate, setCustomRate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all active stores
  const { data: stores, isLoading } = useQuery({
    queryKey: ['seller-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, owner_id, commission_rate, custom_commission_rate, custom_rate_expires_at, custom_rate_set_at, is_active, status, is_trusted')
        .eq('is_active', true)
        .order('name');
      
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Commissions</h1>
          <p className="text-muted-foreground">
            Manage custom commission rates for individual sellers
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
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Active Seller Stores
            </CardTitle>
            <CardDescription>
              Set custom commission rates with optional expiration dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
            ) : stores && stores.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
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
                    <TableRow key={store.id}>
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
                        <Switch
                          checked={store.is_trusted}
                          onCheckedChange={(checked) => toggleTrustedMutation.mutate({ storeId: store.id, isTrusted: checked })}
                          disabled={toggleTrustedMutation.isPending}
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(store)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {isCustomRateActive(store) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevertRate(store)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No active seller stores found
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
      </div>
    </AdminLayout>
  );
}
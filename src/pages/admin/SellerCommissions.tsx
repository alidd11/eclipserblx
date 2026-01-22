import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Percent, Calendar, Store, Shield, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface StoreWithCommission {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  commission_rate: number | null;
  custom_commission_rate: number | null;
  custom_rate_expires_at: string | null;
  is_active: boolean;
  is_trusted: boolean;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string;
  };
}

type StoreFilter = 'all' | 'active' | 'inactive';

export default function SellerCommissions() {
  const navigate = useNavigate();
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all stores with owner info
  const { data: stores, isLoading } = useQuery({
    queryKey: ['seller-stores-list', storeFilter],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select(`
          id, name, slug, owner_id, commission_rate, custom_commission_rate, 
          custom_rate_expires_at, is_active, is_trusted, created_at,
          profiles:owner_id (display_name, email)
        `)
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

  // Fetch default commission rates
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

  const getEffectiveRate = (store: StoreWithCommission) => {
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

  // Filter stores by search query
  const filteredStores = stores?.filter(store => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      store.name.toLowerCase().includes(query) ||
      store.slug.toLowerCase().includes(query) ||
      store.profiles?.display_name?.toLowerCase().includes(query) ||
      store.profiles?.email?.toLowerCase().includes(query)
    );
  });

  const activeCount = stores?.filter(s => s.is_active).length ?? 0;
  const inactiveCount = stores?.filter(s => !s.is_active).length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Stores</h1>
          <p className="text-muted-foreground">
            View and manage all seller stores. Click a store to view details.
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
              These rates are applied when no custom rate is set
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  All Stores ({filteredStores?.length ?? 0})
                </CardTitle>
                <CardDescription>
                  Click on a store to view detailed information and manage settings
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px]"
                />
                <Select value={storeFilter} onValueChange={(v) => setStoreFilter(v as StoreFilter)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({stores?.length ?? 0})</SelectItem>
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading stores...</div>
            ) : filteredStores && filteredStores.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => (
                    <TableRow 
                      key={store.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${!store.is_active ? 'opacity-60' : ''}`}
                      onClick={() => navigate(`/admin/seller-commissions/${store.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{store.name}</span>
                              {store.is_trusted && (
                                <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-xs">
                                  <Shield className="h-3 w-3" />
                                  Trusted
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">/{store.slug}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{store.profiles?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{store.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={store.is_active ? 'default' : 'secondary'}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={isCustomRateActive(store) ? 'default' : 'secondary'}>
                            {getEffectiveRate(store)}%
                          </Badge>
                          {isCustomRateActive(store) && (
                            <span className="text-xs text-muted-foreground">(custom)</span>
                          )}
                          {store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date() && (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(store.created_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No stores match your search' : 'No stores found'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

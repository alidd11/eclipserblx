import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Percent, Store, Shield, Eye, EyeOff, ChevronRight, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
  is_verified: boolean;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
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
          custom_rate_expires_at, is_active, is_trusted, is_verified, created_at,
          profiles:owner_id (display_name, username)
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

  // Fetch Eclipse+ subscriptions for store owners
  const { data: ownerSubscriptions } = useQuery({
    queryKey: ['store-owner-subscriptions', stores?.map(s => s.owner_id)],
    queryFn: async () => {
      if (!stores || stores.length === 0) return {};
      
      const ownerIds = stores.map(s => s.owner_id);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('user_id, status')
        .in('user_id', ownerIds)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Create a map of user_id -> hasEclipsePlus
      return data.reduce((acc, sub) => {
        acc[sub.user_id] = true;
        return acc;
      }, {} as Record<string, boolean>);
    },
    enabled: !!stores && stores.length > 0,
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

  // Filter stores by search query
  const filteredStores = stores?.filter(store => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      store.name.toLowerCase().includes(query) ||
      store.slug.toLowerCase().includes(query) ||
      store.profiles?.display_name?.toLowerCase().includes(query)
    );
  });

  const activeCount = stores?.filter(s => s.is_active).length ?? 0;
  const inactiveCount = stores?.filter(s => !s.is_active).length ?? 0;

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Stores</h1>
          <p className="text-muted-foreground">
            View and manage all seller stores. Tap a store to view details.
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

        {/* Stores Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  All Stores ({filteredStores?.length ?? 0})
                </CardTitle>
                <CardDescription>
                  Tap a store to view detailed information and manage settings
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
              <div className="space-y-3">
                {filteredStores.map((store) => {
                  const hasEclipsePlus = ownerSubscriptions?.[store.owner_id] ?? false;
                  
                  return (
                    <div
                      key={store.id}
                      onClick={() => navigate(`/admin/seller-commissions/${store.id}`)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border bg-card cursor-pointer",
                        "transition-all duration-150 active:scale-[0.99]",
                        "hover:bg-muted/50 hover:border-primary/30",
                        !store.is_active && "opacity-60"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        {/* Store name and badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{store.name}</span>
                          {store.is_trusted && (
                            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-xs shrink-0">
                              <Shield className="h-3 w-3" />
                              Trusted
                            </Badge>
                          )}
                          {store.is_verified && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              Verified
                            </Badge>
                          )}
                          {hasEclipsePlus && (
                            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs shrink-0">
                              <Sparkles className="h-3 w-3" />
                              Eclipse+
                            </Badge>
                          )}
                        </div>
                        
                        {/* Owner name */}
                        <p className="text-sm text-muted-foreground">
                          {store.profiles?.display_name || 'Unknown Owner'}
                          {store.profiles?.username && (
                            <span className="ml-1 opacity-70">@{store.profiles.username}</span>
                          )}
                        </p>
                        
                        {/* Status and date on mobile */}
                        <div className="flex items-center gap-2 mt-2 sm:hidden">
                          <Badge variant={store.is_active ? 'default' : 'secondary'} className="text-xs">
                            {store.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(store.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Right side - Status badge (desktop) + chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge 
                          variant={store.is_active ? 'default' : 'secondary'} 
                          className="hidden sm:inline-flex"
                        >
                          {store.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
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

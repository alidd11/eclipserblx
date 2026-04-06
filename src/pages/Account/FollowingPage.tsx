import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AccountPageLayout } from '@/components/account/AccountPageLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { FollowButton } from '@/components/store/FollowButton';
import { toast } from 'sonner';
import { 
 Store as StoreIcon, CheckCircle, Package, Users, Bell, ArrowRight
} from 'lucide-react';

interface FollowedStore {
 id: string;
 store_id: string;
 notify_new_products: boolean;
 created_at: string;
 stores: {
 id: string;
 name: string;
 slug: string;
 logo_url: string | null;
 banner_url: string | null;
 description: string | null;
 is_verified: boolean;
 product_count: number | null;
 follower_count: number | null;
 accent_color: string | null;
 };
}

export function FollowingPage() {
 const { user } = useAuth();
 const queryClient = useQueryClient();

 const { data: followedStores, isLoading } = useQuery({
 queryKey: ['followed-stores', user?.id],
 queryFn: async () => {
 if (!user?.id) return [];
 const { data, error } = await supabase
 .from('store_follows')
 .select(`
 id, store_id, notify_new_products, created_at,
 stores (id, name, slug, logo_url, banner_url, description, is_verified, product_count, follower_count, accent_color)
 `)
 .eq('user_id', user.id)
 .order('created_at', { ascending: false });
 if (error) throw error;
 return (data || []) as FollowedStore[];
 },
 enabled: !!user?.id,
 });

 const toggleNotifyMutation = useMutation({
 mutationFn: async ({ followId, currentValue }: { followId: string; currentValue: boolean }) => {
 const { error } = await supabase
 .from('store_follows')
 .update({ notify_new_products: !currentValue })
 .eq('id', followId);
 if (error) throw error;
 },
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followed-stores'] }),
 onError: () => toast.error('Failed to update notification preference'),
 });

 if (isLoading) {
 return (
 <AccountPageLayout title="Following" icon={Users} description="Stores you follow">
 <div className="space-y-4">
 {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
 </div>
 </AccountPageLayout>
 );
 }

 if (!followedStores || followedStores.length === 0) {
 return (
 <AccountPageLayout title="Following" icon={Users} description="Stores you follow">
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 py-12 text-center">
 <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
 <h3 className="text-lg font-medium mb-2">Not Following Anyone Yet</h3>
 <p className="text-muted-foreground mb-4">
 Follow your favorite creators to get notified when they release new products.
 </p>
 <Button asChild>
 <Link to="/products">
 Discover Creators
 <ArrowRight className="h-4 w-4 ml-2" />
 </Link>
 </Button>
 </div>
 </div>
 </AccountPageLayout>
 );
 }

 return (
 <AccountPageLayout title="Following" icon={Users} description="Stores you follow">
 <div className="space-y-4">
 {followedStores.map((follow) => {
 const store = follow.stores;
 const accentColor = store.accent_color || 'hsl(var(--primary))';
 
 return (
 <div key={follow.id} className="overflow-hidden border-border bg-card hover:border-primary/40 transition-colors duration-200 group">
 {store.banner_url ? (
 <div className="relative h-20 overflow-hidden">
 <img src={store.banner_url} alt="" className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105" />
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95" />
 </div>
 ) : (
 <div className="h-16" style={{ background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}20 100%)` }} />
 )}

 <div className="bg-foreground/95 px-3 py-2.5 space-y-2.5">
 <div className="flex items-center gap-3">
 {store.logo_url ? (
 <img src={store.logo_url} alt={store.name} className="h-12 w-12 rounded-lg object-contain bg-background/10 border border-white/10 flex-shrink-0" />
 ) : (
 <div className="h-12 w-12 rounded-lg bg-background/10 flex items-center justify-center flex-shrink-0 border border-white/10">
 <StoreIcon className="h-5 w-5 text-foreground/60" />
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <Link to={`/store/${store.slug}`} className="font-display font-bold text-base text-foreground hover:text-primary transition-colors truncate">
 {store.name}
 </Link>
 {store.is_verified && <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />}
 </div>
 {store.description && <p className="text-xs text-foreground/60 line-clamp-1 mt-0.5">{store.description}</p>}
 </div>
 </div>

 <div className="flex items-center gap-4 text-xs text-foreground/70">
 <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-primary" />{store.product_count || 0} products</span>
 <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" />{store.follower_count || 0} followers</span>
 </div>

 <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" className="border-white/10 text-foreground/80 hover:text-foreground hover:bg-background/10 h-7 text-xs" asChild>
 <Link to={`/store/${store.slug}`}>View Store</Link>
 </Button>
 <FollowButton storeId={store.id} accentColor={accentColor} size="sm" />
 </div>
 <button
 className="flex items-center gap-2 text-xs cursor-pointer group/notif"
 onClick={() => toggleNotifyMutation.mutate({ followId: follow.id, currentValue: follow.notify_new_products })}
 disabled={toggleNotifyMutation.isPending}
 >
 <Bell className="h-3.5 w-3.5 text-foreground/50" />
 <span className="text-foreground/50 group-hover/notif:text-foreground/80 transition-colors">Notifications</span>
 <Switch checked={follow.notify_new_products} className="pointer-events-none scale-90" />
 </button>
 </div>

 <div className="h-0.5 w-full rounded-full opacity-60" style={{ backgroundColor: accentColor }} />
 </div>
 </div>
 );
 })}
 </div>
 </AccountPageLayout>
 );
}

import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Package, LogOut, Settings, Shield, Download, Loader2, Trash2, Award, MessageSquare } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBadges } from '@/hooks/useBadges';
import { supabase } from '@/integrations/supabase/client';
import { ORDER_STATUSES } from '@/lib/constants';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { DeleteProfileDialog } from '@/components/auth/DeleteProfileDialog';
import { BadgeShowcase } from '@/components/badges/BadgeShowcase';
import { NewBadgeToast } from '@/components/badges/NewBadgeToast';

const Account = forwardRef<HTMLDivElement>(function Account(_, ref) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { badges, userBadges, newBadges, checkBadges, clearNewBadges } = useBadges();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Check for new badges when account page loads
  useEffect(() => {
    if (user) {
      checkBadges();
    }
  }, [user, checkBadges]);

  const fallbackDisplayName = useMemo(() => {
    if (!user) return '';
    const metaName = (user.user_metadata as any)?.display_name;
    if (typeof metaName === 'string' && metaName.trim()) return metaName.trim();
    if (user.email) return user.email.split('@')[0];
    return '';
  }, [user]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, avatar_url, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Ensure a profile row exists (some older accounts may not have one).
  useEffect(() => {
    if (!user?.id || !user.email) return;
    if (profileLoading) return;
    if (profile) return;

    const run = async () => {
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        display_name: fallbackDisplayName || null,
      });

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    };

    // Fire-and-forget; if RLS blocks this insert, we simply keep using the fallback name.
    void run();
  }, [user?.id, user?.email, profileLoading, profile, fallbackDisplayName, queryClient]);

  const { data: orders } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items(*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate('/');
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to view your account.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    const colorMap: Record<string, string> = {
      success: 'bg-green-500/10 text-green-500 border-green-500/30',
      warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      destructive: 'bg-red-500/10 text-red-500 border-red-500/30',
      primary: 'bg-primary/10 text-primary border-primary/30',
      muted: 'bg-muted text-muted-foreground',
    };
    return (
      <Badge variant="outline" className={colorMap[config?.color] || colorMap.muted}>
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <MainLayout ref={ref}>
      <div className="container py-8 space-y-8 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">My Account</h1>
          {adminLoading ? (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking access…
            </Button>
          ) : isStaff ? (
            <Button variant="outline" onClick={() => window.open('/admin', '_blank')}>
              <Shield className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          ) : null}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Display Name</p>
                <p className="font-medium">
                  {profile?.display_name || fallbackDisplayName || 'Not set'}
                  {profileLoading && (
                    <span className="ml-2 inline-flex items-center text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/downloads">
                  <Download className="h-4 w-4 mr-2" />
                  My Downloads
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/products">
                  <Package className="h-4 w-4 mr-2" />
                  Browse Products
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/chat-history">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Support History
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setShowSignOutDialog(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              My Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeShowcase badges={badges} userBadges={userBadges} showAll />
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              My Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven't made any orders yet.</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm">{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">£{order.total.toFixed(2)}</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.order_items?.length} item(s)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-card border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data including downloads.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out Confirmation Dialog */}
        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={handleSignOut}
          isLoading={isSigningOut}
        />

        {/* Delete Profile Dialog */}
        <DeleteProfileDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          userEmail={user.email || ''}
          onDeleted={() => navigate('/')}
        />

        {/* New Badge Toast Notifications */}
        <NewBadgeToast badges={newBadges} onClear={clearNewBadges} />
      </div>
    </MainLayout>
  );
});

export default Account;

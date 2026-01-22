import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface InterestRecord {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
    customer_id: string | null;
    email: string | null;
  } | null;
}

export default function MarketplaceInterest() {
  const { data: interests, isLoading } = useQuery({
    queryKey: ['admin-marketplace-interest'],
    queryFn: async () => {
      // Get interest registrations
      const { data: interestData, error: interestError } = await supabase
        .from('marketplace_interest')
        .select('id, user_id, created_at')
        .order('created_at', { ascending: false });

      if (interestError) throw interestError;
      if (!interestData || interestData.length === 0) return [];

      // Get profiles for those users
      const userIds = interestData.map((i) => i.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, customer_id, email')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) ?? []);

      return interestData.map((interest) => ({
        ...interest,
        profiles: profilesMap.get(interest.user_id) ?? null,
      })) as InterestRecord[];
    },
  });

  const totalCount = interests?.length ?? 0;
  const todayCount = interests?.filter(
    (i) => new Date(i.created_at).toDateString() === new Date().toDateString()
  ).length ?? 0;

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Interest</h1>
          <p className="text-muted-foreground">
            Users who want to be notified when the Marketplace launches
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Interested</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totalCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : todayCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Registration</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : interests?.[0] ? (
                  format(new Date(interests[0].created_at), 'MMM d')
                ) : (
                  'N/A'
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle>Interested Users</CardTitle>
            <CardDescription>
              All users who registered interest in the Marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : interests?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No users have registered interest yet.
              </p>
            ) : (
              <div className="space-y-3">
                {interests?.map((interest) => (
                  <div
                    key={interest.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={interest.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {interest.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {interest.profiles?.display_name ?? 'Unknown User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {interest.profiles?.customer_id ?? interest.profiles?.email ?? interest.user_id}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {format(new Date(interest.created_at), 'MMM d, yyyy')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

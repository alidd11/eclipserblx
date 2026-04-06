import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AccountPageLayout } from '@/components/account/AccountPageLayout';
import { Megaphone, Plus, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { Link, Navigate } from 'react-router-dom';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  link_url: string | null;
  discord_username: string | null;
  status: string;
  price_paid: number | null;
  posted_at: string | null;
  discord_message_id: string | null;
  created_at: string;
  total_clicks: number | null;
  unique_clicks: number | null;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'posted':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Posted</Badge>;
    case 'paid':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="h-3 w-3 mr-1" /> Processing</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Pending Payment</Badge>;
    case 'failed':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function MyAdvertisementsPage() {
  const { user, loading: authLoading } = useAuth();

  const { data: advertisements, isLoading } = useQuery({
    queryKey: ['my-advertisements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('discord_advertisements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Advertisement[];
    },
    enabled: !!user?.id,
  });

  if (authLoading) {
    return (
      <AccountPageLayout title="My Advertisements" icon={Megaphone} description="View your Discord advertisements">
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </AccountPageLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const headerActions = (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link to="/account/ad-analytics">
          <BarChart3 className="h-4 w-4 mr-1.5" />
          Analytics
        </Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/advertise">
          <Plus className="h-4 w-4 mr-1.5" />
          New Ad
        </Link>
      </Button>
    </>
  );

  return (
    <AccountPageLayout
      title="My Advertisements"
      description="View your Discord advertisements"
      icon={Megaphone}
      actions={headerActions}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : advertisements?.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No advertisements yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first Discord advertisement to promote your server or project.
            </p>
            <Button asChild>
              <Link to="/advertise">Create Advertisement</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {advertisements?.map((ad) => (
            <Card key={ad.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{ad.title}</CardTitle>
                    <CardDescription>
                      Created {format(new Date(ad.created_at), 'PPP')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(ad.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {ad.price_paid && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Paid:</span> {formatCurrency(ad.price_paid)}
                    </div>
                  )}
                  {ad.posted_at && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Posted:</span> {format(new Date(ad.posted_at), 'PPP')}
                    </div>
                  )}
                  {ad.status === 'posted' && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Clicks:</span> {ad.total_clicks || 0} ({ad.unique_clicks || 0} unique)
                    </div>
                  )}
                  {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> View Link
                    </a>
                  )}
                </div>
                {ad.image_url && (
                  <img src={ad.image_url} alt="Ad preview" className="h-20 w-auto rounded-lg object-cover" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AccountPageLayout>
  );
}

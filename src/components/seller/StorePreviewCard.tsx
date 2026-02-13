import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function StorePreviewCard() {
  const { store } = useSellerStatus();

  if (!store?.slug) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Store Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mini store card preview */}
        <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
          {/* Mini banner */}
          <div className="h-16 bg-gradient-to-br from-muted to-card relative">
            {store.banner_url && (
              <img src={store.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            )}
          </div>

          <div className="p-3 -mt-5 relative">
            <div className="flex items-end gap-2.5">
              <Avatar className="h-10 w-10 border-2 border-card">
                <AvatarImage src={store.logo_url || ''} />
                <AvatarFallback className="bg-muted text-xs font-bold">
                  {store.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pb-0.5">
                <p className="text-sm font-semibold truncate">{store.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {store.product_count || 0} products · {store.follower_count || 0} followers
                </p>
              </div>
            </div>

            {store.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{store.description}</p>
            )}

            <div className="flex gap-2 mt-3">
              {store.is_verified && (
                <Badge variant="secondary" className="text-[10px] h-5">Verified</Badge>
              )}
              {store.is_active && (
                <Badge variant="outline" className="text-[10px] h-5 text-green-500 border-green-500/30">Active</Badge>
              )}
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" asChild className="w-full mt-3">
          <Link to={`/store/${store.slug}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View Live Store
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

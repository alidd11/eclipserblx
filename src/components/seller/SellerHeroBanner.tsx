import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { CheckCircle, Copy, ExternalLink, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function SellerHeroBanner() {
  const { store } = useSellerStatus();

  const storeUrl = store?.slug ? `${window.location.origin}/store/${store.slug}` : '';

  const copyStoreLink = () => {
    if (storeUrl) {
      navigator.clipboard.writeText(storeUrl);
      toast.success('Store link copied!');
    }
  };

  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Banner area with store branding */}
      <div className="relative h-28 sm:h-32 bg-gradient-to-br from-muted via-muted/80 to-card overflow-hidden">
        {store?.banner_url && (
          <img
            src={store.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
      </div>

      <CardContent className="relative -mt-10 px-4 sm:px-6 pb-5">
        {/* Avatar + Name row */}
        <div className="flex items-end gap-4 mb-3">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-card shadow-lg">
            <AvatarImage src={store?.logo_url || ''} alt={store?.name} />
            <AvatarFallback className="bg-muted text-2xl font-bold">
              {store?.name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {getTimeBasedGreeting()}, {store?.name || 'Seller'}
              </h1>
              {store?.is_verified && (
                <Badge variant="default" className="gap-1 shrink-0">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              Here's how your store is performing
              {(store?.follower_count ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {store.follower_count} followers
                </span>
              )}
            </p>
          </div>

          <Button asChild size="sm" className="shrink-0 hidden sm:flex">
            <Link to="/seller/products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Product
            </Link>
          </Button>
        </div>

        {/* Store link bar */}
        {storeUrl && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate flex-1">{storeUrl}</span>
            <Button variant="ghost" size="sm" onClick={copyStoreLink} className="h-7 px-2">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}

        {/* Mobile add product button */}
        <Button asChild size="sm" className="w-full mt-3 sm:hidden">
          <Link to="/seller/products/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Product
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

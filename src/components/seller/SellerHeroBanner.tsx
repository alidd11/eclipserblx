import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { CheckCircle, Copy, ExternalLink, Plus, Users, Share2, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/copyToClipboard';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function SellerHeroBanner() {
  const { store } = useSellerStatus();

  const storeUrl = store?.slug ? `${window.location.origin}/store/${store.slug}` : '';

  const copyStoreLink = () => {
    if (storeUrl) copyToClipboard(storeUrl, 'Store link copied!');
  };

  return (
    <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Banner bg with gradient overlay */}
      <div className="relative h-24 sm:h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent overflow-hidden">
        {store?.banner_url && (
          <img
            src={store.banner_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative -mt-8 px-4 sm:px-5 pb-4">
        <div className="flex items-end gap-3 sm:gap-4">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-[3px] border-card shadow-lg ring-1 ring-border/20">
            <AvatarImage src={store?.logo_url || ''} alt={store?.name} />
            <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
              {store?.name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold truncate">
                {getTimeBasedGreeting()}, {store?.name || 'Seller'}
              </h1>
              {store?.is_verified && (
                <Badge variant="default" className="gap-1 shrink-0 text-[10px] h-5">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{formatDate()}</span>
              {(store?.follower_count ?? 0) > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {store?.follower_count} followers
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 mt-3">
          <Button asChild size="sm" className="h-8 text-xs gap-1.5">
            <Link to="/seller/products/new">
              <Plus className="h-3.5 w-3.5" />
              New Product
            </Link>
          </Button>

          {storeUrl && (
            <>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Link to={`/store/${store?.slug}`}>
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">View Store</span>
                </Link>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground truncate flex-1">{storeUrl}</span>
                    <Button variant="ghost" size="sm" onClick={copyStoreLink} className="h-7 px-2 shrink-0">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="h-7 px-2 shrink-0">
                      <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { FollowButton } from '@/components/store/FollowButton';
import { Button } from '@/components/ui/button';
import { MessageCircle, Store as StoreIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoreFloatingHeaderProps {
  storeName: string;
  logoUrl?: string | null;
  storeId: string;
  accentColor: string;
  onMessage: () => void;
}

export function StoreFloatingHeader({ storeName, logoUrl, storeId, accentColor, onMessage }: StoreFloatingHeaderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border transition-transform duration-200",
        visible ? "translate-y-0" : "-translate-y-full"
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container px-4 py-2 flex items-center gap-3">
        {logoUrl ? (
          <img src={optimizeImageUrl(logoUrl, 32, 32, 'contain')} alt={storeName} className="h-8 w-8 rounded-lg object-contain" />
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
            <StoreIcon className="h-4 w-4 text-primary" />
          </div>
        )}
        <span className="font-bold text-sm truncate flex-1">{storeName}</span>
        <FollowButton storeId={storeId} accentColor={accentColor} size="sm" />
        <Button size="sm" onClick={onMessage} className="gap-1 h-8 px-3" style={{ backgroundColor: accentColor, color: 'white' }}>
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Message</span>
        </Button>
      </div>
    </div>
  );
}

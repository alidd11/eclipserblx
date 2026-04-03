import { motion } from 'framer-motion';
import { Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LiveStorePreviewProps {
  storeName: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string;
}

export function LiveStorePreview({ storeName, logoUrl, bannerUrl, accentColor }: LiveStorePreviewProps) {
  const [isMobile, setIsMobile] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setIsMobile(false)}
            className={cn(
              'p-1 rounded transition-colors',
              !isMobile ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsMobile(true)}
            className={cn(
              'p-1 rounded transition-colors',
              isMobile ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <motion.div
        layout
        className={cn(
          'mx-auto transition-all',
          isMobile ? 'max-w-[200px] py-3' : 'w-full'
        )}
      >
        <div className={cn(
          'overflow-hidden bg-background',
          isMobile && 'rounded-xl border border-border'
        )}>
          {/* Banner */}
          <div
            className="h-16 w-full bg-muted relative"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : accentColor ? { background: accentColor } : undefined}
          />

          {/* Store info */}
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {storeName?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold truncate max-w-[120px]">{storeName || 'Your Store'}</div>
                <div className="text-[10px] text-muted-foreground">0 products</div>
              </div>
            </div>

            {/* Product skeleton */}
            <div className={cn('grid gap-1.5', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
              {Array.from({ length: isMobile ? 2 : 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="aspect-square rounded bg-muted animate-pulse" />
                  <div className="h-1.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-1.5 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

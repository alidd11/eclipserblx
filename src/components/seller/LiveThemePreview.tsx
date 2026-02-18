import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ShoppingCart, Star } from 'lucide-react';

interface LiveThemePreviewProps {
  theme: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  layoutStyle: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  announcementText: string;
  announcementActive: boolean;
  bannerUrl?: string;
}

const FONT_MAP: Record<string, string> = {
  inter: '"Inter", sans-serif',
  roboto: '"Roboto", sans-serif',
  poppins: '"Poppins", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  playfair: '"Playfair Display", serif',
  'space-grotesk': '"Space Grotesk", sans-serif',
  'dm-sans': '"DM Sans", sans-serif',
};

export function LiveThemePreview({
  theme,
  accentColor,
  fontHeading,
  fontBody,
  layoutStyle,
  heroTitle,
  heroSubtitle,
  heroCta,
  announcementText,
  announcementActive,
  bannerUrl,
}: LiveThemePreviewProps) {
  const headingFont = FONT_MAP[fontHeading] || FONT_MAP.inter;
  const bodyFont = FONT_MAP[fontBody] || FONT_MAP.inter;

  const getThemeBg = () => {
    switch (theme) {
      case 'dark': return 'bg-zinc-900 text-white';
      case 'gradient': return 'bg-gradient-to-br from-card to-muted/50';
      case 'bold': return 'bg-card border-2';
      case 'minimal': return 'bg-background';
      default: return 'bg-card';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`${getThemeBg()} rounded-b-lg overflow-hidden`}>
          {/* Announcement */}
          {announcementActive && announcementText && (
            <div 
              className="text-center text-xs py-1.5 px-2 text-white"
              style={{ backgroundColor: accentColor }}
            >
              {announcementText}
            </div>
          )}

          {/* Banner */}
          <div 
            className="h-16 w-full relative"
            style={{ 
              backgroundColor: bannerUrl ? undefined : `${accentColor}22`,
              backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-3">
              <p 
                className="text-white text-sm font-bold truncate"
                style={{ fontFamily: headingFont }}
              >
                {heroTitle || 'Your Store'}
              </p>
              {heroSubtitle && (
                <p className="text-white/70 text-[10px] truncate" style={{ fontFamily: bodyFont }}>
                  {heroSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Mini product grid */}
          <div className="p-3 space-y-2">
            {heroCta && (
              <Button 
                size="sm" 
                className="w-full text-xs h-7"
                style={{ backgroundColor: accentColor, color: 'white' }}
              >
                {heroCta}
              </Button>
            )}
            <div className={`gap-2 ${layoutStyle === 'list' ? 'space-y-1.5' : 'grid grid-cols-2'}`}>
              {[1, 2].map(i => (
                <div 
                  key={i} 
                  className={`rounded border border-border/50 p-2 ${layoutStyle === 'list' ? 'flex items-center gap-2' : ''}`}
                >
                  <div 
                    className={`rounded bg-muted ${layoutStyle === 'list' ? 'h-8 w-8 shrink-0' : 'h-10 w-full mb-1.5'}`} 
                  />
                  <div>
                    <p className="text-[10px] font-medium truncate" style={{ fontFamily: headingFont }}>
                      Product {i}
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                      <span className="text-[9px] text-muted-foreground" style={{ fontFamily: bodyFont }}>4.8</span>
                    </div>
                    <p className="text-[10px] font-bold" style={{ color: accentColor }}>
                      £{(4.99 * i).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store as StoreIcon, 
  ExternalLink,
  Twitter,
  Youtube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/components/chat/ChatWidget';

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

interface StoreLayoutProps {
  children: ReactNode;
  store: {
    id: string;
    name: string;
    logo_url?: string | null;
    accent_color?: string;
    social_discord?: string | null;
    social_twitter?: string | null;
    social_youtube?: string | null;
    social_tiktok?: string | null;
    social_website?: string | null;
  };
}

export function StoreLayout({ children, store }: StoreLayoutProps) {
  const accentColor = store.accent_color || '#8b5cf6';

  const socialLinks = [
    { url: store.social_discord, icon: DiscordIcon, label: 'Discord' },
    { url: store.social_twitter, icon: Twitter, label: 'Twitter' },
    { url: store.social_youtube, icon: Youtube, label: 'YouTube' },
    { url: store.social_tiktok, icon: TikTokIcon, label: 'TikTok' },
    { url: store.social_website, icon: ExternalLink, label: 'Website' },
  ].filter(link => link.url);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Store Header */}
      <header 
        className="sticky top-0 z-50 border-b backdrop-blur-md pt-[env(safe-area-inset-top)]"
        style={{ 
          backgroundColor: `hsl(var(--background) / 0.95)`,
          borderColor: `${accentColor}20`,
        }}
      >
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to={`/store/${store.id}`} className="flex items-center gap-3">
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <StoreIcon className="h-4 w-4" style={{ color: accentColor }} />
              </div>
            )}
            <span 
              className="font-display font-bold text-lg"
              style={{ color: accentColor }}
            >
              {store.name}
            </span>
          </Link>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-1">
              {socialLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a 
                    href={link.url!} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={link.label}
                  >
                    <link.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Store Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {store.logo_url ? (
                <img 
                  src={store.logo_url} 
                  alt={store.name}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <StoreIcon className="h-5 w-5" style={{ color: accentColor }} />
              )}
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {store.name}. All rights reserved.
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Powered by{' '}
                <Link 
                  to="/" 
                  className="font-medium hover:text-foreground transition-colors"
                  style={{ color: accentColor }}
                >
                  Eclipse Store
                </Link>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}

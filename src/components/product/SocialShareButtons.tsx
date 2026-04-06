import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
}

export function SocialShareButtons({ url, title, description }: SocialShareButtonsProps) {
  const sharePath = url.startsWith('http') ? url : `https://eclipserblx.com/share${url}`;
  const fullUrl = url.startsWith('http') ? url : `https://eclipserblx.com${url}`;
  const text = description ? `${title} — ${description}` : title;

  const handleCopyForDiscord = () => {
    navigator.clipboard.writeText(`\uD83C\uDFAE **${title}**\n${sharePath}`);
    toast.success('Copied for Discord!');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url: sharePath });
      } catch {}
    } else {
      navigator.clipboard.writeText(sharePath);
      toast.success('Link copied!');
    }
  };

  const items = [
    {
      name: 'Twitter / X',
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`, '_blank'),
    },
    {
      name: 'Discord',
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      ),
      onClick: handleCopyForDiscord,
    },
    {
      name: 'Share',
      icon: <Share2 className="h-3.5 w-3.5" />,
      onClick: handleNativeShare,
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {items.map((item) => (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={item.onClick}
              aria-label={item.name}
            >
              {item.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {item.name}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { MessageCircle } from 'lucide-react';

export function PWADiscordBanner() {
  const { discordUrl } = useDiscordUrl();

  return (
    <a
      href={discordUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden border border-border bg-[#5865F2] hover:bg-[#4752C4] transition-colors active:scale-[0.99]"
    >
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/15 flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white tracking-tight">JOIN THE COMMUNITY</h4>
            <p className="text-[11px] text-white/70 truncate">Chat, get support & stay updated</p>
          </div>
        </div>
        <span className="text-white/80 text-lg flex-shrink-0">→</span>
      </div>
    </a>
  );
}

import { cn } from '@/lib/utils';

interface EmbedPreviewProps {
  title: string;
  description: string;
  color: string;
  linkUrl?: string;
  footerText: string;
  pingText?: string;
}

export function DiscordEmbedPreview({ title, description, color, linkUrl, footerText, pingText }: EmbedPreviewProps) {
  return (
    <div className="rounded-lg bg-[#2b2d31] p-3 space-y-2 font-sans text-sm overflow-hidden">
      {/* Ping preview */}
      {pingText && (
        <p className="text-[#dee0fc] text-[13px]">{pingText}</p>
      )}

      {/* Embed */}
      <div className="flex rounded overflow-hidden">
        {/* Color bar */}
        <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: color }} />

        <div className="bg-[#2f3136] p-3 flex-1 space-y-1.5 min-w-0">
          {/* Title */}
          <p className="font-semibold text-white text-[15px] leading-snug">
            {title || 'Announcement Title'}
          </p>

          {/* Description */}
          <p className="text-[#dcddde] text-[13px] whitespace-pre-wrap break-words leading-relaxed">
            {description || 'Your announcement message will appear here...'}
          </p>

          {/* Link field */}
          {linkUrl && (
            <div className="pt-1">
              <p className="text-[#b9bbbe] text-[11px] font-semibold uppercase tracking-wide">🔗 Link</p>
              <p className="text-[#00aff4] text-[13px] truncate">{linkUrl}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#40444b]">
            <p className="text-[#72767d] text-[11px]">{footerText} • Today</p>
          </div>
        </div>
      </div>
    </div>
  );
}

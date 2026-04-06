import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Users, ExternalLink, Copy, Check } from 'lucide-react';
import type { DiscordSettingsData } from '@/hooks/useDiscordSettings';

interface GeneralTabProps {
  formData: DiscordSettingsData;
  handleChange: (key: keyof DiscordSettingsData, value: string) => void;
  handleCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

export function GeneralTab({ formData, handleChange, handleCopy, copiedField }: GeneralTabProps) {
  return (
    <div className="space-y-4">
      {/* Invite URL */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/20"><Link2 className="h-4 w-4 text-blue-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Discord Invite</h4>
            <p className="text-xs text-muted-foreground">Used across website (Support, Footer, Legal)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={formData.discord_invite_url}
            onChange={(e) => handleChange('discord_invite_url', e.target.value)}
            placeholder="https://discord.gg/yourserver"
            className="bg-background flex-1 h-9 text-sm"
          />
          <Button variant="outline" size="icon" aria-label="Confirm" className="h-9 w-9" onClick={() => handleCopy(formData.discord_invite_url, 'invite')} disabled={!formData.discord_invite_url}>
            {copiedField === 'invite' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" aria-label="Open in new tab" className="h-9 w-9" asChild disabled={!formData.discord_invite_url}>
            <a href={formData.discord_invite_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        </div>
      </div>

      {/* Widget */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-indigo-500/20"><Users className="h-4 w-4 text-indigo-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Discord Widget</h4>
            <p className="text-xs text-muted-foreground">Display online members on homepage</p>
          </div>
        </div>
        <Input
          value={formData.discord_widget_server_id}
          onChange={(e) => handleChange('discord_widget_server_id', e.target.value)}
          placeholder="Server ID (enable widget in Discord settings)"
          className="bg-background h-9 text-sm"
        />
      </div>
    </div>
  );
}

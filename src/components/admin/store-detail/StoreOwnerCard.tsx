import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, MessageCircle, Gamepad2, Lock, Unlock, Link2, ExternalLink } from 'lucide-react';
import { format, parseISO } from '@/lib/dateUtils';

interface StoreOwnerCardProps {
  store: { created_at: string; discord_invite?: string; [key: string]: unknown };
  ownerProfile: { avatar_url?: string; display_name?: string; username?: string; email?: string; customer_id?: string; discord_username?: string; discord_id?: string; roblox_username?: string; roblox_user_id?: string; accounts_locked?: boolean } | null;
  onUnlockAccounts: () => void;
  onLockAccounts: () => void;
  isUnlocking: boolean;
  isLocking: boolean;
}

export function StoreOwnerCard({ store, ownerProfile, onUnlockAccounts, onLockAccounts, isUnlocking, isLocking }: StoreOwnerCardProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <User className="h-5 w-5" />
          Store Owner
        </h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          {ownerProfile?.avatar_url ? (
            <img src={ownerProfile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{ownerProfile?.display_name || 'Unknown User'}</p>
            {ownerProfile?.username && (
              <p className="text-xs text-muted-foreground">@{ownerProfile.username}</p>
            )}
            <p className="text-sm text-muted-foreground">{ownerProfile?.email}</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 text-sm">
          {ownerProfile?.customer_id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer ID</span>
              <span className="font-mono">{ownerProfile.customer_id}</span>
            </div>
          )}

          <Separator />

          {/* Linked Accounts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Accounts</p>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                Discord
              </span>
              {ownerProfile?.discord_username ? (
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/30">
                    {ownerProfile.discord_username}
                  </Badge>
                  {ownerProfile.discord_id && (
                    <span className="text-xs text-muted-foreground font-mono">{ownerProfile.discord_id}</span>
                  )}
                </span>
              ) : (
                <Badge variant="destructive">Not Linked</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Gamepad2 className="h-4 w-4" />
                Roblox
              </span>
              {ownerProfile?.roblox_username ? (
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                    {ownerProfile.roblox_username}
                  </Badge>
                  {ownerProfile.roblox_user_id && (
                    <span className="text-xs text-muted-foreground font-mono">{ownerProfile.roblox_user_id}</span>
                  )}
                </span>
              ) : (
                <Badge variant="destructive">Not Linked</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Lock Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                {ownerProfile?.accounts_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                Account Links
              </span>
              {ownerProfile?.accounts_locked ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Locked</Badge>
                  <Button variant="outline" size="sm" onClick={onUnlockAccounts} disabled={isUnlocking}>
                    <Unlock className="h-3 w-3 mr-1" />
                    Unlock
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Unlocked</Badge>
                  <Button variant="outline" size="sm" onClick={onLockAccounts} disabled={isLocking}>
                    <Lock className="h-3 w-3 mr-1" />
                    Lock
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {ownerProfile?.accounts_locked
                ? 'User cannot change their linked Discord/Roblox accounts.'
                : 'User can currently modify their linked accounts. Lock to prevent changes.'}
            </p>
          </div>

          <Separator />

          {/* Discord Server Invite */}
          {(store as any).discord_invite && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Link2 className="h-4 w-4" />
                Discord Server
              </span>
              <a
                href={(store as Record<string, unknown>).discord_invite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Join Server
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <span className="text-muted-foreground">Store Created</span>
            <span>{format(parseISO(store.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

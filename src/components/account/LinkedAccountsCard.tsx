import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { openExternalUrl } from '@/lib/externalBrowser';
import { 
  Link2, 
  Unlink, 
  Loader2, 
  Check, 
  X, 
  ExternalLink,
  Gamepad2,
  Sparkles,
  Copy
} from 'lucide-react';

// Discord icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

interface LinkedAccountsCardProps {
  userId: string;
  discordId: string | null;
  discordUsername: string | null;
  robloxUserId: string | null;
  robloxUsername: string | null;
  hasEclipsePlus: boolean;
  accountsLocked?: boolean;
  onUpdate: () => void;
}

// Discord OAuth configuration
const DEFAULT_DISCORD_CLIENT_ID = "1460773107446059273";

const getDiscordClientId = () => {
  const envId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const resolved = (typeof envId === "string" ? envId : "").trim();
  return resolved || DEFAULT_DISCORD_CLIENT_ID;
};

const getRedirectUri = () => {
  return new URL("/account", window.location.origin).toString();
};

const getDiscordOAuthUrl = () => {
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scope = encodeURIComponent("identify");
  const clientId = encodeURIComponent(getDiscordClientId());
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
};

export function LinkedAccountsCard({
  userId,
  discordId,
  discordUsername,
  robloxUserId,
  robloxUsername,
  hasEclipsePlus,
  accountsLocked = false,
  onUpdate,
}: LinkedAccountsCardProps) {
  const queryClient = useQueryClient();
  const { toast: toastHook } = useToast();
  
  // Discord state
  const [isLinkingDiscord, setIsLinkingDiscord] = useState(false);
  const [isUnlinkingDiscord, setIsUnlinkingDiscord] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  
  // Roblox state
  const [robloxInput, setRobloxInput] = useState('');
  const [isVerifyingRoblox, setIsVerifyingRoblox] = useState(false);
  const [isUnlinkingRoblox, setIsUnlinkingRoblox] = useState(false);
  const [verifiedRoblox, setVerifiedRoblox] = useState<{ id: string; name: string; displayName: string } | null>(null);
  const [robloxError, setRobloxError] = useState<string | null>(null);

  const isDiscordLinked = !!discordId && !!discordUsername;
  const isRobloxLinked = !!robloxUserId && !!robloxUsername;

  const getRobloxAvatarUrl = (id: string) => 
    `https://www.roblox.com/headshot-thumbnail/image?userId=${id}&width=150&height=150&format=png`;

  // Handle Discord OAuth callback and auto-link action from Discord /link command
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const action = urlParams.get("action");

      // Handle auto-link action from Discord /link command
      if (action === "link-discord" && !discordId && !code) {
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete("action");
        window.history.replaceState({}, "", url.toString());
        
        // Auto-trigger Discord OAuth
        const clientId = getDiscordClientId();
        if (clientId) {
          setIsLinkingDiscord(true);
          window.location.href = getDiscordOAuthUrl();
        }
        return;
      }

      if (code || error) {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        url.searchParams.delete("action");
        window.history.replaceState({}, "", url.toString());
      }

      if (error) {
        toastHook({
          title: "Discord Authorization Failed",
          description: urlParams.get("error_description") || "Authorization was cancelled or failed",
          variant: "destructive",
        });
        return;
      }

      if (code && userId && !discordId) {
        setIsProcessingOAuth(true);
        try {
          const { data, error: invokeError } = await supabase.functions.invoke(
            "discord-oauth-callback",
            { body: { code, redirect_uri: getRedirectUri(), user_id: userId } }
          );

          if (invokeError) throw invokeError;
          if (data?.error) throw new Error(data.error);

          toastHook({
            title: "Discord Linked!",
            description: `Connected as ${data.discord_username || data.discord_global_name || "Discord User"}`,
          });

          if (hasEclipsePlus) {
            try {
              await supabase.functions.invoke("send-discord-webhook", {
                body: { user_id: userId, event: "subscription_activated", granted_by_admin: false },
              });
            } catch (webhookError) {
              console.error("Webhook error:", webhookError);
            }
          }

          onUpdate();
        } catch (err: unknown) {
          console.error("OAuth callback error:", err);
          toastHook({
            title: "Link Failed",
            description: err instanceof Error ? err.message : "Failed to link Discord account",
            variant: "destructive",
          });
        } finally {
          setIsProcessingOAuth(false);
        }
      }
    };

    handleOAuthCallback();
  }, [userId, discordId, hasEclipsePlus, onUpdate, toastHook]);

  const handleLinkDiscord = async () => {
    const clientId = getDiscordClientId();
    if (!clientId) {
      toastHook({ title: "Configuration Error", description: "Discord OAuth is not configured.", variant: "destructive" });
      return;
    }
    setIsLinkingDiscord(true);
    await openExternalUrl(getDiscordOAuthUrl());
  };

  const handleUnlinkDiscord = async () => {
    setIsUnlinkingDiscord(true);
    try {
      if (hasEclipsePlus && discordId) {
        await supabase.functions.invoke("send-discord-webhook", {
          body: { user_id: userId, event: "subscription_deactivated", granted_by_admin: false },
        }).catch(console.error);
      }

      const { error } = await supabase
        .from("profiles")
        .update({ discord_id: null, discord_username: null })
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Discord account unlinked");
      onUpdate();
    } catch (error) {
      console.error("Error unlinking Discord:", error);
      toast.error("Failed to unlink Discord account");
    } finally {
      setIsUnlinkingDiscord(false);
    }
  };

  const handleVerifyRoblox = async () => {
    if (!robloxInput.trim()) return;
    setIsVerifyingRoblox(true);
    setRobloxError(null);
    setVerifiedRoblox(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox-user', {
        body: { username: robloxInput.trim() },
      });

      if (error) throw new Error('Failed to verify username');
      if (!data.found) {
        setRobloxError('Username not found on Roblox');
        return;
      }

      setVerifiedRoblox({ id: data.id, name: data.name, displayName: data.displayName });
    } catch (error) {
      console.error('Roblox verification error:', error);
      setRobloxError('Failed to verify username. Please try again.');
    } finally {
      setIsVerifyingRoblox(false);
    }
  };

  const handleLinkRoblox = async () => {
    if (!verifiedRoblox) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roblox_user_id: verifiedRoblox.id, roblox_username: verifiedRoblox.name })
        .eq('user_id', userId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      setRobloxInput('');
      setVerifiedRoblox(null);
      toast.success('Roblox account linked successfully!');
      onUpdate();
    } catch (error) {
      console.error('Failed to link Roblox account:', error);
      toast.error('Failed to link account. Please try again.');
    }
  };

  const handleUnlinkRoblox = async () => {
    setIsUnlinkingRoblox(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roblox_user_id: null, roblox_username: null })
        .eq('user_id', userId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast.success('Roblox account unlinked');
      onUpdate();
    } catch (error) {
      console.error('Failed to unlink Roblox account:', error);
      toast.error('Failed to unlink account');
    } finally {
      setIsUnlinkingRoblox(false);
    }
  };

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(getRedirectUri());
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 1500);
    } catch {
      toast.error("Could not copy the redirect URI");
    }
  };

  if (isProcessingOAuth) {
    return (
      <Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#5865F2] mx-auto" />
            <p className="text-sm text-muted-foreground">Linking your Discord account...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Linked Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discord Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <DiscordIcon className="h-4 w-4 text-[#5865F2]" />
            Discord
            {isDiscordLinked && hasEclipsePlus && (
              <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-400 text-[10px] px-1.5 py-0">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                Role
              </Badge>
            )}
          </div>
          
          {isDiscordLinked ? (
            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                  <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{discordUsername}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{discordId}</p>
                </div>
              </div>
              {!accountsLocked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnlinkDiscord}
                  disabled={isUnlinkingDiscord}
                  className="text-destructive hover:text-destructive h-8 px-2"
                >
                  {isUnlinkingDiscord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                </Button>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Locked</Badge>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleLinkDiscord}
                disabled={isLinkingDiscord}
                size="sm"
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] h-9"
              >
                {isLinkingDiscord ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting...</>
                ) : (
                  <><DiscordIcon className="w-4 h-4 mr-2" />Link Discord</>
                )}
              </Button>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Having trouble?
                </summary>
                <div className="mt-2 p-2 bg-muted/50 rounded border border-border space-y-1.5">
                  <p className="text-muted-foreground break-all font-mono text-[10px]">{getRedirectUri()}</p>
                  <Button type="button" variant="outline" size="sm" onClick={copyRedirectUri} className="h-7 text-xs">
                    {copiedRedirect ? <><Check className="mr-1 h-3 w-3" />Copied</> : <><Copy className="mr-1 h-3 w-3" />Copy URI</>}
                  </Button>
                </div>
              </details>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Roblox Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Gamepad2 className="h-4 w-4 text-primary" />
            Roblox
          </div>
          
          {isRobloxLinked ? (
            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getRobloxAvatarUrl(robloxUserId!)} alt={robloxUsername!} />
                  <AvatarFallback className="bg-primary/10"><Gamepad2 className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{robloxUsername}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{robloxUserId}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground h-8 px-2">
                  <a href={`https://www.roblox.com/users/${robloxUserId}/profile`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                {!accountsLocked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlinkRoblox}
                    disabled={isUnlinkingRoblox}
                    className="text-destructive hover:text-destructive h-8 px-2"
                  >
                    {isUnlinkingRoblox ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Locked</Badge>
                )}
              </div>
            </div>
          ) : accountsLocked ? (
            <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
              Accounts locked. Contact staff to make changes.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Roblox username"
                  value={robloxInput}
                  onChange={(e) => {
                    setRobloxInput(e.target.value);
                    setRobloxError(null);
                    setVerifiedRoblox(null);
                  }}
                  className="flex-1 h-9"
                />
                <Button
                  onClick={handleVerifyRoblox}
                  disabled={!robloxInput.trim() || isVerifyingRoblox}
                  variant="secondary"
                  size="sm"
                  className="h-9"
                >
                  {isVerifyingRoblox ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>

              {robloxError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <X className="h-3 w-3" />
                  {robloxError}
                </div>
              )}

              {verifiedRoblox && (
                <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getRobloxAvatarUrl(verifiedRoblox.id)} alt={verifiedRoblox.displayName} />
                      <AvatarFallback className="bg-primary/10"><Gamepad2 className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        <p className="font-medium text-sm">{verifiedRoblox.displayName}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">@{verifiedRoblox.name}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleLinkRoblox} className="h-8">Link</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {accountsLocked && (isDiscordLinked || isRobloxLinked) && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Accounts locked after becoming a seller. Contact staff to request changes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

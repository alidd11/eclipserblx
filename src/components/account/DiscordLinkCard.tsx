import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Unlink, Sparkles, Loader2 } from "lucide-react";

interface DiscordLinkCardProps {
  userId: string;
  currentDiscordId: string | null;
  currentDiscordUsername: string | null;
  hasEclipsePlus: boolean;
  accountsLocked?: boolean;
  onUpdate: () => void;
}

// Discord OAuth configuration
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;

const getRedirectUri = () => {
  return `${window.location.origin}/account`;
};

const getDiscordOAuthUrl = () => {
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scope = encodeURIComponent("identify");
  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
};

export const DiscordLinkCard = ({
  userId,
  currentDiscordId,
  currentDiscordUsername,
  hasEclipsePlus,
  accountsLocked = false,
  onUpdate,
}: DiscordLinkCardProps) => {
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const { toast } = useToast();

  // Handle OAuth callback when component mounts
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      // Clean up URL params regardless of outcome
      if (code || error) {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        window.history.replaceState({}, "", url.toString());
      }

      if (error) {
        toast({
          title: "Discord Authorization Failed",
          description: urlParams.get("error_description") || "Authorization was cancelled or failed",
          variant: "destructive",
        });
        return;
      }

      if (code && userId && !currentDiscordId) {
        setIsProcessingOAuth(true);
        try {
          const { data, error: invokeError } = await supabase.functions.invoke(
            "discord-oauth-callback",
            {
              body: {
                code,
                redirect_uri: getRedirectUri(),
                user_id: userId,
              },
            }
          );

          if (invokeError) throw invokeError;

          if (data?.error) {
            throw new Error(data.error);
          }

          toast({
            title: "Discord Linked!",
            description: `Connected as ${data.discord_username || data.discord_global_name || "Discord User"}`,
          });

          // If user has Eclipse+, trigger webhook to assign role
          if (hasEclipsePlus) {
            try {
              await supabase.functions.invoke("send-discord-webhook", {
                body: {
                  user_id: userId,
                  event: "subscription_activated",
                  granted_by_admin: false,
                },
              });
              toast({
                title: "Eclipse+ Role Requested",
                description: "Your Eclipse+ role should be assigned shortly.",
              });
            } catch (webhookError) {
              console.error("Webhook error:", webhookError);
            }
          }

          onUpdate();
        } catch (err: unknown) {
          console.error("OAuth callback error:", err);
          const errorMessage = err instanceof Error ? err.message : "Failed to link Discord account";
          toast({
            title: "Link Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsProcessingOAuth(false);
        }
      }
    };

    handleOAuthCallback();
  }, [userId, currentDiscordId, hasEclipsePlus, onUpdate, toast]);

  const handleLinkWithOAuth = () => {
    if (!DISCORD_CLIENT_ID) {
      toast({
        title: "Configuration Error",
        description: "Discord OAuth is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    setIsLinking(true);
    window.location.href = getDiscordOAuthUrl();
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      // If user has Eclipse+, send deactivation webhook before unlinking
      if (hasEclipsePlus && currentDiscordId) {
        try {
          await supabase.functions.invoke("send-discord-webhook", {
            body: {
              user_id: userId,
              event: "subscription_deactivated",
              granted_by_admin: false,
            },
          });
        } catch (webhookError) {
          console.error("Webhook error:", webhookError);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          discord_id: null,
          discord_username: null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Discord Unlinked",
        description: "Your Discord account has been unlinked.",
      });
      onUpdate();
    } catch (error: unknown) {
      console.error("Error unlinking Discord:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to unlink Discord account";
      toast({
        title: "Unlink Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  if (isProcessingOAuth) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#5865F2] mx-auto" />
            <p className="text-sm text-muted-foreground">Linking your Discord account...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#5865F2]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <CardTitle className="text-lg">Discord Account</CardTitle>
          </div>
          {currentDiscordId && hasEclipsePlus && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-400">
              <Sparkles className="w-3 h-3 mr-1" />
              Role Active
            </Badge>
          )}
        </div>
        <CardDescription>
          Link your Discord to receive the Eclipse+ role automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentDiscordId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-[#5865F2]" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {currentDiscordUsername || "Discord User"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {currentDiscordId}
                  </p>
                </div>
              </div>
              {!accountsLocked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  {isUnlinking ? "Unlinking..." : "Unlink"}
                </Button>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Locked
                </Badge>
              )}
            </div>
            
            {accountsLocked && (
              <p className="text-xs text-muted-foreground text-center">
                Your linked accounts are locked after becoming a seller. Contact staff to request changes.
              </p>
            )}
            
            {!hasEclipsePlus && !accountsLocked && (
              <p className="text-sm text-muted-foreground text-center">
                Subscribe to Eclipse+ to get the special Discord role!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={handleLinkWithOAuth}
              disabled={isLinking}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4]"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting to Discord...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  Link with Discord
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Discord to authorize the connection
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

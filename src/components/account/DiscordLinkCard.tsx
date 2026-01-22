import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Unlink, HelpCircle, Sparkles, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DiscordLinkCardProps {
  userId: string;
  currentDiscordId: string | null;
  currentDiscordUsername: string | null;
  hasEclipsePlus: boolean;
  accountsLocked?: boolean;
  onUpdate: () => void;
}

export const DiscordLinkCard = ({
  userId,
  currentDiscordId,
  currentDiscordUsername,
  hasEclipsePlus,
  accountsLocked = false,
  onUpdate,
}: DiscordLinkCardProps) => {
  const [discordId, setDiscordId] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const { toast } = useToast();

  const isValidDiscordId = (id: string) => /^\d{17,19}$/.test(id);

  const handleLink = async () => {
    if (!discordId.trim()) {
      toast({
        title: "Discord ID Required",
        description: "Please enter your Discord User ID",
        variant: "destructive",
      });
      return;
    }

    if (!isValidDiscordId(discordId.trim())) {
      toast({
        title: "Invalid Discord ID",
        description: "Discord User IDs are 17-19 digit numbers",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          discord_id: discordId.trim(),
          discord_username: discordUsername.trim() || null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Discord Linked!",
        description: "Your Discord account has been linked successfully.",
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
          // Don't fail the link operation if webhook fails
        }
      }

      setDiscordId("");
      setDiscordUsername("");
      onUpdate();
    } catch (error: any) {
      console.error("Error linking Discord:", error);
      toast({
        title: "Link Failed",
        description: error.message || "Failed to link Discord account",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
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
    } catch (error: any) {
      console.error("Error unlinking Discord:", error);
      toast({
        title: "Unlink Failed",
        description: error.message || "Failed to unlink Discord account",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

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
        ) : accountsLocked ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Your linked accounts are locked. Contact staff to make changes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="discord-id">Discord User ID</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">
                        <strong>How to find your Discord ID:</strong>
                        <br />
                        1. Open Discord Settings
                        <br />
                        2. Go to Advanced → Enable Developer Mode
                        <br />
                        3. Right-click your username → Copy User ID
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="discord-id"
                placeholder="e.g., 123456789012345678"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord-username">
                Discord Username{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="discord-username"
                placeholder="e.g., username#0000 or @username"
                value={discordUsername}
                onChange={(e) => setDiscordUsername(e.target.value)}
              />
            </div>

            <Button
              onClick={handleLink}
              disabled={isLinking || !discordId.trim()}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4]"
            >
              <Link2 className="w-4 h-4 mr-2" />
              {isLinking ? "Linking..." : "Link Discord Account"}
            </Button>

            <a
              href="https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              How to find your Discord User ID
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

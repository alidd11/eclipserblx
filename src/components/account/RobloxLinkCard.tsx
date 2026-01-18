import { useState } from 'react';
import { Gamepad2, Loader2, Check, X, Unlink, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RobloxLinkCardProps {
  userId: string;
  robloxUserId: string | null;
  robloxUsername: string | null;
}

export function RobloxLinkCard({ userId, robloxUserId, robloxUsername }: RobloxLinkCardProps) {
  const queryClient = useQueryClient();
  const [inputUsername, setInputUsername] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [verifiedData, setVerifiedData] = useState<{ id: string; name: string; displayName: string } | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const isLinked = !!robloxUserId && !!robloxUsername;

  // Generate Roblox avatar URL
  const getAvatarUrl = (robloxId: string) => {
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png`;
  };

  const handleVerifyUsername = async () => {
    if (!inputUsername.trim()) return;

    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedData(null);

    try {
      // Use Roblox API to look up user by username
      const response = await fetch(
        `https://users.roblox.com/v1/usernames/users`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usernames: [inputUsername.trim()],
            excludeBannedUsers: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify username');
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        setVerificationError('Username not found on Roblox');
        return;
      }

      const user = data.data[0];
      setVerifiedData({
        id: user.id.toString(),
        name: user.name,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error('Roblox verification error:', error);
      setVerificationError('Failed to verify username. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!verifiedData) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          roblox_user_id: verifiedData.id,
          roblox_username: verifiedData.displayName || verifiedData.name,
        })
        .eq('user_id', userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      setInputUsername('');
      setVerifiedData(null);
      toast.success('Roblox account linked successfully!');
    } catch (error) {
      console.error('Failed to link Roblox account:', error);
      toast.error('Failed to link account. Please try again.');
    }
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          roblox_user_id: null,
          roblox_username: null,
        })
        .eq('user_id', userId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast.success('Roblox account unlinked');
    } catch (error) {
      console.error('Failed to unlink Roblox account:', error);
      toast.error('Failed to unlink account');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gamepad2 className="h-4 w-4" />
          Roblox Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          // Linked state
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={getAvatarUrl(robloxUserId!)} 
                  alt={robloxUsername!} 
                />
                <AvatarFallback className="bg-primary/10">
                  <Gamepad2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{robloxUsername}</p>
                <p className="text-xs text-muted-foreground">ID: {robloxUserId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-muted-foreground"
              >
                <a
                  href={`https://www.roblox.com/users/${robloxUserId}/profile`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnlink}
                disabled={isUnlinking}
                className="text-destructive hover:text-destructive"
              >
                {isUnlinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Unlinked state
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="roblox-username" className="text-sm">
                Roblox Username
              </Label>
              <div className="flex gap-2">
                <Input
                  id="roblox-username"
                  placeholder="Enter your Roblox username"
                  value={inputUsername}
                  onChange={(e) => {
                    setInputUsername(e.target.value);
                    setVerificationError(null);
                    setVerifiedData(null);
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleVerifyUsername}
                  disabled={!inputUsername.trim() || isVerifying}
                  variant="secondary"
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>

            {verificationError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <X className="h-4 w-4" />
                {verificationError}
              </div>
            )}

            {verifiedData && (
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={getAvatarUrl(verifiedData.id)} 
                      alt={verifiedData.displayName} 
                    />
                    <AvatarFallback className="bg-primary/10">
                      <Gamepad2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-green-500" />
                      <p className="font-medium text-sm">{verifiedData.displayName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      @{verifiedData.name} • ID: {verifiedData.id}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={handleLinkAccount}>
                  Link Account
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Linking your Roblox account helps us verify your identity for bot purchases.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

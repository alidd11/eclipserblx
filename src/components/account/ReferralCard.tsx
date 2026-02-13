import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Users, Gift, Share2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showSuccessNotification } from '@/lib/nativeNotification';

export function ReferralCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile-referral', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      
      // If no referral code exists, generate one
      if (!data?.referral_code) {
        const newCode = await generateReferralCode();
        if (newCode) {
          await supabase
            .from('profiles')
            .update({ referral_code: newCode })
            .eq('user_id', user.id);
          return { referral_code: newCode };
        }
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate a unique referral code
  const generateReferralCode = async (): Promise<string | null> => {
    const code = crypto.randomUUID().substring(0, 8).toUpperCase();
    // Check if code exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .maybeSingle();
    
    if (existing) {
      return generateReferralCode(); // Retry with new code
    }
    return code;
  };

  const { data: referrals } = useQuery({
    queryKey: ['user-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, completed: 0, pending: 0 };
      const { data, error } = await supabase
        .from('referrals')
        .select('status')
        .eq('referrer_id', user.id);
      if (error) throw error;
      
      const total = data?.length || 0;
      const completed = data?.filter(r => r.status === 'completed').length || 0;
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      
      return { total, completed, pending };
    },
    enabled: !!user?.id,
  });

  const { data: rewards } = useQuery({
    queryKey: ['user-referral-rewards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('referral_rewards')
        .select(`
          *,
          discount_code:discount_codes(code, discount_value, discount_type, expires_at)
        `)
        .eq('user_id', user.id)
        .eq('is_used', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const referralCode = profile?.referral_code;
  const referralLink = referralCode 
    ? `${window.location.origin}/auth?ref=${referralCode}` 
    : '';

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccessNotification('Copied!', `Referral ${type} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Eclipse Marketplace',
          text: 'Sign up using my referral link and we both get 10% off!',
          url: referralLink,
        });
      } catch {
        copyToClipboard(referralLink, 'link');
      }
    } else {
      copyToClipboard(referralLink, 'link');
    }
  };

  if (!referralCode) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Refer a Friend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-2xl font-bold">{referrals?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-2xl font-bold text-primary">{referrals?.completed || 0}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-2xl font-bold text-yellow-500">{referrals?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>

        {/* Referral Code */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted rounded-lg font-mono font-bold text-lg tracking-wider">
              {referralCode}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(referralCode, 'code')}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button onClick={shareReferral} className="w-full gradient-button border-0">
          <Share2 className="h-4 w-4 mr-2" />
          Share Referral Link
        </Button>

        {/* How it works */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-2">
          <p className="text-sm font-medium">How it works:</p>
          <ol className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
              Share your referral link with friends
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
              They sign up and make their first purchase
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
              You both get 10% off your next order!
            </li>
          </ol>
        </div>

        {/* Available Rewards */}
        {rewards && rewards.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Your Rewards ({rewards.length})
            </p>
            <div className="space-y-2">
              {rewards.map((reward: any) => (
                <div 
                  key={reward.id} 
                  className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                >
                  <div>
                    <p className="font-mono font-medium">{reward.discount_code?.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {reward.discount_code?.discount_type === 'percentage' 
                        ? `${reward.discount_code?.discount_value}% off` 
                        : `£${reward.discount_code?.discount_value} off`}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Available
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { Gamepad2, Webhook, ExternalLink, Copy, Check, Megaphone, CheckCircle2 } from 'lucide-react';

interface RobloxGeneralTabProps {
  gameUrl: string;
  setGameUrl: (v: string) => void;
  groupId: string;
  setGroupId: (v: string) => void;
  adBasicSubscriptionId: string;
  setAdBasicSubscriptionId: (v: string) => void;
  adBasicRobuxPrice: number;
  setAdBasicRobuxPrice: (v: number) => void;
  adProSubscriptionId: string;
  setAdProSubscriptionId: (v: string) => void;
  adProRobuxPrice: number;
  setAdProRobuxPrice: (v: number) => void;
  adPremiumSubscriptionId: string;
  setAdPremiumSubscriptionId: (v: string) => void;
  adPremiumRobuxPrice: number;
  setAdPremiumRobuxPrice: (v: number) => void;
  copiedField: string | null;
  copyToClipboard: (text: string, field: string) => void;
}

export function RobloxGeneralTab(props: RobloxGeneralTabProps) {
  const {
    gameUrl, setGameUrl, groupId, setGroupId,
    adBasicSubscriptionId, setAdBasicSubscriptionId, adBasicRobuxPrice, setAdBasicRobuxPrice,
    adProSubscriptionId, setAdProSubscriptionId, adProRobuxPrice, setAdProRobuxPrice,
    adPremiumSubscriptionId, setAdPremiumSubscriptionId, adPremiumRobuxPrice, setAdPremiumRobuxPrice,
    copiedField, copyToClipboard,
  } = props;

  return (
    <TabsContent value="general" className="space-y-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Game Configuration
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configure your Roblox game URL for Robux payments</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-url">Roblox Game URL</Label>
            <div className="flex gap-2">
              <Input id="game-url" placeholder="https://www.roblox.com/games/123456789/Your-Game" value={gameUrl} onChange={(e) => setGameUrl(e.target.value)} />
              {gameUrl && (
                <Button variant="outline" size="icon" aria-label="Open in new tab" asChild>
                  <a href={gameUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">This URL is used for the "Pay with Robux" button on product pages</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-id">Roblox Group ID</Label>
            <Input id="group-id" placeholder="12345678" value={groupId} onChange={(e) => setGroupId(e.target.value)} />
            <p className="text-xs text-muted-foreground">Your Roblox group ID for membership verification and discounts</p>
          </div>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Webhook className="h-5 w-5" />Webhook Configuration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configuration for receiving Robux purchase notifications</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Webhook Endpoint</p>
                <p className="text-xs text-muted-foreground">POST requests from your Roblox game</p>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">Active</Badge>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-webhook`} className="font-mono text-xs" />
              <Button variant="outline" size="icon" aria-label="Copy" onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-webhook`, 'webhook')}>
                {copiedField === 'webhook' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy the webhook URL above</li>
              <li>Add the RobuxWebhook.lua script to ServerScriptService</li>
              <li>Configure the WEBHOOK_SECRET in both Roblox and your backend</li>
              <li>Map your Roblox Product IDs to website products</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Advertisement Subscription Configuration */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Megaphone className="h-5 w-5 text-purple-500" />Advertisement Tier Subscriptions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Configure Roblox Subscriptions for each advertisement tier</p>
        </div>
        <div className="p-4 space-y-6">
          {[
            { label: 'Basic', color: 'blue', subId: adBasicSubscriptionId, setSubId: setAdBasicSubscriptionId, price: adBasicRobuxPrice, setPrice: setAdBasicRobuxPrice, placeholder: '100' },
            { label: 'Pro', color: 'purple', subId: adProSubscriptionId, setSubId: setAdProSubscriptionId, price: adProRobuxPrice, setPrice: setAdProRobuxPrice, placeholder: '200' },
            { label: 'Premium', color: 'amber', subId: adPremiumSubscriptionId, setSubId: setAdPremiumSubscriptionId, price: adPremiumRobuxPrice, setPrice: setAdPremiumRobuxPrice, placeholder: '500' },
          ].map((tier) => (
            <div key={tier.label} className="p-4 border border-border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`bg-${tier.color}-500/10 text-${tier.color}-500 border-${tier.color}-500/30`}>{tier.label}</Badge>
                {tier.subId && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Enabled
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subscription ID</Label>
                  <Input placeholder="Enter Roblox Subscription ID" value={tier.subId} onChange={(e) => tier.setSubId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Robux Price (per month)</Label>
                  <Input type="number" min={0} placeholder={tier.placeholder} value={tier.price} onChange={(e) => tier.setPrice(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          ))}

          {(adBasicSubscriptionId || adProSubscriptionId || adPremiumSubscriptionId) && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Robux subscriptions enabled for configured tiers</span>
              </div>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Advertisement Subscription Webhook</p>
                <p className="text-xs text-muted-foreground">Use this for Roblox Subscription events</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-ad-webhook`} className="font-mono text-xs" />
              <Button variant="outline" size="icon" aria-label="Copy" onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-ad-webhook`, 'ad-webhook')}>
                {copiedField === 'ad-webhook' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure your Roblox game to send SubscriptionPurchased, SubscriptionRenewed, SubscriptionExpired, and SubscriptionRefunded events to this webhook.
            </p>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { TabsContent } from '@/components/ui/tabs';
import { Users, Crown, Award } from 'lucide-react';

interface RobloxDiscountsTabProps {
  groupDiscountEnabled: boolean;
  setGroupDiscountEnabled: (v: boolean) => void;
  groupDiscountPercent: number;
  setGroupDiscountPercent: (v: number) => void;
  groupMinRank: number;
  setGroupMinRank: (v: number) => void;
  premiumDiscountEnabled: boolean;
  setPremiumDiscountEnabled: (v: boolean) => void;
  premiumDiscountPercent: number;
  setPremiumDiscountPercent: (v: number) => void;
  badgeRewardsEnabled: boolean;
  setBadgeRewardsEnabled: (v: boolean) => void;
}

export function RobloxDiscountsTab(props: RobloxDiscountsTabProps) {
  const {
    groupDiscountEnabled, setGroupDiscountEnabled, groupDiscountPercent, setGroupDiscountPercent,
    groupMinRank, setGroupMinRank, premiumDiscountEnabled, setPremiumDiscountEnabled,
    premiumDiscountPercent, setPremiumDiscountPercent, badgeRewardsEnabled, setBadgeRewardsEnabled,
  } = props;

  return (
    <TabsContent value="discounts" className="space-y-4">
      {/* Group Discount */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="h-5 w-5" />Group Member Discount</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Offer discounts to members of your Roblox group</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Group Discount</Label>
              <p className="text-xs text-muted-foreground">Linked group members get automatic discounts</p>
            </div>
            <Switch checked={groupDiscountEnabled} onCheckedChange={setGroupDiscountEnabled} />
          </div>
          {groupDiscountEnabled && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Discount Percentage</Label>
                  <Badge variant="secondary">{groupDiscountPercent}%</Badge>
                </div>
                <Slider value={[groupDiscountPercent]} onValueChange={([v]) => setGroupDiscountPercent(v)} min={1} max={50} step={1} className="w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-rank">Minimum Rank Required</Label>
                <Input id="min-rank" type="number" min={1} max={255} value={groupMinRank} onChange={(e) => setGroupMinRank(parseInt(e.target.value) || 1)} />
                <p className="text-xs text-muted-foreground">Only members with this rank or higher get the discount (1 = all members)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Premium Discount */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Roblox Premium Discount</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Reward Roblox Premium subscribers with exclusive discounts</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Premium Discount</Label>
              <p className="text-xs text-muted-foreground">Roblox Premium users get automatic discounts</p>
            </div>
            <Switch checked={premiumDiscountEnabled} onCheckedChange={setPremiumDiscountEnabled} />
          </div>
          {premiumDiscountEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Discount Percentage</Label>
                <Badge variant="secondary">{premiumDiscountPercent}%</Badge>
              </div>
              <Slider value={[premiumDiscountPercent]} onValueChange={([v]) => setPremiumDiscountPercent(v)} min={1} max={25} step={1} className="w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Badge Rewards */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Award className="h-5 w-5 text-purple-500" />Badge Rewards</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Unlock site badges for Roblox achievements</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Badge Sync</Label>
              <p className="text-xs text-muted-foreground">Award site badges based on Roblox badge ownership</p>
            </div>
            <Switch checked={badgeRewardsEnabled} onCheckedChange={setBadgeRewardsEnabled} />
          </div>
          {badgeRewardsEnabled && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Configure badge mappings in the Badges section to link Roblox badges to site rewards.</p>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
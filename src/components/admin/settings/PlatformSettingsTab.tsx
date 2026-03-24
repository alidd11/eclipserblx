import { ForceUpdateCard } from '@/components/admin/ForceUpdateCard';
import { AffiliateSettingsCard } from '@/components/admin/AffiliateSettingsCard';
import { EarlyAccessSettingsCard } from '@/components/admin/EarlyAccessSettingsCard';
import { MarketplaceControlsCard } from '@/components/admin/MarketplaceControlsCard';

export function PlatformSettingsTab() {
  return (
    <div className="space-y-6">
      <MarketplaceControlsCard />
      <ForceUpdateCard />
      <EarlyAccessSettingsCard />
      <AffiliateSettingsCard />
    </div>
  );
}

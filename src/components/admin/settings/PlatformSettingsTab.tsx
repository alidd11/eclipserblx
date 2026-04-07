import { ForceUpdateCard } from '@/components/admin/ForceUpdateCard';
import { AffiliateSettingsCard } from '@/components/admin/AffiliateSettingsCard';

import { MarketplaceControlsCard } from '@/components/admin/MarketplaceControlsCard';

export function PlatformSettingsTab() {
  return (
    <div className="space-y-6">
      <MarketplaceControlsCard />
      <ForceUpdateCard />
      
      <AffiliateSettingsCard />
    </div>
  );
}

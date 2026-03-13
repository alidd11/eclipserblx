/**
 * Consolidated Overview tab: Financial Overview + Stripe Balance + Gross Revenue
 * displayed as stacked sections on a single scrollable page.
 */
import { memo } from 'react';
import { Wallet, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FinancialOverview } from './FinancialOverview';
import { StripeBalanceTab } from './StripeBalanceTab';
import { GrossRevenueTab } from './GrossRevenueTab';

const MemoFinancial = memo(FinancialOverview);
const MemoStripe = memo(StripeBalanceTab);
const MemoGross = memo(GrossRevenueTab);

export function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Financial KPIs + composition */}
      <MemoFinancial />

      <Separator />

      {/* Stripe Balance */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Stripe Balance</h2>
        </div>
        <MemoStripe />
      </section>

      <Separator />

      {/* Gross Revenue */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Gross Revenue</h2>
        </div>
        <MemoGross />
      </section>
    </div>
  );
}

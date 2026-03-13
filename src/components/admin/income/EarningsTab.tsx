/**
 * Consolidated Earnings tab: Credits, Robux, and Seller earnings in collapsible sections.
 */
import { useState, memo } from 'react';
import { Coins, Gamepad2, Store, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditsAnalyticsTab } from './CreditsAnalyticsTab';
import { RobuxEarningsTab } from './RobuxEarningsTab';
import { SellerEarningsTab } from './SellerEarningsTab';
import { cn } from '@/lib/utils';

const MemoCredits = memo(CreditsAnalyticsTab);
const MemoRobux = memo(RobuxEarningsTab);
const MemoSellers = memo(SellerEarningsTab);

interface SectionProps {
  title: string;
  icon: typeof Coins;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <CardContent className="pt-0">
          {open && children}
        </CardContent>
      </div>
    </Card>
  );
}

export function EarningsTab() {
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Credits Analytics" icon={Coins} defaultOpen>
        <MemoCredits />
      </CollapsibleSection>

      <CollapsibleSection title="Robux Earnings" icon={Gamepad2}>
        <MemoRobux />
      </CollapsibleSection>

      <CollapsibleSection title="Seller Earnings" icon={Store}>
        <MemoSellers />
      </CollapsibleSection>
    </div>
  );
}

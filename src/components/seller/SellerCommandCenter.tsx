import { Link } from 'react-router-dom';
import { LucideIcon, Package, ShoppingCart, BarChart3, Tag, DollarSign, Megaphone, Sparkles } from 'lucide-react';

interface ActionItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
  primary?: boolean;
}

const createActions: ActionItem[] = [
  { title: 'Store Builder', href: '/seller/store-builder', icon: Sparkles, description: 'Customize look' },
];

const manageActions: ActionItem[] = [
  { title: 'Products', href: '/seller/products', icon: Package, description: 'Manage listings' },
  { title: 'Orders', href: '/seller/orders', icon: ShoppingCart, description: 'View sales' },
  { title: 'Balance', href: '/seller/finance', icon: DollarSign, description: 'Earnings & payouts' },
];

const growActions: ActionItem[] = [
  { title: 'Analytics', href: '/seller/analytics', icon: BarChart3, description: 'Store metrics' },
  { title: 'Discounts', href: '/seller/discounts', icon: Tag, description: 'Create promos' },
  { title: 'Campaigns', href: '/seller/promote', icon: Megaphone, description: 'Run ads' },
];

function ActionGroup({ label, actions }: { label: string; actions: ActionItem[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {actions.map((action) => (
          <Link key={action.href} to={action.href}>
            <div className={`flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all text-center group cursor-pointer ${
              action.primary
                ? 'bg-primary/10 border border-primary/20 hover:bg-primary/15'
                : 'bg-muted/40 hover:bg-muted/60 border border-transparent hover:border-border/40'
            }`}>
              <div className={`p-1.5 rounded-md transition-colors ${
                action.primary
                  ? 'bg-primary/15'
                  : 'bg-card border border-border/40'
              }`}>
                <action.icon className={`h-3.5 w-3.5 transition-colors ${
                  action.primary
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                }`} />
              </div>
              <span className="text-[11px] font-medium leading-tight">{action.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SellerCommandCenter() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <h2 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Command Center</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionGroup label="Create" actions={createActions} />
        <ActionGroup label="Manage" actions={manageActions} />
        <ActionGroup label="Grow" actions={growActions} />
      </div>
    </div>
  );
}

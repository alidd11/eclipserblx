import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Users, Mail } from 'lucide-react';

export const IP_SHIELD_TIERS = [
  {
    id: 'starter', name: 'Starter', price: '24.99',
    description: 'Essential protection for individual creators',
    features: ['3 takedown requests/month', '15 registered works', 'Case tracking & updates', 'Cross-platform enforcement'],
    disabledFeatures: ['Priority handling', 'Monitoring & alerts', 'Dedicated agent'],
    popular: false,
  },
  {
    id: 'pro', name: 'Pro', price: '39.99',
    description: 'Advanced protection for serious creators',
    features: ['15 takedown requests/month', 'Unlimited registered works', 'Case tracking & updates', 'Cross-platform enforcement', 'Priority handling', 'Monitoring & alerts'],
    disabledFeatures: ['Dedicated agent'],
    popular: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '79.99',
    description: 'Complete protection with dedicated support',
    features: ['Unlimited takedown requests', 'Unlimited registered works', 'Case tracking & updates', 'Cross-platform enforcement', 'Priority handling', 'Monitoring & alerts', 'Dedicated DMCA agent'],
    disabledFeatures: [],
    popular: false,
  },
];

interface TierCardProps {
  tier: typeof IP_SHIELD_TIERS[number];
  action: React.ReactNode;
}

export function TierCard({ tier, action }: TierCardProps) {
  return (
    <Card className={`relative flex flex-col ${tier.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : ''}`}>
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3">Most Popular</Badge>
        </div>
      )}
      <CardContent className="pt-6 flex flex-col flex-1">
        <div className="mb-4">
          <h3 className="text-lg font-bold">{tier.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
        </div>
        <div className="mb-5">
          <span className="text-3xl font-bold">£{tier.price}</span>
          <span className="text-muted-foreground text-sm">/mo</span>
        </div>
        <ul className="space-y-2 text-sm flex-1 mb-6">
          {tier.features.map((f) => (
            <li key={f} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" />{f}</li>
          ))}
          {tier.disabledFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2 text-muted-foreground/50"><XCircle className="h-4 w-4 shrink-0" />{f}</li>
          ))}
        </ul>
        {action}
      </CardContent>
    </Card>
  );
}

export function CustomPlanCard({ onContact }: { onContact: () => void }) {
  return (
    <Card className="max-w-md mx-auto mt-6 border-dashed">
      <CardContent className="pt-6 text-center">
        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-bold mb-1">Custom Plan</h3>
        <p className="text-sm text-muted-foreground mb-4">Need a tailored plan with specific limits? Contact us and we'll create a bespoke plan for you.</p>
        <Button variant="outline" onClick={onContact}>
          <Mail className="h-4 w-4 mr-2" /> Contact Us
        </Button>
      </CardContent>
    </Card>
  );
}

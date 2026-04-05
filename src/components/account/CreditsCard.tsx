import { Coins, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function CreditsCard() {
  const navigate = useNavigate();

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Eclipse Credits
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Save on fees by paying with credits
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">%</span>
            </div>
            <div>
              <p className="font-medium text-sm">Lower transaction fees</p>
              <p className="text-xs text-muted-foreground">Skip payment processing fees when using credits</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Coins className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Instant checkout</p>
              <p className="text-xs text-muted-foreground">No card details needed — pay in one click</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">+</span>
            </div>
            <div>
              <p className="font-medium text-sm">Bonus credits with Eclipse+</p>
              <p className="text-xs text-muted-foreground">Subscribers get extra credits on every top-up</p>
            </div>
          </div>
        </div>

        <Button className="w-full" variant="outline" onClick={() => navigate('/credits')}>
          <Coins className="h-4 w-4 mr-2" />
          Top Up Credits
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  );
}
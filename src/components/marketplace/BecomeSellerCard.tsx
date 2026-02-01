import { Link } from 'react-router-dom';
import { Store, ArrowRight, BadgeCheck, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function BecomeSellerCard() {
  return (
    <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/20">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">Become a Seller</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Join our marketplace and start selling your Roblox creations
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                <span>Verified Badge</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>100% IP Ownership</span>
              </div>
            </div>

            <Link to="/account">
              <Button size="sm" className="mt-2">
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

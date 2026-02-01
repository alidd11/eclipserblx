import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketplaceHeroButton() {
  return (
    <Link to="/marketplace">
      <Button
        size="lg"
        variant="outline"
        className="text-lg px-8 py-6 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors"
      >
        <Store className="mr-2 h-5 w-5 text-primary" />
        <span className="text-foreground">Browse Marketplace</span>
      </Button>
    </Link>
  );
}

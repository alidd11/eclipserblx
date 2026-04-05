import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Scale } from 'lucide-react';

interface TosBannerProps {
  isLoading: boolean;
  hasSigned: boolean;
}

export function TosBanner({ isLoading, hasSigned }: TosBannerProps) {
  if (isLoading || hasSigned) return null;

  return (
    <div className="border border-amber-500/50 rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-4 bg-amber-500/5">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              Store Inactive - Agreement Required
            </p>
            <p className="text-sm text-muted-foreground">
              Your store is not visible until you sign the Seller Terms of Service.
            </p>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/seller/documents/terms">
            <Scale className="h-4 w-4 mr-2" />
            Sign Agreement
          </Link>
        </Button>
      </div>
    </div>
  );
}
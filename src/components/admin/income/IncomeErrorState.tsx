import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface IncomeErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function IncomeErrorState({ 
  title = 'Failed to load data', 
  message = 'Something went wrong while fetching the data. Please try again.',
  onRetry 
}: IncomeErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-destructive">{title}</p>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EclipsePlusBannerProps {
  show: boolean;
}

export function EclipsePlusBanner({ show }: EclipsePlusBannerProps) {
  const navigate = useNavigate();
  
  if (!show) return null;
  
  return (
    <Card className="border-border bg-muted/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Get £10 free credit!</div>
            <div className="text-xs text-muted-foreground">
              Subscribe to Eclipse+ for bonus credit & 30% off
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/eclipse-plus')}>
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

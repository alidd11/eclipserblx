import { Crown, Zap, Server, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UpgradeBannerProps {
  currentServers?: number;
  maxServers?: number | null;
  variant?: 'compact' | 'full';
}

export function UpgradeBanner({ currentServers = 0, maxServers = 2, variant = 'full' }: UpgradeBannerProps) {
  const navigate = useNavigate();
  const isAtLimit = maxServers !== null && currentServers >= maxServers;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {isAtLimit ? 'Server limit reached' : 'Free tier: 2 servers max'}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/eclipse-plus')} className="text-xs">
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Upgrade to Eclipse+</h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Unlimited
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {isAtLimit 
                ? "You've reached the 2 server limit on the free tier. Upgrade to sync bans across all your servers."
                : "Get unlimited server syncing, ban templates, and priority sync with Eclipse+ membership."
              }
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Server className="h-3.5 w-3.5 text-primary" />
                <span>Unlimited servers</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Ban templates</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Priority sync</span>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Button 
              onClick={() => navigate('/eclipse-plus')}
              className="bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90"
            >
              <Crown className="h-4 w-4 mr-2" />
              Get Eclipse+
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

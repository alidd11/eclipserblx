import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Crown, Clock, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EarlyAccessCardProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  customHours: string;
  onCustomHoursChange: (hours: string) => void;
  scheduleEnabled: boolean;
}

export function EarlyAccessCard({
  enabled,
  onEnabledChange,
  customHours,
  onCustomHoursChange,
  scheduleEnabled,
}: EarlyAccessCardProps) {
  // Fetch default early access hours setting
  const { data: defaultHours } = useQuery({
    queryKey: ['default-early-access-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'default_early_access_hours')
        .maybeSingle();

      if (error) throw error;
      return data?.value ? parseInt(String(data.value).replace(/^"|"$/g, '')) : 24;
    },
  });

  if (!scheduleEnabled) {
    return null;
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-base">Early Product Drops</CardTitle>
            <CardDescription className="text-xs">
              Give Eclipse+ members early access
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Early Access</Label>
            <p className="text-xs text-muted-foreground">
              Eclipse+ members can access this product before the public release
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {enabled && (
          <div className="space-y-3 pt-3 border-t border-amber-500/20">
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  The default early access window is <strong>{defaultHours || 24} hours</strong>. 
                  You can customize this for your product below.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="early-access-hours" className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Custom Early Access Window (optional)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="early-access-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={customHours}
                  onChange={(e) => onCustomHoursChange(e.target.value)}
                  placeholder={String(defaultHours || 24)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">hours before public release</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use the platform default ({defaultHours || 24} hours)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

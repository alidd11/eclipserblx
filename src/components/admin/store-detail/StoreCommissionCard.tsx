import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Percent } from 'lucide-react';
import { format, parseISO } from '@/lib/dateUtils';

interface StoreCommissionCardProps {
  store: any;
  defaultRate: number;
  isAdminManaged: boolean;
  onSaveRate: (rate: number | null, expiresAt: string | null) => void;
  onResetRate: () => void;
  isSaving: boolean;
}

export function StoreCommissionCard({ store, defaultRate, isAdminManaged, onSaveRate, onResetRate, isSaving }: StoreCommissionCardProps) {
  const [customRate, setCustomRate] = useState(store.custom_commission_rate?.toString() || '');
  const [expirationDate, setExpirationDate] = useState(store.custom_rate_expires_at?.split('T')[0] || '');

  const getEffectiveRate = () => {
    if (isAdminManaged) return 0;
    if (store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date()) {
      return store.commission_rate ?? defaultRate;
    }
    return store.custom_commission_rate ?? store.commission_rate ?? defaultRate;
  };

  const isCustomRateActive = () => {
    if (!store.custom_commission_rate) return false;
    if (store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date()) return false;
    return true;
  };

  if (isAdminManaged) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Commission Settings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current effective rate: <Badge>0%</Badge>
          </p>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            This is a platform-managed store with a fixed 0% commission rate. Commission settings cannot be modified.
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const rate = customRate ? parseFloat(customRate) : null;
    if (rate !== null && (rate < 0 || rate > 100)) return;
    const expiresAt = expirationDate ? new Date(expirationDate).toISOString() : null;
    onSaveRate(rate, expiresAt);
  };

  const handleReset = () => {
    setCustomRate('');
    setExpirationDate('');
    onResetRate();
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Commission Settings
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Current effective rate: <Badge>{getEffectiveRate()}%</Badge>
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Custom Commission Rate (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder={`Default: ${defaultRate}%`}
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Rate Expiration Date (Optional)</Label>
            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
            {store.custom_rate_expires_at && (
              <p className="text-xs text-muted-foreground">
                Current expiration: {format(parseISO(store.custom_rate_expires_at), 'MMM d, yyyy')}
                {new Date(store.custom_rate_expires_at) <= new Date() && (
                  <Badge variant="destructive" className="ml-2 text-xs">Expired</Badge>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>Save Rate</Button>
          {isCustomRateActive() && (
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>Reset to Default</Button>
          )}
        </div>
      </div>
    </div>
  );
}

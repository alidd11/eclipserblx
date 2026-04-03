import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, PoundSterling } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export function EarningsCalculator() {
  const [salesPerMonth, setSalesPerMonth] = useState(10);
  const [avgPrice, setAvgPrice] = useState(5);

  const grossRevenue = salesPerMonth * avgPrice;
  const commission = 0.15; // 15% platform fee
  const netEarnings = grossRevenue * (1 - commission);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Earnings Estimate</h4>
          <p className="text-xs text-muted-foreground">See what you could earn each month</p>
        </div>
      </div>

      {/* Sales slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Sales per month</span>
          <span className="font-semibold">{salesPerMonth}</span>
        </div>
        <Slider
          value={[salesPerMonth]}
          onValueChange={([v]) => setSalesPerMonth(v)}
          min={1}
          max={100}
          step={1}
          className="[&_[role=slider]]:bg-primary"
        />
      </div>

      {/* Price slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Average price</span>
          <span className="font-semibold">£{avgPrice}</span>
        </div>
        <Slider
          value={[avgPrice]}
          onValueChange={([v]) => setAvgPrice(v)}
          min={1}
          max={50}
          step={1}
          className="[&_[role=slider]]:bg-primary"
        />
      </div>

      {/* Result */}
      <motion.div
        key={`${salesPerMonth}-${avgPrice}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4 text-center"
      >
        <p className="text-xs text-muted-foreground mb-1">Your estimated monthly earnings</p>
        <div className="flex items-center justify-center gap-1">
          <PoundSterling className="h-5 w-5 text-emerald-500" />
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {netEarnings.toFixed(2)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          After 15% platform fee · You keep 85% of every sale
        </p>
      </motion.div>
    </div>
  );
}

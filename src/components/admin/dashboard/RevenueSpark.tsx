import { AdminSection } from '@/components/admin/AdminSection';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { formatGBP } from '@/lib/formatters';

export function RevenueSpark() {
  const { data, isLoading } = useAdminOverview();
  const series = (data?.revenue_14d ?? []).map((d) => ({
    day: d.day,
    revenue: Number(d.revenue) || 0,
  }));

  const total = series.reduce((sum, d) => sum + d.revenue, 0);
  const max = Math.max(...series.map((d) => d.revenue), 1);
  const w = 100;
  const h = 40;
  const step = w / Math.max(series.length - 1, 1);
  const linePath = series
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(h - (d.revenue / max) * h).toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L${((series.length - 1) * step).toFixed(2)},${h} L0,${h} Z`;

  return (
    <AdminSection
      title="Revenue · last 14 days"
      description={isLoading ? 'Loading…' : `Total ${formatGBP(total)}`}
    >
      <div className="w-full aspect-[5/1] min-h-[80px]">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {series.length > 1 && (
            <>
              <path d={areaPath} fill="url(#rev-grad)" />
              <path
                d={linePath}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{series[0]?.day ? new Date(series[0].day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
        <span>Today</span>
      </div>
    </AdminSection>
  );
}

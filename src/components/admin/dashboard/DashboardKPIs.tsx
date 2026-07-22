import { ShoppingCart, MessageCircle, Clock, PoundSterling, RotateCcw, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatGBP } from '@/lib/formatters';
import { useAdminOverview } from '@/hooks/useAdminOverview';

interface KPIItem {
  label: string;
  value: string;
  raw: number;
  icon: React.ElementType;
  delta?: { pct: number; label: string } | null;
  href?: string;
  spark?: number[];
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points.length) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 22;
  const step = w / Math.max(points.length - 1, 1);
  const path = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        className={positive ? 'stroke-success/80' : 'stroke-muted-foreground/50'}
      />
    </svg>
  );
}

function Delta({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span
      className={cn(
        'text-[11px] font-medium tabular-nums',
        positive ? 'text-success' : 'text-destructive',
      )}
    >
      {positive ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function DashboardKPIs() {
  const { data, isLoading } = useAdminOverview();

  const revenueSeries = (data?.revenue_14d ?? []).map((d) => Number(d.revenue) || 0);
  const revenueDelta =
    data && data.revenue_yesterday > 0
      ? ((data.revenue_today - data.revenue_yesterday) / data.revenue_yesterday) * 100
      : data && data.revenue_today > 0
        ? 100
        : 0;

  const kpis: KPIItem[] = [
    {
      label: 'Revenue today',
      value: formatGBP(data?.revenue_today ?? 0),
      raw: data?.revenue_today ?? 0,
      icon: PoundSterling,
      delta: { pct: revenueDelta, label: 'vs yesterday' },
      spark: revenueSeries,
    },
    {
      label: 'Orders today',
      value: String(data?.today_orders ?? 0),
      raw: data?.today_orders ?? 0,
      icon: ShoppingCart,
    },
    {
      label: 'Open tickets',
      value: String(data?.open_tickets ?? 0),
      raw: data?.open_tickets ?? 0,
      icon: MessageCircle,
    },
    {
      label: 'Staff on duty',
      value: String(data?.staff_on_duty ?? 0),
      raw: data?.staff_on_duty ?? 0,
      icon: Clock,
    },
    {
      label: 'Refund rate 7d',
      value: `${data?.refund_rate_7d ?? 0}%`,
      raw: data?.refund_rate_7d ?? 0,
      icon: RotateCcw,
    },
    {
      label: 'Awaiting review',
      value: String(data?.products_awaiting_review ?? 0),
      raw: data?.products_awaiting_review ?? 0,
      icon: Package,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-1.5 bg-card/40 hover:bg-card/70 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <kpi.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground truncate">{kpi.label}</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-xl sm:text-2xl font-bold leading-none tabular-nums">
              {isLoading ? '—' : kpi.value}
            </p>
            {kpi.spark && kpi.spark.length > 1 && (
              <Sparkline points={kpi.spark} positive={revenueDelta >= 0} />
            )}
          </div>
          {kpi.delta && !isLoading && (
            <div className="flex items-center gap-1.5">
              <Delta pct={kpi.delta.pct} />
              <span className="text-[10px] text-muted-foreground">{kpi.delta.label}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

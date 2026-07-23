/**
 * Revolut-style chart primitives.
 * Ultra-smooth curves, prominent gradient fills, no grid lines, minimal axes, clean tooltips.
 */

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ReactNode, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';

/* ── Shared style constants ── */

const AXIS_STYLE = {
  tickLine: false as const,
  axisLine: false as const,
  tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))', opacity: 0.6 },
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    padding: '8px 12px',
  },
  cursor: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' },
  itemStyle: { color: 'hsl(var(--foreground))' },
};

function useChartAnimationEnabled() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOSWebKit = /(iPhone|iPad|iPod)/i.test(userAgent)
      && /WebKit/i.test(userAgent)
      && !/(CriOS|FxiOS|EdgiOS)/i.test(userAgent);

    return !prefersReducedMotion && !isIOSWebKit;
  }, []);
}

/* ── Integer ticks helper ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useIntegerTicks(data: any[], seriesKeys: string[], maxTicks = 5): number[] {
  return useMemo(() => {
    if (!data || data.length === 0) return [0];
    let max = 0;
    for (const item of data) {
      for (const key of seriesKeys) {
        const v = Number(item[key]) || 0;
        if (v > max) max = v;
      }
    }
    const ceiling = Math.max(1, Math.ceil(max));
    const count = Math.min(ceiling, maxTicks);
    const step = Math.max(1, Math.ceil(ceiling / count));
    const ticks: number[] = [];
    for (let i = 0; i <= ceiling; i += step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] < ceiling) {
      ticks.push(ceiling);
    }
    return ticks;
  }, [data, seriesKeys, maxTicks]);
}

/* ── Gradient helpers ── */

interface GradientDef {
  id: string;
  color: string;
  opacity?: [number, number];
}

function ChartGradients({ gradients }: { gradients: GradientDef[] }) {
  return (
    <defs>
      {gradients.map((g) => (
        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.color} stopOpacity={g.opacity?.[0] ?? 0.45} />
          <stop offset="60%" stopColor={g.color} stopOpacity={g.opacity?.[1] ?? 0.12} />
          <stop offset="100%" stopColor={g.color} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}

/* ── Shared empty state ── */

// A chart with no rows — or one whose every series is entirely zero — should not
// render a bare axis or a flat baseline (which reads as "broken"). Every chart
// primitive falls back to this purposeful dashed state so the whole site is
// consistent. Callers pass an `emptyMessage`/`emptyIcon` for context.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isChartEmpty(data: any[] | undefined, seriesKeys: string[]): boolean {
  if (!data || data.length === 0) return true;
  return seriesKeys.every((k) => data.every((d) => !Number(d[k])));
}

function ChartEmptyState({ height, message, icon: Icon }: { height: number; message: string; icon?: LucideIcon }) {
  return (
    <div
      style={{ height }}
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 text-center"
    >
      {Icon && <Icon className="h-6 w-6 text-muted-foreground/60" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* ── RevolutAreaChart ── */

export interface RevolutAreaSeries {
  dataKey: string;
  color: string;
  name?: string;
  gradientId?: string;
}

interface RevolutAreaChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  xKey: string;
  series: RevolutAreaSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipContent?: ReactNode | ((props: any) => ReactNode);
  showYAxis?: boolean;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export function RevolutAreaChart({
  data, xKey, series, height = 240,
  yFormatter = (v: number) => `${Math.round(v)}`, tooltipFormatter, tooltipContent,
  showYAxis = true, className, emptyMessage, emptyIcon,
}: RevolutAreaChartProps) {
  const gradients: GradientDef[] = series.map((s, i) => ({
    id: s.gradientId || `revGrad-${i}`,
    color: s.color,
  }));

  const seriesKeys = useMemo(() => series.map(s => s.dataKey), [series]);
  const intTicks = useIntegerTicks(data, seriesKeys);
  const yDomain: [number, number] = [0, intTicks[intTicks.length - 1] || 1];
  const animationActive = useChartAnimationEnabled();

  if (isChartEmpty(data, seriesKeys)) {
    return (
      <div className={className}>
        <ChartEmptyState height={height} message={emptyMessage ?? 'No data yet'} icon={emptyIcon} />
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: showYAxis ? -8 : -30, bottom: 0 }}>
          <ChartGradients gradients={gradients} />
          <XAxis dataKey={xKey} {...AXIS_STYLE} interval="preserveStartEnd" />
          {showYAxis && (
            <YAxis {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} width={48} allowDecimals={false} domain={yDomain} ticks={intTicks} />
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={tooltipFormatter}
            content={tooltipContent as any}
          />
          {series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#${s.gradientId || `revGrad-${i}`})`}
              activeDot={{ r: 4, fill: s.color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              dot={false}
              isAnimationActive={animationActive}
              animationDuration={animationActive ? 800 : 0}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── RevolutLineChart ── */

export interface RevolutLineSeries {
  dataKey: string;
  color: string;
  name?: string;
  strokeDasharray?: string;
}

interface RevolutLineChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  xKey: string;
  series: RevolutLineSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipContent?: ReactNode | ((props: any) => ReactNode);
  showYAxis?: boolean;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export function RevolutLineChart({
  data, xKey, series, height = 240,
  yFormatter = (v: number) => `${Math.round(v)}`, tooltipFormatter, tooltipContent,
  showYAxis = true, className, emptyMessage, emptyIcon,
}: RevolutLineChartProps) {
  const seriesKeys = useMemo(() => series.map(s => s.dataKey), [series]);
  const intTicks = useIntegerTicks(data, seriesKeys);
  const yDomain: [number, number] = [0, intTicks[intTicks.length - 1] || 1];
  const animationActive = useChartAnimationEnabled();

  if (isChartEmpty(data, seriesKeys)) {
    return (
      <div className={className}>
        <ChartEmptyState height={height} message={emptyMessage ?? 'No data yet'} icon={emptyIcon} />
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: showYAxis ? -8 : -30, bottom: 0 }}>
          <XAxis dataKey={xKey} {...AXIS_STYLE} interval="preserveStartEnd" />
          {showYAxis && (
            <YAxis {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} width={48} allowDecimals={false} domain={yDomain} ticks={intTicks} />
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={tooltipFormatter}
            content={tooltipContent as any}
          />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.strokeDasharray}
              dot={false}
              activeDot={{ r: 4, fill: s.color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              isAnimationActive={animationActive}
              animationDuration={animationActive ? 800 : 0}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── RevolutBarChart ── */

export interface RevolutBarSeries {
  dataKey: string;
  color: string;
  name?: string;
  radius?: [number, number, number, number];
}

interface RevolutBarChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  xKey: string;
  series: RevolutBarSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  tooltipContent?: ReactNode;
  showYAxis?: boolean;
  layout?: 'horizontal' | 'vertical';
  className?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
}

export function RevolutBarChart({
  data, xKey, series, height = 240,
  yFormatter = (v: number) => `${Math.round(v)}`, tooltipFormatter, tooltipContent,
  showYAxis = true, layout = 'horizontal', className, emptyMessage, emptyIcon,
}: RevolutBarChartProps) {
  const isVertical = layout === 'vertical';
  const seriesKeys = useMemo(() => series.map(s => s.dataKey), [series]);
  const intTicks = useIntegerTicks(data, seriesKeys);
  const yDomain: [number, number] = [0, intTicks[intTicks.length - 1] || 1];
  const animationActive = useChartAnimationEnabled();

  if (isChartEmpty(data, seriesKeys)) {
    return (
      <div className={className}>
        <ChartEmptyState height={height} message={emptyMessage ?? 'No data yet'} icon={emptyIcon} />
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 4, right: 8, left: isVertical ? 0 : (showYAxis ? -8 : -30), bottom: 0 }}>
          {isVertical ? (
            <>
              <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} allowDecimals={false} domain={yDomain} ticks={intTicks} />
              <YAxis type="category" dataKey={xKey} {...AXIS_STYLE} width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...AXIS_STYLE} interval="preserveStartEnd" />
              {showYAxis && <YAxis {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} width={48} allowDecimals={false} domain={yDomain} ticks={intTicks} />}
            </>
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={tooltipFormatter}
            content={tooltipContent as any}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }}
          />
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={s.color}
              radius={s.radius || [6, 6, 0, 0]}
              maxBarSize={40}
              isAnimationActive={animationActive}
              animationDuration={animationActive ? 800 : 0}
              animationEasing="ease-out"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

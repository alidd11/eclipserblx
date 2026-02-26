/**
 * Revolut-style chart primitives.
 * Smooth curves, gradient fills, no grid lines, minimal axes, clean tooltips.
 */

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ReactNode } from 'react';

/* ── Shared style constants ── */

const AXIS_STYLE = {
  tickLine: false as const,
  axisLine: false as const,
  tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
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
          <stop offset="0%" stopColor={g.color} stopOpacity={g.opacity?.[0] ?? 0.28} />
          <stop offset="100%" stopColor={g.color} stopOpacity={g.opacity?.[1] ?? 0} />
        </linearGradient>
      ))}
    </defs>
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
  data: any[];
  xKey: string;
  series: RevolutAreaSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  tooltipContent?: ReactNode;
  showYAxis?: boolean;
  className?: string;
}

export function RevolutAreaChart({
  data, xKey, series, height = 240,
  yFormatter = (v: number) => `${Math.round(v)}`, tooltipFormatter, tooltipContent,
  showYAxis = true, className,
}: RevolutAreaChartProps) {
  const gradients: GradientDef[] = series.map((s, i) => ({
    id: s.gradientId || `revGrad-${i}`,
    color: s.color,
  }));

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: showYAxis ? -8 : -30, bottom: 0 }}>
          <ChartGradients gradients={gradients} />
          <XAxis dataKey={xKey} {...AXIS_STYLE} interval="preserveStartEnd" />
          {showYAxis && (
            <YAxis {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} width={48} allowDecimals={false} domain={[0, 'auto']} />
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={tooltipFormatter}
            content={tooltipContent as any}
          />
          {series.map((s, i) => (
            <Area
              key={s.dataKey}
              type="natural"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={s.color}
              strokeWidth={2.5}
              fill={`url(#${s.gradientId || `revGrad-${i}`})`}
              activeDot={{ r: 5, fill: s.color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              dot={false}
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
  data: any[];
  xKey: string;
  series: RevolutLineSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  tooltipContent?: ReactNode;
  showYAxis?: boolean;
  className?: string;
}

export function RevolutLineChart({
  data, xKey, series, height = 240,
  yFormatter = (v: number) => `${Math.round(v)}`, tooltipFormatter, tooltipContent,
  showYAxis = true, className,
}: RevolutLineChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: showYAxis ? -8 : -30, bottom: 0 }}>
          <XAxis dataKey={xKey} {...AXIS_STYLE} interval="preserveStartEnd" />
          {showYAxis && (
            <YAxis {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} width={48} allowDecimals={false} domain={[0, 'auto']} />
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={tooltipFormatter}
            content={tooltipContent as any}
          />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="natural"
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.strokeDasharray}
              dot={false}
              activeDot={{ r: 5, fill: s.color, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
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
}

export function RevolutBarChart({
  data, xKey, series, height = 240,
  yFormatter = (v: number) => `${Math.round(v)}`, tooltipFormatter, tooltipContent,
  showYAxis = true, layout = 'horizontal', className,
}: RevolutBarChartProps) {
  const isVertical = layout === 'vertical';

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={{ top: 4, right: 8, left: isVertical ? 0 : (showYAxis ? -8 : -30), bottom: 0 }}>
          {isVertical ? (
            <>
              <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} allowDecimals={false} domain={[0, 'auto']} />
              <YAxis type="category" dataKey={xKey} {...AXIS_STYLE} width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...AXIS_STYLE} interval="preserveStartEnd" />
              {showYAxis && <YAxis {...AXIS_STYLE} tickFormatter={(v) => yFormatter(Math.round(v))} width={48} allowDecimals={false} domain={[0, 'auto']} />}
            </>
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={tooltipFormatter}
            content={tooltipContent as any}
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
          />
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={s.color}
              radius={s.radius || [6, 6, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

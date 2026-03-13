/**
 * Revolut-style donut/pie chart.
 * Minimal, clean, with consistent tooltip styling.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    padding: '8px 12px',
  },
  itemStyle: { color: 'hsl(var(--foreground))' },
};

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export interface RevolutDonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  className?: string;
  paddingAngle?: number;
}

export function RevolutDonutChart({
  data,
  height = 200,
  innerRadius = 45,
  outerRadius = 75,
  colors = DEFAULT_COLORS,
  showLegend = true,
  showLabels = false,
  className,
  paddingAngle = 3,
}: RevolutDonutChartProps) {
  const animationActive = useMemo(() => {
    if (typeof window === 'undefined') return false;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOSWebKit = /(iPhone|iPad|iPod)/i.test(userAgent)
      && /WebKit/i.test(userAgent)
      && !/(CriOS|FxiOS|EdgiOS)/i.test(userAgent);

    return !prefersReducedMotion && !isIOSWebKit;
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className={className} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted-foreground text-sm">No data</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...TOOLTIP_STYLE} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={paddingAngle}
            strokeWidth={0}
            isAnimationActive={animationActive}
            animationDuration={animationActive ? 800 : 0}
            label={showLabels ? ({ name, value }) => `${name}: ${value}` : false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

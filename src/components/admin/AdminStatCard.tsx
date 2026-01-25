import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  /** Color for the value text - use semantic color classes */
  valueColor?: 'default' | 'green' | 'blue' | 'yellow' | 'orange' | 'destructive' | 'primary';
  /** Optional subtitle text below the value */
  subtitle?: string;
  /** Additional className for the card */
  className?: string;
}

const colorClasses: Record<string, string> = {
  default: 'text-foreground',
  green: 'text-green-500',
  blue: 'text-blue-500',
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  destructive: 'text-destructive',
  primary: 'text-primary',
};

export function AdminStatCard({ 
  label, 
  value, 
  valueColor = 'default',
  subtitle,
  className 
}: AdminStatCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", colorClasses[valueColor])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </Card>
  );
}

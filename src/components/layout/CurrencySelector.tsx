import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency, CURRENCIES, CurrencyCode } from '@/hooks/useCurrency';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hapticTap } from '@/lib/haptics';

interface CurrencySelectorProps {
  className?: string;
  compact?: boolean;
}

export function CurrencySelector({ className, compact = false }: CurrencySelectorProps) {
  const { currency, currencyInfo, setCurrency } = useCurrency();

  const handleSelect = (code: CurrencyCode) => {
    hapticTap();
    setCurrency(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 h-10 px-3 rounded-xl",
            "bg-muted/50 border border-border hover:border-primary/50",
            "text-sm font-medium text-foreground",
            "transition-all duration-200 cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
            compact && [
              "h-8 w-8 p-0 rounded-full justify-center",
              "bg-background/60 backdrop-blur-sm",
              "border-border/50 hover:border-primary/40",
              "active:scale-[0.95]"
            ],
            className
          )}
        >
          <span className={cn(
            "font-semibold",
            compact ? "text-sm text-primary" : "text-base"
          )}>
            {currencyInfo.symbol}
          </span>
          {!compact && (
            <>
              <span className="text-muted-foreground">{currency}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px] bg-popover z-50">
        {Object.values(CURRENCIES).map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => handleSelect(curr.code)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              currency === curr.code && "bg-accent"
            )}
          >
            <span className="w-5 text-center">{curr.symbol}</span>
            <span>{curr.code}</span>
            <span className="text-muted-foreground text-xs ml-auto">{curr.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

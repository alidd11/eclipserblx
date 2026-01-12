import { Shield, CheckCircle2, XCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SecureData {
  verified: boolean;
  masked_code: string;
  product_name?: string;
  code_id?: string;
}

interface CodeVerificationMessageProps {
  secureData: SecureData;
  isStaffView?: boolean;
  className?: string;
}

export function CodeVerificationMessage({ 
  secureData, 
  isStaffView = false,
  className 
}: CodeVerificationMessageProps) {
  const { verified, masked_code, product_name } = secureData;

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      verified 
        ? "bg-green-500/10 border-green-500/30" 
        : "bg-destructive/10 border-destructive/30",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Code Verification
        </span>
      </div>

      {/* Masked code */}
      <div className="font-mono text-sm tracking-wider">
        {masked_code}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1",
            verified 
              ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" 
              : "bg-destructive/20 text-destructive border-destructive/30"
          )}
        >
          {verified ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" />
              Invalid
            </>
          )}
        </Badge>

        {/* Product info - only shown to staff if verified */}
        {isStaffView && verified && product_name && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 cursor-help">
                  <Package className="h-3 w-3" />
                  {product_name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Customer owns a valid code for this product</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Customer view - success message */}
      {!isStaffView && verified && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Your code has been verified. Support can now confirm your ownership.
        </p>
      )}

      {/* Customer view - failure message */}
      {!isStaffView && !verified && (
        <p className="text-xs text-destructive">
          This code could not be verified. Please check the code and try again.
        </p>
      )}
    </div>
  );
}

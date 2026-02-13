import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 touch-manipulation",
          className,
        )}
        ref={ref}
        // iOS Safari/PWA: ensure text can be selected and taps are treated as input interactions.
        style={{ WebkitUserSelect: "text", ...(style ?? {}) }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

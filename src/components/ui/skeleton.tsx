import * as React from "react";
import { cn } from "@/lib/utils";

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          "before:absolute before:inset-0 before:-translate-x-full",
          "before:animate-[shimmer_1.6s_infinite]",
          "before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-btc/10 text-btc border border-btc/30 shadow-[0_0_12px_rgba(247,147,26,0.2)]",
        gold:
          "bg-gold/10 text-gold border border-gold/40 shadow-[0_0_12px_rgba(255,214,0,0.2)]",
        success:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/30",
        outline:
          "border border-white/20 text-stardust bg-void/50",
        secondary:
          "bg-white/5 text-stardust border border-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
}

function Badge({ className, variant, pulse = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };


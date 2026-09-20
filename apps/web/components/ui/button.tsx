import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-heading font-semibold tracking-wider text-xs uppercase transition-all duration-300 outline-none select-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-burnt to-btc text-white shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-105 border border-btc/30",
        default:
          "bg-gradient-to-r from-burnt to-btc text-white shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-105 border border-btc/30",
        gold:
          "bg-gradient-to-r from-btc to-gold text-void font-bold shadow-glow-gold hover:scale-105 border border-gold/40",
        outline:
          "border border-white/20 bg-void/50 text-white hover:border-btc hover:bg-btc/10 hover:text-btc hover:shadow-glow-orange",
        ghost:
          "bg-transparent text-stardust hover:text-white hover:bg-white/5",
        destructive:
          "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 hover:shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]",
        link:
          "text-btc hover:underline normal-case tracking-normal p-0 h-auto font-normal",
      },
      size: {
        default: "h-11 px-6 min-w-[44px]",
        sm: "h-9 px-4 text-[11px]",
        lg: "h-12 px-8 text-sm",
        icon: "size-10 p-0 rounded-full",
        "icon-sm": "size-8 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "terminal" | "pill" | "box";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "terminal", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full bg-black/50 px-4 py-2 text-sm text-white placeholder:text-white/30 transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 font-mono",
          variant === "terminal" &&
            "border-b-2 border-white/20 focus-visible:border-btc focus-visible:shadow-input-glow",
          variant === "box" &&
            "rounded-lg border border-white/10 focus-visible:border-btc focus-visible:shadow-input-glow",
          variant === "pill" &&
            "rounded-full border border-white/10 px-5 focus-visible:border-btc focus-visible:shadow-input-glow",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };


import * as React from "react";
import clsx from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius)*0.45)] text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
    
    const variants: Record<string, string> = {
      default: "bg-primary text-primary-foreground shadow-sm hover:opacity-95 hover:shadow",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:opacity-90",
      outline: "border border-border bg-card text-foreground hover:bg-muted hover:border-ring/40",
      secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
      ghost: "hover:bg-muted text-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    };

    const sizes: Record<string, string> = {
      default: "h-9 px-4 py-2",
      sm: "h-7 rounded-[calc(var(--radius)*0.35)] px-3 text-[11px]",
      lg: "h-11 rounded-[calc(var(--radius)*0.55)] px-6 text-sm",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

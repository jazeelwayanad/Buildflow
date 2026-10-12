import * as React from "react";
import clsx from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "accent";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors";
  
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive/15 text-destructive",
    outline: "text-foreground border border-border bg-card",
    success: "border-transparent bg-[#31e183]/20 text-[#0fa95d]",
    warning: "border-transparent bg-[#ff8229]/15 text-[#e56a10]",
    accent: "border-transparent bg-accent text-accent-foreground",
  };

  return <div className={clsx(base, variants[variant], className)} {...props} />;
}

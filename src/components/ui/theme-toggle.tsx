"use client";

import * as React from "react";
import { useTheme } from "../theme-provider";
import { Sun, Moon } from "../icons";
import clsx from "clsx";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius)*0.4)] border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius)*0.4)] border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
        className
      )}
    >
      {resolvedTheme === "dark" ? (
        <Sun size={15} className="text-yellow-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon size={15} className="text-primary transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}

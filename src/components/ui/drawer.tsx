"use client";

import * as React from "react";
import clsx from "clsx";

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = "max-w-2xl",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={clsx(
          "relative z-50 flex h-full w-full flex-col border-l border-border bg-background p-6 shadow-2xl overflow-y-auto sm:p-8",
          width
        )}
      >
        <div className="flex items-start justify-between border-b border-border pb-4 mb-6">
          <div>
            {title && <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

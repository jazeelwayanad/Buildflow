"use client";

import * as React from "react";
import clsx from "clsx";

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={clsx(
          "relative z-50 w-full max-w-lg rounded-[calc(var(--radius)*0.6)] border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        )}
      >
        <div className="flex items-start justify-between border-b border-border pb-3 mb-4">
          <div>
            {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

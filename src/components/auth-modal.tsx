"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AuthPanel } from "@/components/auth-panel";

export function AuthModal({
  open,
  onClose,
  onAuthed,
  redirectTo = "/dashboard",
}: {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
  redirectTo?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Portal to <body> so `position: fixed` is relative to the viewport even when
  // an ancestor has a transform (e.g. the landing hero's entrance animation).
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create your free account"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md animate-scale-in overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-lift">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-ink-muted transition hover:text-ink"
        >
          ✕
        </button>
        <div className="mb-4">
          <p className="eyebrow">Almost there</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            Create your free account to see your grade
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Your first grade is free. No card required. We&apos;ll pick up right
            where you left off — nothing to re-upload.
          </p>
        </div>
        <AuthPanel defaultMode="signup" redirectTo={redirectTo} onAuthed={onAuthed} />
      </div>
    </div>,
    document.body,
  );
}

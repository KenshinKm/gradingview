"use client";

import { track } from "@/lib/analytics";

/** Smooth-scrolls the visitor back up to the real grading form. */
export function ScrollToFormButton({
  targetId,
  children,
}: {
  targetId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="btn-primary px-6 py-3.5 text-[15px]"
      onClick={() => {
        track("landing_cta_clicked", { location: "how_it_works" });
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }}
    >
      {children}
    </button>
  );
}

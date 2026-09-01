"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

export function LandingCta() {
  return (
    <Link
      href="/login?mode=signup"
      className="btn-primary text-base"
      onClick={() => track("landing_cta_clicked", { location: "hero" })}
    >
      Grade My Work Free
    </Link>
  );
}

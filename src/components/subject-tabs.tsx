"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUBJECT_CONFIG } from "@/lib/subject-config";
import type { Subject } from "@/lib/grading/subjects";

/** Subject switcher. Renders nothing until at least two subjects are enabled. */
export function SubjectTabs({
  subjects,
  className = "",
}: {
  subjects: Subject[];
  className?: string;
}) {
  const pathname = usePathname();
  if (subjects.length < 2) return null;

  return (
    <nav aria-label="Subject" className={`flex items-center gap-1 ${className}`}>
      {subjects.map((s) => {
        const c = SUBJECT_CONFIG[s];
        const active = c.path === "/" ? pathname === "/" : pathname.startsWith(c.path);
        return (
          <Link
            key={s}
            href={c.path}
            aria-current={active ? "page" : undefined}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-raised"
            style={{
              color: c.color,
              backgroundColor: active ? `${c.color}1f` : undefined,
              boxShadow: active ? `inset 0 0 0 1px ${c.color}66` : undefined,
            }}
          >
            {c.name}
            {c.beta && (
              <span className="rounded-full border border-line px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                Beta
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

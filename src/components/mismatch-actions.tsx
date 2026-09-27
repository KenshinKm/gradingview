"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Buttons under the "double-check your files" warning on a failed attempt. */
export function MismatchActions({
  attemptId,
  assignmentId,
}: {
  attemptId: string;
  assignmentId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function gradeAnyway() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/grade/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        router.push(`/pricing?reason=${data.code ?? "not_entitled"}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Couldn't restart grading.");
      // Same page, now in progress: results fill in as they are written.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        <Link href={`/grade?assignment=${assignmentId}`} className="btn-secondary px-4 py-2">
          Let me fix my files
        </Link>
        <button type="button" className="btn-ghost px-4 py-2" onClick={gradeAnyway} disabled={busy}>
          {busy ? "Starting…" : "Grade it anyway"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}

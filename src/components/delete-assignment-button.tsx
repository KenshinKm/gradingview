"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      track("assignment_deleted", { assignmentId });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setBusy(false);
      alert("Could not delete this assignment. Please try again.");
    }
  }

  if (!confirming) {
    return (
      <button className="btn-secondary" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        className="btn border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/150/100/20"
        onClick={del}
        disabled={busy}
      >
        {busy ? "Deleting…" : "Confirm delete"}
      </button>
      <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </button>
    </div>
  );
}

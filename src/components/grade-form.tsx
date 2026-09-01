"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { track } from "@/lib/analytics";
import type { Assignment } from "@/lib/types";
import { FileUploader } from "./file-uploader";
import { GradingLoader } from "./grading-loader";

// The auth modal (and its Supabase client) only loads if an unauthenticated
// visitor actually tries to grade — keeps it out of the initial bundle.
const AuthModal = dynamic(
  () => import("./auth-modal").then((m) => m.AuthModal),
  { ssr: false },
);

const ACCEPT = ".pdf,.docx,.txt,.jpg,.jpeg,.png,.heic";
const HINT = "PDF · DOCX · TXT · JPG · PNG · HEIC — multiple files & photos";

interface RegradeProps {
  assignment: Assignment;
  nextDraft: number;
  lastScore: number | null;
}

const WORK_TYPES = [
  ["unspecified", "Not sure / mixed"],
  ["essay", "Essay"],
  ["written_assignment", "Written assignment"],
  ["worksheet", "Worksheet"],
  ["practice_test", "Practice test"],
  ["quiz", "Quiz"],
  ["multiple_choice", "Multiple choice"],
  ["short_answer", "Short answer"],
  ["long_answer", "Long answer"],
] as const;

function ExampleChips({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className="rounded-md border border-line bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-ink-muted"
        >
          {it}
        </span>
      ))}
    </div>
  );
}

export function GradeForm({
  regrade,
  variant = "page",
}: {
  regrade?: RegradeProps;
  variant?: "page" | "landing";
}) {
  const router = useRouter();

  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [materialText, setMaterialText] = useState("");
  const [workFiles, setWorkFiles] = useState<File[]>([]);
  const [workText, setWorkText] = useState("");

  const [title, setTitle] = useState(regrade?.assignment.title ?? "");
  const [course, setCourse] = useState(regrade?.assignment.course ?? "");
  const [workType, setWorkType] = useState(
    regrade?.assignment.work_type ?? "unspecified",
  );
  const [citation, setCitation] = useState(
    regrade?.assignment.citation_style ?? "not_specified",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const hasMaterials =
    !!regrade || materialFiles.length > 0 || materialText.trim().length > 0;
  const hasWork = workFiles.length > 0 || workText.trim().length > 0;
  const ready = hasMaterials && hasWork;

  async function runGrade() {
    setBusy(true);
    setError(null);
    if (regrade) track("regrade_clicked", { draft: regrade.nextDraft });
    else track("grading_started", { source: variant });

    const fd = new FormData();
    fd.set("material_text", materialText);
    fd.set("work_text", workText);
    fd.set("title", title || regrade?.assignment.title || "Untitled assignment");
    fd.set("course", course);
    fd.set("work_type", workType);
    fd.set("citation_style", citation);
    if (regrade) fd.set("assignment_id", regrade.assignment.id);
    materialFiles.forEach((f) => fd.append("material_files", f));
    workFiles.forEach((f) => fd.append("work_files", f));

    try {
      const res = await fetch("/api/grade", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          // session vanished between check and request
          setBusy(false);
          setAuthOpen(true);
          return;
        }
        if (res.status === 402) {
          router.push(`/pricing?reason=${data.code ?? "not_entitled"}`);
          return;
        }
        throw new Error(data.error || "Grading failed. Please try again.");
      }
      router.push(`/results/${data.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;

    // Prepare-then-authenticate: anyone can build the submission, but the
    // grading request itself requires a session. Files stay in memory —
    // nothing to re-upload after signing in.
    let authed = false;
    try {
      const r = await fetch("/api/session", { cache: "no-store" });
      authed = r.ok && (await r.json()).authed === true;
    } catch {
      authed = false;
    }

    if (!authed) {
      track("paywall_viewed", { reason: "auth_required", source: variant });
      setAuthOpen(true);
      return;
    }
    await runGrade();
  }

  if (busy) return <GradingLoader />;

  const submitLabel = regrade
    ? `Grade Draft ${regrade.nextDraft}`
    : "Grade My Work";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* SECTION 1 — GRADING MATERIALS */}
        <section className="card">
          <div className="flex items-baseline gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
              1
            </span>
            <h2 className="text-base font-semibold text-ink">Grading Materials</h2>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            Upload anything that explains how your work should be graded.
          </p>
          <ExampleChips
            items={[
              "rubric",
              "answer key",
              "assignment requirements",
              "grading instructions",
              "point breakdown",
            ]}
          />

          {regrade && (
            <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
              Your original grading materials are kept automatically. Add more only
              if something changed.
            </p>
          )}

          <div className="mt-4">
            <FileUploader
              files={materialFiles}
              onChange={setMaterialFiles}
              accept={ACCEPT}
              hint={HINT}
              idPrefix="mat"
            />
            <details className="group mt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-500">
                Paste text instead
              </summary>
              <textarea
                className="textarea mt-2"
                placeholder="Paste your rubric, prompt, grading criteria, point values, answer key…"
                value={materialText}
                onChange={(e) => setMaterialText(e.target.value)}
              />
            </details>
          </div>
        </section>

        {/* SECTION 2 — YOUR WORK */}
        <section className="card">
          <div className="flex items-baseline gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
              2
            </span>
            <h2 className="text-base font-semibold text-ink">Your Work</h2>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">
            Upload your completed work, assignment, test, essay, or written
            responses. Multiple files and photos are fine — keep the pages in
            order.
          </p>

          <div className="mt-4">
            <FileUploader
              files={workFiles}
              onChange={setWorkFiles}
              accept={ACCEPT}
              hint={HINT}
              idPrefix="work"
            />
            <details className="group mt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-500">
                Paste text instead
              </summary>
              <textarea
                className="textarea mt-2 min-h-[200px]"
                placeholder="Paste your essay, answers, or written responses here…"
                value={workText}
                onChange={(e) => setWorkText(e.target.value)}
              />
            </details>
          </div>
        </section>

        {/* OPTIONAL */}
        <details className="card [&_summary]:list-none" open={variant === "page" && !regrade}>
          <summary className="flex cursor-pointer items-center justify-between">
            <span className="text-base font-semibold text-ink">
              Optional details
            </span>
            <span className="text-xs text-ink-muted">helps tailor feedback</span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="title">
                Assignment title
              </label>
              <input
                id="title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Research Paper"
                disabled={!!regrade}
              />
            </div>
            <div>
              <label className="label" htmlFor="course">
                Course / subject
              </label>
              <input
                id="course"
                className="input"
                value={course ?? ""}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="AP English Literature"
                disabled={!!regrade}
              />
            </div>
            <div>
              <label className="label" htmlFor="workType">
                Type of work
              </label>
              <select
                id="workType"
                className="input"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                disabled={!!regrade}
              >
                {WORK_TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="citation">
                Citation style
              </label>
              <select
                id="citation"
                className="input"
                value={citation}
                onChange={(e) => setCitation(e.target.value)}
                disabled={!!regrade}
              >
                <option value="not_specified">Not specified</option>
                <option value="mla">MLA</option>
                <option value="apa">APA</option>
                <option value="chicago">Chicago</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </details>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className={variant === "page" ? "sticky bottom-4 z-10" : ""}>
          <button
            type="submit"
            className="btn-primary w-full text-base"
            disabled={!ready}
          >
            {submitLabel}
          </button>
          <p className="mt-2 text-center text-xs text-ink-muted">
            {!ready
              ? `Add ${hasMaterials ? "" : "grading materials"}${
                  !hasMaterials && !hasWork ? " and " : ""
                }${hasWork ? "" : "your work"} to continue.`
              : "Your first grade is free. No card required."}
          </p>
        </div>
      </form>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo="/dashboard"
        onAuthed={async () => {
          setAuthOpen(false);
          track("account_created", { source: variant });
          await runGrade();
        }}
      />
    </>
  );
}

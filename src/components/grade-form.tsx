"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import type { Assignment } from "@/lib/types";
import { FileUploader } from "./file-uploader";
import { GradingLoader } from "./grading-loader";

const ACCEPT = ".pdf,.docx,.txt,.jpg,.jpeg,.png,.heic";
const HINT = "PDF, DOCX, TXT, JPG, PNG, HEIC · multiple files & photos allowed";

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

export function GradeForm({ regrade }: { regrade?: RegradeProps }) {
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

  const hasMaterials =
    !!regrade || materialFiles.length > 0 || materialText.trim().length > 0;
  const hasWork = workFiles.length > 0 || workText.trim().length > 0;
  const canSubmit = hasMaterials && hasWork && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    if (regrade) track("regrade_clicked", { draft: regrade.nextDraft });

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

  if (busy) return <GradingLoader />;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* SECTION 1 — GRADING MATERIALS */}
      <section className="card">
        <h2 className="text-lg font-semibold text-ink">Grading Materials</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Upload anything that explains how your work should be graded — a rubric,
          assignment requirements, grading instructions, an answer key, a point
          breakdown, or teacher-provided reference material. Photograph every page
          if it&apos;s on paper.
        </p>

        {regrade && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Your original grading materials are kept automatically. Add more below
            only if something changed.
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
          <div className="mt-3">
            <label className="label" htmlFor="materialText">
              Or paste your grading materials instead
            </label>
            <textarea
              id="materialText"
              className="textarea"
              placeholder="Paste your rubric, prompt, grading criteria, point values, answer key…"
              value={materialText}
              onChange={(e) => setMaterialText(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* SECTION 2 — YOUR WORK */}
      <section className="card">
        <h2 className="text-lg font-semibold text-ink">Your Work</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Upload your completed work, draft, assignment, test, or written
          responses. Multiple files and photos are fine — put the pages in order.
        </p>

        <div className="mt-4">
          <FileUploader
            files={workFiles}
            onChange={setWorkFiles}
            accept={ACCEPT}
            hint={HINT}
            idPrefix="work"
          />
          <div className="mt-3">
            <label className="label" htmlFor="workText">
              Or paste your work instead
            </label>
            <textarea
              id="workText"
              className="textarea min-h-[220px]"
              placeholder="Paste your essay, answers, or written responses here…"
              value={workText}
              onChange={(e) => setWorkText(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* OPTIONAL */}
      <section className="card">
        <h2 className="text-lg font-semibold text-ink">Optional details</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Helps GradingView tailor the feedback.
        </p>
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
      </section>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 z-10">
        <button
          type="submit"
          className="btn-primary w-full text-base shadow-lg"
          disabled={!canSubmit}
        >
          {regrade ? `Grade Draft ${regrade.nextDraft}` : "Grade My Work"}
        </button>
        {!canSubmit && !busy && (
          <p className="mt-2 text-center text-xs text-ink-muted">
            Add {hasMaterials ? "" : "grading materials"}
            {!hasMaterials && !hasWork ? " and " : ""}
            {hasWork ? "" : "your work"} to continue.
          </p>
        )}
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { track } from "@/lib/analytics";
import type { Assignment } from "@/lib/types";
import { FileUploader } from "./file-uploader";
import { GradingLoader } from "./grading-loader";
import { limitsFor } from "@/lib/upload-limits";
import { MAX_REQUEST_BYTES, formatMb, requestBytes, shrinkPhoto } from "@/lib/client-image";
import type { Level, Subject } from "@/lib/grading/subjects";
import { SUBJECT_CONFIG, type OptionKey } from "@/lib/subject-config";

// The auth modal (and its Supabase client) only loads if an unauthenticated
// visitor actually tries to grade — keeps it out of the initial bundle.
const AuthModal = dynamic(
  () => import("./auth-modal").then((m) => m.AuthModal),
  { ssr: false },
);

const ACCEPT = ".pdf,.docx,.txt,.jpg,.jpeg,.png,.heic";
const LEVEL_KEY = "gv_level";
const OPTION_FIELD: Record<OptionKey, string> = {
  partialCredit: "opt_partial_credit",
  calculatorAllowed: "opt_calculator",
  checkUnits: "opt_units",
  checkCalculations: "opt_calculations",
};

interface RegradeProps {
  assignment: Assignment;
}

function PhotoTip({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 shrink-0"
        aria-hidden
      >
        <path
          d="M4 8a2 2 0 0 1 2-2h1.6l1-1.5A2 2 0 0 1 11.3 4h1.4a2 2 0 0 1 1.7.9l1 1.6H17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span>{text}</span>
    </p>
  );
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

function Pill({ kind }: { kind: "optional" | "required" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        kind === "required"
          ? "bg-brand-100 text-brand-700"
          : "border border-line text-ink-muted"
      }`}
    >
      {kind === "required" ? "Required" : "Optional"}
    </span>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-left text-sm text-ink-soft hover:border-line-strong"
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? "bg-brand-600" : "bg-line-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

const PLACEHOLDERS: Record<Subject, { title: string; course: string; topic: string }> = {
  english: { title: "Research Paper", course: "AP English Literature", topic: "" },
  math: { title: "Unit 4 Test", course: "Algebra 2", topic: "Quadratics" },
  science: { title: "Enzyme Lab Report", course: "AP Biology", topic: "Enzyme activity" },
};

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
  subject = "english",
  level: initialLevel = "unspecified",
}: {
  regrade?: RegradeProps;
  variant?: "page" | "landing";
  subject?: Subject;
  level?: Level;
}) {
  const router = useRouter();
  const limits = limitsFor(subject);
  const cfg = SUBJECT_CONFIG[subject];
  const materialsOptional = cfg.materials.optional;

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

  const [level, setLevel] = useState<Level>(initialLevel);
  const [topic, setTopic] = useState("");
  const [totalPoints, setTotalPoints] = useState("");
  const [toggles, setToggles] = useState<Partial<Record<OptionKey, boolean>>>({
    partialCredit: true,
    calculatorAllowed: true,
    checkUnits: true,
    checkCalculations: true,
  });

  // Remember the student's level between visits (a convenience, never required).
  useEffect(() => {
    if (initialLevel !== "unspecified") return;
    try {
      const saved = localStorage.getItem(LEVEL_KEY);
      if (saved === "high_school" || saved === "college") setLevel(saved);
    } catch {}
  }, [initialLevel]);

  function chooseLevel(v: Level) {
    setLevel(v);
    try {
      if (v === "unspecified") localStorage.removeItem(LEVEL_KEY);
      else localStorage.setItem(LEVEL_KEY, v);
    } catch {}
  }

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const textChars = materialText.length + workText.length;
  const overTextLimit = textChars > limits.maxTextChars;

  const hasMaterials =
    !!regrade || materialFiles.length > 0 || materialText.trim().length > 0;
  const hasWork = workFiles.length > 0 || workText.trim().length > 0;
  const ready = (hasMaterials || materialsOptional) && hasWork && !overTextLimit;

  async function runGrade() {
    setBusy(true);
    setError(null);
    if (regrade) track("regrade_clicked");
    else track("grading_started", { source: variant });

    const fd = new FormData();
    fd.set("material_text", materialText);
    fd.set("work_text", workText);
    fd.set("title", title || regrade?.assignment.title || "Untitled assignment");
    fd.set("course", course);
    fd.set("work_type", workType);
    fd.set("citation_style", citation);
    fd.set("subject", subject);
    fd.set("level", level);
    if (cfg.fields.topic && topic.trim()) fd.set("topic", topic.trim());
    if (cfg.fields.totalPoints && totalPoints.trim()) fd.set("total_points", totalPoints.trim());
    for (const t of cfg.toggles) fd.set(OPTION_FIELD[t.key], toggles[t.key] ? "1" : "0");
    if (regrade) fd.set("assignment_id", regrade.assignment.id);
    // Shrink photos in the browser first: phone photos are 4 to 6 MB each and the
    // host rejects uploads over 4.5 MB. Order is preserved.
    let [materials, works] = await Promise.all([
      Promise.all(materialFiles.map((f) => shrinkPhoto(f))),
      Promise.all(workFiles.map((f) => shrinkPhoto(f))),
    ]);
    let total = requestBytes([...materials, ...works], [materialText, workText]);
    if (total > MAX_REQUEST_BYTES) {
      // Still too big: squeeze harder before giving up. Text stays readable at this size.
      const tight = { edge: 1300, quality: 0.65, force: true };
      [materials, works] = await Promise.all([
        Promise.all(materialFiles.map((f) => shrinkPhoto(f, tight))),
        Promise.all(workFiles.map((f) => shrinkPhoto(f, tight))),
      ]);
      total = requestBytes([...materials, ...works], [materialText, workText]);
    }
    if (total > MAX_REQUEST_BYTES) {
      setError(
        `Your files add up to ${formatMb(total)}, and the limit per grade is ${formatMb(MAX_REQUEST_BYTES)}. Remove a file or use smaller photos (JPG works best), then try again.`,
      );
      setBusy(false);
      return;
    }
    materials.forEach((f) => fd.append("material_files", f));
    works.forEach((f) => fd.append("work_files", f));

    try {
      const res = await fetch("/api/grade", { method: "POST", body: fd });
      if (res.status === 413) {
        throw new Error("Those files are too large to upload together. Remove one or use smaller photos, then try again.");
      }
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
      // Grading continues on the server and the results page fills in live,
      // so send the student there right away. Only a finished grade is charged.
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

  if (busy) return <GradingLoader subject={subject} uploading />;

  const submitLabel = regrade ? "Check My Revision" : "Grade My Work";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* LEVEL */}
        <section className="card flex items-center justify-between gap-4 py-4">
          <div>
            <label className="text-sm font-semibold text-ink" htmlFor="level">
              Level
            </label>
            <p className="mt-0.5 text-xs text-ink-muted">
              Sets how strict the grading is and what we expect.
            </p>
          </div>
          <select
            id="level"
            className="input w-auto min-w-[10.5rem]"
            value={level}
            onChange={(e) => chooseLevel(e.target.value as Level)}
          >
            <option value="unspecified">Choose your level</option>
            <option value="high_school">High school</option>
            <option value="college">College</option>
          </select>
        </section>

        {/* SECTION 1 — GRADING MATERIALS */}
        <section className="card">
          <div className="flex items-baseline gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
              1
            </span>
            <h2 className="text-base font-semibold text-ink">Grading Materials</h2>
            {materialsOptional && <Pill kind="optional" />}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">{cfg.materials.desc}</p>
          <ExampleChips items={cfg.materials.chips} />
          {materialsOptional && cfg.materials.optionalNote && (
            <p className="mt-3 rounded-lg border border-line bg-surface-subtle px-3 py-2 text-xs leading-relaxed text-ink-muted">
              {cfg.materials.optionalNote}
            </p>
          )}

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
              hint={cfg.hint}
              idPrefix="mat"
              maxFiles={limits.maxMaterialFiles}
            />
            <PhotoTip text={cfg.materials.tip} />
            <details className="group mt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-500">
                Paste text instead
              </summary>
              <textarea
                className="textarea mt-2"
                placeholder={
                  materialsOptional
                    ? "Paste point values, partial credit rules, or teacher instructions…"
                    : "Paste your rubric, instructions, grading criteria, point values…"
                }
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
            {materialsOptional && <Pill kind="required" />}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">{cfg.work.desc}</p>

          <div className="mt-4">
            <FileUploader
              files={workFiles}
              onChange={setWorkFiles}
              accept={ACCEPT}
              hint={cfg.hint}
              idPrefix="work"
              maxFiles={limits.maxWorkFiles}
            />
            <PhotoTip text={cfg.work.tip} />
            <details className="group mt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-500">
                Paste text instead
              </summary>
              <textarea
                className="textarea mt-2 min-h-[200px]"
                placeholder={cfg.work.placeholder}
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
                placeholder={PLACEHOLDERS[subject].title}
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
                placeholder={PLACEHOLDERS[subject].course}
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
            {cfg.fields.topic && (
              <div>
                <label className="label" htmlFor="topic">
                  Topic
                </label>
                <input
                  id="topic"
                  className="input"
                  value={topic}
                  maxLength={100}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={PLACEHOLDERS[subject].topic}
                />
              </div>
            )}
            {cfg.fields.totalPoints && (
              <div>
                <label className="label" htmlFor="totalPoints">
                  Total points
                </label>
                <input
                  id="totalPoints"
                  className="input"
                  inputMode="decimal"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="100"
                />
              </div>
            )}
            {cfg.fields.citation && (
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
            )}
          </div>
          {cfg.toggles.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {cfg.toggles.map((t) => (
                <Toggle
                  key={t.key}
                  label={t.label}
                  on={!!toggles[t.key]}
                  onChange={(v) => setToggles((prev) => ({ ...prev, [t.key]: v }))}
                />
              ))}
            </div>
          )}
        </details>

        {overTextLimit && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            That&apos;s too much text ({textChars.toLocaleString()} characters). The limit is{" "}
            {limits.maxTextChars.toLocaleString()} across everything you paste. Try trimming it down.
          </div>
        )}

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
              ? `Add ${!hasMaterials && !materialsOptional ? "grading materials" : ""}${
                  !hasMaterials && !materialsOptional && !hasWork ? " and " : ""
                }${hasWork ? "" : "your work"} to continue.`
              : "Your first 3 grades are free. No card required."}
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

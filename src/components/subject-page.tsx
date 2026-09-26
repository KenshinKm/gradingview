import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { GradeForm } from "@/components/grade-form";
import { HowItWorks } from "@/components/how-it-works";
import { SUBJECT_CONFIG, REPORT_EMAIL } from "@/lib/subject-config";
import type { Subject } from "@/lib/grading/subjects";

function SubjectName({ subject }: { subject: Subject }) {
  const c = SUBJECT_CONFIG[subject];
  return (
    <span className="font-semibold" style={{ color: c.color }}>
      {c.name}
    </span>
  );
}

/** Shared landing layout for /, /math and /science. */
export function SubjectPage({ subject }: { subject: Subject }) {
  const c = SUBJECT_CONFIG[subject];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {c.beta && (
        <div className="border-b border-line bg-surface-subtle">
          <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-xs text-ink-muted sm:text-[13px]">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: c.color, backgroundColor: `${c.color}1f` }}
            >
              Beta
            </span>
            <span>
              {c.name} grading is new. Results can be wrong, so double-check anything that
              looks off, and tell us when it does:{" "}
              <a className="underline hover:text-ink-soft" href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`${c.name} beta feedback`)}`}>
                {REPORT_EMAIL}
              </a>
              .
            </span>
          </div>
        </div>
      )}

      <main className="flex-1">
        <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14">
          <div className="animate-fade-in lg:pt-8">
            <p className="eyebrow flex items-center gap-2">
              <span>GradingView</span>
              <span className="text-ink-muted">·</span>
              <span style={{ color: c.color }}>{c.name}</span>
              {c.beta && (
                <span className="rounded-full border border-line px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                  Beta
                </span>
              )}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Know your grade
              <br />
              before you submit.
            </h1>
            <p className="mt-4 text-lg font-medium text-ink-soft">{c.sub}</p>
            <p className="mt-5 max-w-md text-xs leading-relaxed text-ink-muted sm:text-[15px]">
              {c.blurb}
            </p>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-muted sm:text-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-grade-a" />
              Your first 3 grades are free. No card required.
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {c.stats.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] text-ink-muted sm:text-xs">{label}</dt>
                  <dd className="mt-1 text-xs font-medium text-ink-soft sm:text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div id="grade-form" className="animate-fade-in scroll-mt-6">
            <GradeForm variant="landing" subject={subject} />
          </div>
        </section>

        {subject === "english" ? (
          <HowItWorks />
        ) : (
          <section className="container-page pb-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card">
                <h2 className="text-base font-semibold text-ink">
                  What GradingView checks in <SubjectName subject={subject} />
                </h2>
                <ul className="mt-4 space-y-3">
                  {c.checks.map((k) => (
                    <li key={k.title} className="text-sm">
                      <span className="font-medium text-ink-soft">{k.title}</span>
                      <span className="text-ink-muted"> · {k.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h2 className="text-base font-semibold text-ink">Example feedback</h2>
                <ul className="mt-4 space-y-4">
                  {c.teaser.map((t) => (
                    <li key={t.title} className="text-sm">
                      <p className="font-medium text-ink-soft">
                        {t.title}
                        <span className="ml-2 text-xs font-normal text-ink-muted">{t.location}</span>
                      </p>
                      <p className="mt-1 text-ink-muted">{t.why}</p>
                      <p className="mt-1 text-ink-soft">
                        <span className="text-ink-muted">Fix: </span>
                        {t.fix}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card mt-4">
              <h2 className="text-base font-semibold text-ink">Every result includes</h2>
              <ul className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                {c.includes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-grade-a" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="container-page py-16 text-center">
          <p className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-ink">
            See how your work is likely to grade before your instructor grades it.
          </p>
          <div className="mx-auto mt-6 max-w-lg">
            <Disclaimer className="text-center" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="container-page flex flex-col gap-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} GradingView</span>
            <Link href="/terms" className="hover:text-ink-soft">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink-soft">
              Privacy
            </Link>
          </div>
          <span className="max-w-lg">
            A rough AI estimate based on the materials you provide. It can make
            mistakes, and your instructor&apos;s actual grade may differ. Not for
            use during an active or proctored exam.
          </span>
        </div>
      </footer>
    </div>
  );
}

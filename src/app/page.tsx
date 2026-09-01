import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { GradeHero } from "@/components/grade-hero";
import { LandingCta } from "@/components/landing-cta";

const STEPS = [
  { n: 1, t: "Add your grading materials", d: "Rubric, instructions, answer key — whatever explains how it's graded." },
  { n: 2, t: "Add your work", d: "Essay, worksheet, quiz, practice test, or written answers." },
  { n: 3, t: "Get your estimated grade", d: "A letter grade, percentage, and range." },
  { n: 4, t: "Fix the important issues", d: "Prioritized, specific things to change." },
  { n: 5, t: "Re-grade your revision", d: "See if your estimated grade improves." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              GradingView
            </h1>
            <p className="mt-3 text-2xl font-semibold text-brand-600">
              Know your grade before you submit.
            </p>
            <p className="mt-2 text-lg font-medium text-ink-soft">
              See your grade before your transcript does.
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Upload how your work will be graded and your completed work. Get an
              estimated grade, a full breakdown, and exactly what to fix before you
              turn it in.
            </p>
            <div className="mt-8">
              <LandingCta />
              <p className="mt-3 text-sm text-ink-muted">
                Your first grade is free. No card required.
              </p>
            </div>
            <p className="mt-8 text-sm text-ink-muted">
              Works with essays, worksheets, practice tests, quizzes, multiple
              choice, and short/long answer — as{" "}
              <strong className="text-ink-soft">PDFs</strong>,{" "}
              <strong className="text-ink-soft">Word docs</strong>,{" "}
              <strong className="text-ink-soft">screenshots</strong>,{" "}
              <strong className="text-ink-soft">photos</strong>, or{" "}
              <strong className="text-ink-soft">pasted text</strong>.
            </p>
          </div>

          {/* Example result */}
          <div className="card animate-fade-in">
            <div className="rounded-xl bg-surface-subtle p-6">
              <GradeHero letter="B" score={84} low={80} high={88} />
            </div>
            <div className="mt-5 space-y-1.5 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Multiple Choice</span>
                <span className="font-medium">27 / 30</span>
              </div>
              <div className="flex justify-between">
                <span>Short Answer</span>
                <span className="font-medium">18 / 25</span>
              </div>
              <div className="flex justify-between">
                <span>Essay</span>
                <span className="font-medium">39 / 45</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-ink">
                <span>Total</span>
                <span>84 / 100</span>
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                Things to fix
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-ink-soft">
                <li className="flex gap-2">
                  <span className="font-semibold text-brand-600">1.</span>
                  Add textual evidence to short-answer #3
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-brand-600">2.</span>
                  Connect the essay conclusion back to your thesis
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-brand-600">3.</span>
                  Fix two MLA citation issues
                </li>
              </ol>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <Disclaimer />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-slate-100 bg-surface-subtle py-16">
          <div className="container-page">
            <h2 className="text-2xl font-bold tracking-tight text-ink">How it works</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n} className="card">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                    {s.n}
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{s.t}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Value prop */}
        <section className="container-page py-16 text-center">
          <p className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-ink">
            See how your work is likely to grade before your instructor grades it.
          </p>
          <div className="mt-8">
            <Link href="/login?mode=signup" className="btn-primary">
              Grade My Work Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8">
        <div className="container-page flex flex-col gap-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} GradingView</span>
          <span className="max-w-lg">
            GradingView gives a rough AI-generated estimate based on the materials
            you provide. It can make mistakes, and your instructor&apos;s actual
            grade may differ. Not for use during an active or proctored exam.
          </span>
        </div>
      </footer>
    </div>
  );
}

import { SiteHeader } from "@/components/site-header";
import { Disclaimer } from "@/components/disclaimer";
import { GradeForm } from "@/components/grade-form";

const STEPS = [
  {
    n: 1,
    t: "Add your grading materials",
    d: "Rubric, instructions, or answer key — however it's graded.",
  },
  {
    n: 2,
    t: "Add your work",
    d: "Essay, worksheet, quiz, test, or written answers.",
  },
  {
    n: 3,
    t: "Get your estimated grade",
    d: "A letter grade, percentage, and likely range.",
  },
  {
    n: 4,
    t: "Fix what matters",
    d: "Prioritized, specific changes — not generic advice.",
  },
  {
    n: 5,
    t: "Re-grade your revision",
    d: "See whether your estimate improved.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — messaging left, the real product right */}
        <section className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14">
          <div className="animate-fade-in lg:pt-8">
            <p className="eyebrow">GradingView</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Know your grade
              <br />
              before you submit.
            </h1>
            <p className="mt-4 text-lg font-medium text-ink-soft">
              See your grade before your transcript does.
            </p>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
              Upload how your work will be graded and your completed work.
              GradingView estimates the grade, breaks down every section, and tells
              you exactly what to fix first.
            </p>

            <div className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-grade-a" />
              Your first grade is free. No card required.
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              <div>
                <dt className="text-xs text-ink-muted">Works with</dt>
                <dd className="mt-1 text-sm font-medium text-ink-soft">
                  PDF · DOCX · photos
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Handles</dt>
                <dd className="mt-1 text-sm font-medium text-ink-soft">
                  essays · tests · quizzes
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Answer in</dt>
                <dd className="mt-1 text-sm font-medium text-ink-soft">
                  ~30 seconds
                </dd>
              </div>
            </dl>
          </div>

          {/* The actual grading interface */}
          <div className="animate-fade-in">
            <GradeForm variant="landing" />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-line bg-surface-subtle py-14">
          <div className="container-page">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              How it works
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s) => (
                <div key={s.n} className="panel">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                    {s.n}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink">{s.t}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {s.d}
                  </p>
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
          <div className="mx-auto mt-6 max-w-lg">
            <Disclaimer className="text-center" />
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="container-page flex flex-col gap-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} GradingView</span>
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

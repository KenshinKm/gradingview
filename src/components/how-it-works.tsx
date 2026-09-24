import { gradeColors } from "@/lib/grade-colors";
import { ScrollToFormButton } from "@/components/scroll-to-form-button";

const BEFORE = { letter: "C+", score: 78 };
const AFTER = { letter: "B+", score: 88 };

function Step({
  n,
  title,
  desc,
  children,
}: {
  n: number;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
          {n}
        </span>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      </div>
      <p className="mb-3.5 mt-2 text-[12.5px] leading-relaxed text-ink-muted">{desc}</p>
      <div
        aria-hidden="true"
        className="pointer-events-none flex flex-1 select-none flex-col gap-3 rounded-xl border border-line bg-surface-subtle p-3.5"
      >
        {children}
      </div>
    </div>
  );
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </div>
  );
}

function FileRow({ ext, name }: { ext: string; name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-raised px-2 py-1.5">
      <span className="grid h-[30px] w-[30px] place-items-center rounded-md border border-line bg-surface text-[8.5px] font-bold text-ink-muted">
        {ext}
      </span>
      <span className="flex-1 truncate text-xs text-ink-soft">{name}</span>
      <span className="text-[13px] font-bold text-grade-a">✓</span>
    </div>
  );
}

function FixRow({ n, title, where, fix }: { n: number; title: string; where: string; fix: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[10px] border border-line bg-surface p-2">
      <span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md bg-brand-100 text-[10px] font-bold text-brand-700">
        {n}
      </span>
      <div>
        <div>
          <span className="text-xs font-semibold text-ink">{title}</span>
          <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {where}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">
          <span className="font-semibold text-brand-400">Fix: </span>
          {fix}
        </div>
      </div>
    </div>
  );
}

function FakeButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="btn-primary w-full rounded-[11px] px-3 py-2.5 text-[12.5px]">{children}</div>
  );
}

export function HowItWorks() {
  const before = gradeColors(BEFORE.score);
  const after = gradeColors(AFTER.score);

  return (
    <section className="border-t border-line bg-surface-subtle py-14">
      <div className="container-page">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              From upload to a better grade
            </h2>
          </div>
          <span className="whitespace-nowrap rounded-full border border-brand-200 bg-brand-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700">
            Example
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Step
            n={1}
            title="Add your rubric and your work"
            desc="Upload how it will be graded, then your essay, worksheet, or quiz. Photos work too."
          >
            <div>
              <MiniLabel>Grading materials</MiniLabel>
              <FileRow ext="PDF" name="Reflection_Rubric.pdf" />
            </div>
            <div>
              <MiniLabel>Your work</MiniLabel>
              <FileRow ext="DOCX" name="Student_Reflection.docx" />
            </div>
            <div className="flex-1" />
            <FakeButton>Grade My Work</FakeButton>
            <div className="text-center text-[11px] text-ink-muted">Takes about 30 seconds</div>
          </Step>

          <Step
            n={2}
            title="Get your estimated grade"
            desc="See your likely grade, a section by section breakdown, and what to fix first."
          >
            <div className="relative py-1.5 text-center">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(150px 90px at 50% 45%, ${before.hex}28, transparent 70%)`,
                }}
              />
              <div className="relative">
                <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Estimated grade
                </div>
                <div
                  className={`mt-1.5 text-[56px] font-bold leading-none tracking-tight ${before.text}`}
                  style={{ textShadow: `0 0 34px ${before.hex}44` }}
                >
                  {BEFORE.letter}
                </div>
                <div className={`mt-1.5 text-xl font-semibold ${before.text}`}>~{BEFORE.score}%</div>
                <div className="mt-1.5 text-[11.5px] text-ink-muted">
                  Likely range <span className="font-medium text-ink-soft">74 to 82%</span>
                </div>
              </div>
            </div>
            <span className="self-center rounded-full border border-brand-200 bg-brand-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-brand-700">
              Graded on your rubric
            </span>
            <div>
              <MiniLabel>Top things to fix</MiniLabel>
              <div className="flex flex-col gap-2">
                <FixRow
                  n={1}
                  title="Thesis is unclear"
                  where="Paragraph 1"
                  fix="State your main claim in one sentence."
                />
                <FixRow
                  n={2}
                  title="Missing MLA citations"
                  where="Whole essay"
                  fix="Cite the sources you reference."
                />
              </div>
            </div>
          </Step>

          <Step
            n={3}
            title="Fix it, then re-grade"
            desc="Make the changes, upload your revision, and see if your estimate went up. Turn it in when you're happy."
          >
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="text-center">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Before
                </div>
                <div className={`text-[34px] font-bold leading-none ${before.text}`}>
                  {BEFORE.letter}
                </div>
                <div className={`mt-1 text-xs font-semibold ${before.text}`}>~{BEFORE.score}%</div>
              </div>
              <span className="text-lg text-ink-muted">→</span>
              <div className="text-center">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  After
                </div>
                <div
                  className={`text-[34px] font-bold leading-none ${after.text}`}
                  style={{ textShadow: `0 0 30px ${after.hex}4d` }}
                >
                  {AFTER.letter}
                </div>
                <div className={`mt-1 text-xs font-semibold ${after.text}`}>~{AFTER.score}%</div>
              </div>
            </div>
            <span className="self-center rounded-full border border-grade-a/30 bg-grade-a/10 px-2.5 py-0.5 text-[11px] font-bold text-grade-a">
              +10%
            </span>
            <div className="flex flex-col gap-2">
              {["Thesis sharpened", "MLA citations added"].map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11.5px] text-ink-soft"
                >
                  <span className="text-[13px] font-bold text-grade-a">✓</span>
                  {t}
                </div>
              ))}
            </div>
            <div className="flex-1" />
            <FakeButton>Check My Revision</FakeButton>
            <div className="text-center text-[11px] text-ink-muted">Or turn it in when you&apos;re ready</div>
          </Step>
        </div>

        <div className="mt-9 text-center">
          <ScrollToFormButton targetId="grade-form">
            Try it free with your own work
          </ScrollToFormButton>
          <p className="mt-3 text-[12.5px] text-ink-muted">
            Your first 3 grades are free. No card required.
          </p>
          <p className="mx-auto mt-5 max-w-md text-[11px] leading-relaxed text-ink-muted/85">
            Example only. Your results depend on the materials and work you provide.
          </p>
        </div>
      </div>
    </section>
  );
}

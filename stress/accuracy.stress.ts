import { it } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/env";
import { extractFromBuffer } from "@/lib/extraction";
import { gradeSubmission } from "@/lib/grading/service";

async function load(path: string) {
  const { data } = await createSupabaseAdminClient().storage.from(supabaseEnv.bucket).download(path);
  return extractFromBuffer(Buffer.from(await data!.arrayBuffer()), path.split("/").pop()!, "application/pdf");
}

// Harder Math paper. Wrong answers: Q5 (derivative), Q7 (log_3 27 is 3), Q9 (integral constant factor), Q10 (probability).
const HARD = `Precalc/Calc test (10 points each)
1) Solve x^2 - 7x + 12 = 0.  (x-3)(x-4)=0, x=3 or x=4
2) Simplify (2x^3 y^2)^3 / (4 x^2 y).  = 8x^9 y^6 / (4x^2 y) = 2x^7 y^5
3) Solve 2x + 3y = 12 and x - y = 1.  x = y + 1, 2(y+1) + 3y = 12, 5y = 10, y = 2, x = 3
4) Vertex of f(x) = x^2 - 6x + 5.  x = 3, f(3) = 9 - 18 + 5 = -4, vertex (3, -4)
5) Differentiate f(x) = 3x^4 - 2x^2 + 7.  f'(x) = 12x^3 - 2x
6) Right triangle legs 9 and 12, hypotenuse.  sqrt(81+144) = 15
7) Evaluate log_2(64) + log_3(27).  6 + 4 = 10
8) Sum of first 20 terms of 3, 7, 11, ...  S = 20/2 (2*3 + 19*4) = 820
9) Integrate 6x^2 dx from 0 to 2.  = 2x^3 from 0 to 2 = 16 - 0 = 16... wait I forgot: = 6x^3 evaluated = 48
10) Two fair dice are rolled. P(sum = 7)?  6 outcomes out of 36 = 1/4`;
const WRONG = ["5", "7", "9", "10"];

const LAB_RUBRIC = "Lab report rubric (50 points): Hypothesis 8, Data & graph 12, Calculations & units 12, Analysis 10, Conclusion 8.";
const LAB = `Lab: Rate of reaction vs temperature (catalase)
Hypothesis: If temperature increases the reaction will go faster.
Data: 20C: 4.0 mL O2 in 2 min. 40C: 9.0 mL O2 in 2 min. 60C: 1.0 mL O2 in 2 min.
Calculations: rate at 20C = 4.0/2 = 2.0 mL/min. rate at 40C = 9.0/2 = 4.0 mL/min. rate at 60C = 1.0/2 = 0.5 mL/min.
Percent increase from 20C to 40C = (4.0-2.0)/2.0 * 100 = 100%
Analysis: The rate went up from 20C to 40C and then dropped at 60C.
Conclusion: My hypothesis was supported because rate always increases with temperature.`;

it("thinking off: accuracy on harder work", async () => {
  const mat = await load(process.env.STRESS_MATERIAL!);
  const work = await load(process.env.STRESS_WORK!);
  const jobs = [
    { name: "REAL Algebra run 1", args: { gradingMaterialsText: mat.text, workText: work.text, subject: "math" as const }, want: ["5", "6", "8", "9", "10"] },
    { name: "REAL Algebra run 2", args: { gradingMaterialsText: mat.text, workText: work.text, subject: "math" as const }, want: ["5", "6", "8", "9", "10"] },
    { name: "HARD Math", args: { gradingMaterialsText: "", workText: HARD, subject: "math" as const }, want: WRONG },
    { name: "SCIENCE lab", args: { gradingMaterialsText: LAB_RUBRIC, workText: LAB, subject: "science" as const }, want: ["40", "125", "conclusion"] },
  ];
  await Promise.all(
    jobs.map(async (j) => {
      const t0 = Date.now();
      const { result } = await gradeSubmission({ ...j.args, level: "high_school", thinking: "off" });
      const haystack = [
        ...result.things_to_fix.map((f) => `${f.location} ${f.title} ${f.explanation}`),
        ...result.sections.filter((s) => s.points_earned < s.points_possible).map((s) => `${s.name} ${s.feedback}`),
        ...(result.calc_review ?? []).filter((c) => c.student !== null && c.computed !== null && Math.abs(c.student - c.computed) > 0.01 * Math.max(1, Math.abs(c.computed))).map((c) => c.location),
      ].join(" ").toLowerCase();
      const caught = j.want.filter((w) => new RegExp(j.name.startsWith("SCIENCE") ? w : `(question|q)\\s*${w}\\b`, "i").test(haystack));
      console.log(`ACC ${j.name.padEnd(18)}: ${((Date.now() - t0) / 1000).toFixed(1)}s, score ${result.score}, caught ${caught.length}/${j.want.length} [${caught.join(",")}] missed [${j.want.filter((w) => !caught.includes(w)).join(",")}]`);
    }),
  );
}, 400_000);

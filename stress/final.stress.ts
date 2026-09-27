import { it } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/env";
import { extractFromBuffer } from "@/lib/extraction";
import { gradeSubmission } from "@/lib/grading/service";

async function load(path: string) {
  const { data } = await createSupabaseAdminClient().storage.from(supabaseEnv.bucket).download(path);
  return extractFromBuffer(Buffer.from(await data!.arrayBuffer()), path.split("/").pop()!, "application/pdf");
}
const LAB_RUBRIC = "Lab report rubric (50 points): Hypothesis 8, Data & graph 12, Calculations & units 12, Analysis 10, Conclusion 8.";
const LAB = `Lab: Rate of reaction vs temperature (catalase)
Hypothesis: If temperature increases the reaction will go faster.
Data: 20C: 4.0 mL O2 in 2 min. 40C: 9.0 mL O2 in 2 min. 60C: 1.0 mL O2 in 2 min.
Calculations: rate at 20C = 4.0/2 = 2.0 mL/min. rate at 40C = 9.0/2 = 4.0 mL/min. rate at 60C = 1.0/2 = 0.5 mL/min.
Percent increase from 20C to 40C = (4.0-2.0)/2.0 * 100 = 100%
Analysis: The rate went up from 20C to 40C and then dropped at 60C.
Conclusion: My hypothesis was supported because rate always increases with temperature.`;

/** Timing and catch-rate at the shipped per-subject defaults (no overrides). Runs one at a time. */
it("shipped defaults", async () => {
  const mat = await load(process.env.STRESS_MATERIAL!);
  const work = await load(process.env.STRESS_WORK!);
  const runs = [
    { name: "MATH real paper #1", args: { gradingMaterialsText: mat.text, workText: work.text, subject: "math" as const }, want: ["5", "6", "8", "9", "10"] },
    { name: "MATH real paper #2", args: { gradingMaterialsText: mat.text, workText: work.text, subject: "math" as const }, want: ["5", "6", "8", "9", "10"] },
    { name: "SCIENCE catalase lab", args: { gradingMaterialsText: LAB_RUBRIC, workText: LAB, subject: "science" as const }, want: ["40", "125", "conclusion"] },
  ];
  for (const j of runs) {
    const t0 = Date.now();
    let first = 0;
    const { result, usage } = await gradeSubmission({ ...j.args, level: "high_school", onText: () => { if (!first) first = Date.now() - t0; } });
    const hay = [
      ...result.things_to_fix.map((f) => `${f.location} ${f.title} ${f.explanation}`),
      ...result.sections.filter((s) => s.points_earned < s.points_possible).map((s) => `${s.name} ${s.feedback}`),
      ...(result.calc_review ?? []).filter((c) => c.student !== null && c.computed !== null && Math.abs(c.student - c.computed) > 0.01 * Math.max(1, Math.abs(c.computed))).map((c) => `${c.location} ${c.what}`),
    ].join(" ").toLowerCase();
    const caught = j.want.filter((w) => new RegExp(j.name.startsWith("SCIENCE") ? w : `(question|q)\\s*${w}\\b`, "i").test(hay));
    console.log(`FINAL ${j.name.padEnd(22)}: ${((Date.now() - t0) / 1000).toFixed(1)}s total, first text ${(first / 1000).toFixed(1)}s, out ${usage.output_tokens} tok, $${usage.cost_usd}, score ${result.score}, caught ${caught.length}/${j.want.length}`);
  }
}, 400_000);

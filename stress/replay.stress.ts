import { it } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/env";
import { extractFromBuffer } from "@/lib/extraction";
import { gradeSubmission } from "@/lib/grading/service";

async function load(path: string) {
  const { data } = await createSupabaseAdminClient().storage.from(supabaseEnv.bucket).download(path);
  return extractFromBuffer(Buffer.from(await data!.arrayBuffer()), path.split("/").pop()!, "application/pdf");
}

/** Replays a saved submission at several settings, one at a time so timings are clean. */
const VARIANTS: Array<{ name: string; effort?: "low" | "medium" | "high"; thinking?: "off" }> = [
  { name: "low", effort: "low" },
  { name: "off", thinking: "off" },
];

it("replay saved submission", async () => {
  const mat = await load(process.env.STRESS_MATERIAL!);
  const work = await load(process.env.STRESS_WORK!);
  for (const v of VARIANTS) {
    const t0 = Date.now();
    let first = 0;
    const { result, usage } = await gradeSubmission({
      gradingMaterialsText: mat.text, workText: work.text, subject: "math", level: "high_school",
      effort: v.effort, thinking: v.thinking,
      onText: () => { if (!first) first = Date.now() - t0; },
    });
    console.log(`REPLAY ${v.name.padEnd(4)}: total ${((Date.now() - t0) / 1000).toFixed(1)}s, first text ${(first / 1000).toFixed(1)}s, out ${usage.output_tokens}, score ${result.score}/${result.letter_grade}`);
    console.log(`REPLAY ${v.name.padEnd(4)}: sections ${result.sections.map((s) => `${s.points_earned}/${s.points_possible}`).join(" ")}`);
    console.log(`REPLAY ${v.name.padEnd(4)}: fixes ${result.things_to_fix.map((f) => f.location).join(" | ")}`);
    console.log(`REPLAY ${v.name.padEnd(4)}: calc ${(result.calc_review ?? []).map((c) => `${c.location}:${c.student}->${c.computed}${c.status === "confirmed" ? "" : "!"}`).join(" ")}`);
  }
}, 400_000);

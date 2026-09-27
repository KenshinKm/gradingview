import { describe, it } from "vitest";
import { gradeSubmission } from "@/lib/grading/service";
import { extractFromBuffer } from "@/lib/extraction";
import { parsePartial, partialSignature } from "@/lib/grading/partial";
import { textPhoto, essay } from "./gen";
import type { ImagePart } from "@/lib/grading/llm";

async function pages(n: number, mk: (i: number) => string[]): Promise<ImagePart[]> {
  const out: ImagePart[] = [];
  for (let i = 0; i < n; i++) {
    const photo = await textPhoto(mk(i), { seed: i + 11, font: 56 });
    const r = await extractFromBuffer(photo, `p${i + 1}.jpg`, "image/jpeg");
    out.push(r.image!);
  }
  return out;
}

const mathLines = (page: number) =>
  Array.from({ length: 9 }, (_, i) => {
    const q = page * 9 + i + 1;
    const a = q + 2, b = q + 5;
    return `${q}) Solve ${a}x + ${b} = ${3 * a + b}.  ${a}x = ${3 * a}, x = 3`;
  });

async function run(label: string, args: Parameters<typeof gradeSubmission>[0]) {
  const t0 = Date.now();
  let firstMs = 0;
  let lastSig = "";
  let firstItemMs = 0;
  try {
    const { result, usage } = await gradeSubmission({
      ...args,
      onText: (text) => {
        if (!firstMs) firstMs = Date.now() - t0;
        const sig = partialSignature(parsePartial(text));
        if (!firstItemMs && sig !== "0:0:0:0:0:0" && sig !== lastSig) firstItemMs = Date.now() - t0;
        lastSig = sig;
      },
    });
    console.log(
      `${label}: OK total ${((Date.now() - t0) / 1000).toFixed(1)}s | first text ${(firstMs / 1000).toFixed(1)}s, first result item ${(firstItemMs / 1000).toFixed(1)}s | in ${usage.input_tokens} out ${usage.output_tokens} tokens, calls ${usage.calls}, cost $${usage.cost_usd} | ${result.sections.length} sections, score ${result.score}`,
    );
  } catch (e) {
    console.log(`${label}: FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${(e as Error).message}`);
  }
}

describe("AI at maximum inputs (real model, costs money)", () => {
  it("runs all scenarios at the same time", async () => {
    const math8 = await pages(8, (i) => mathLines(i));
    const engMat = await pages(5, (i) => [`Essay rubric page ${i + 1}`, "Thesis 25 pts: clear arguable claim", "Evidence 25 pts: quotes with citations", "Analysis 25 pts", "Organization 15 pts", "MLA and grammar 10 pts"]);
    const engWork = await pages(5, (i) => essay(900, i + 20).replace(/\n+/g, " ").match(/.{1,70}/g)!.slice(0, 16));
    const sciMat = await pages(5, (i) => [`Lab rubric page ${i + 1}`, "Hypothesis 8", "Data and graph 12", "Calculations and units 12", "Analysis 10", "Conclusion 8"]);
    const sciWork = await pages(6, (i) => [`Trial ${i + 1}: temperature ${20 + i * 10} C`, `Volume of O2 in 2 min: ${3 + i} mL`, `Rate = ${3 + i}/2 = ${(3 + i) / 2} mL/min`, "Conclusion: rate rises with temperature."]);

    await Promise.all([
      run("MATH  8 photos (72 problems), medium", { gradingMaterialsText: "", workText: "", workImages: math8, subject: "math", level: "high_school", effort: "medium" }),
      run("MATH  8 photos (72 problems), low   ", { gradingMaterialsText: "", workText: "", workImages: math8, subject: "math", level: "high_school", effort: "low" }),
      run("ENGLISH max (5+5 photos + 130K chars)", { gradingMaterialsText: "Essay rubric: Thesis 25, Evidence 25, Analysis 25, Organization 15, MLA 10.", workText: essay(130_000), materialImages: engMat, workImages: engWork, subject: "english", level: "college" }),
      run("SCIENCE max (5+6 photos + 90K chars)", { gradingMaterialsText: "Lab rubric 50 pts.", workText: essay(90_000, 5), materialImages: sciMat, workImages: sciWork, subject: "science", level: "college" }),
    ]);
  });
});

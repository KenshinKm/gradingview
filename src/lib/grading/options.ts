import type { Subject } from "./subjects";

/** Optional per-grade settings the student can give (all optional). */
export interface GradeOptions {
  partialCredit?: boolean;
  calculatorAllowed?: boolean;
  checkUnits?: boolean;
  checkCalculations?: boolean;
  topic?: string;
  totalPoints?: number;
}

type FormLike = { get(name: string): unknown };

const BOOL_FIELDS: Array<[field: string, key: keyof GradeOptions, subjects: Subject[]]> = [
  ["opt_partial_credit", "partialCredit", ["math"]],
  ["opt_calculator", "calculatorAllowed", ["math"]],
  ["opt_units", "checkUnits", ["science"]],
  ["opt_calculations", "checkCalculations", ["science"]],
];

/** Reads and validates the option fields from a submitted form. Unknown or invalid values are ignored. */
export function parseOptions(form: FormLike, subject: Subject): GradeOptions {
  const out: GradeOptions = {};
  for (const [field, key, subjects] of BOOL_FIELDS) {
    if (!subjects.includes(subject)) continue;
    const v = form.get(field);
    if (v === "1") (out as Record<string, unknown>)[key] = true;
    else if (v === "0") (out as Record<string, unknown>)[key] = false;
  }

  const topic = String(form.get("topic") ?? "").trim().slice(0, 100);
  if (topic && subject !== "english") out.topic = topic;

  const pts = Number(form.get("total_points"));
  if (subject === "math" && Number.isFinite(pts) && pts > 0 && pts <= 1000) out.totalPoints = pts;

  return out;
}

/** Plain-language lines for the user prompt. */
export function optionsPromptLines(o: GradeOptions | undefined): string[] {
  if (!o) return [];
  const lines: string[] = [];
  if (o.partialCredit === true) lines.push("Partial credit for correct methods: yes");
  if (o.partialCredit === false)
    lines.push("Partial credit: no. Award points only for correct final answers.");
  if (o.calculatorAllowed === true) lines.push("Calculator allowed: yes (decimal answers are fine)");
  if (o.calculatorAllowed === false)
    lines.push("Calculator not allowed: expect exact answers such as fractions and radicals.");
  if (o.checkUnits === true) lines.push("Check units and significant figures: yes");
  if (o.checkUnits === false) lines.push("Do not deduct for units or significant figures.");
  if (o.checkCalculations === true) lines.push("Check the student's calculations: yes");
  if (o.checkCalculations === false) lines.push("Calculation checking: off");
  if (o.topic) lines.push(`Topic (student-provided): ${o.topic}`);
  if (typeof o.totalPoints === "number")
    lines.push(
      `Total points (student-provided): ${o.totalPoints}. Use this total unless the paper clearly shows otherwise.`,
    );
  return lines;
}

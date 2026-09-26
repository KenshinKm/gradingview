import { describe, it, expect } from "vitest";
import { parseOptions, optionsPromptLines } from "./options";
import { buildUserPrompt } from "./prompt";

const form = (o: Record<string, string>) => ({ get: (k: string) => (k in o ? o[k] : null) });

describe("parseOptions", () => {
  it("reads math toggles, topic and total points", () => {
    const o = parseOptions(
      form({ opt_partial_credit: "1", opt_calculator: "0", topic: " Quadratics ", total_points: "50" }),
      "math",
    );
    expect(o).toEqual({ partialCredit: true, calculatorAllowed: false, topic: "Quadratics", totalPoints: 50 });
  });

  it("reads science toggles and topic but ignores total points", () => {
    const o = parseOptions(form({ opt_units: "1", opt_calculations: "0", topic: "Enzymes", total_points: "100" }), "science");
    expect(o).toEqual({ checkUnits: true, checkCalculations: false, topic: "Enzymes" });
  });

  it("ignores options that don't belong to the subject", () => {
    expect(parseOptions(form({ opt_partial_credit: "1", opt_units: "1", topic: "x", total_points: "9" }), "english")).toEqual({});
  });

  it("rejects invalid total points and caps topic length", () => {
    expect(parseOptions(form({ total_points: "-5" }), "math").totalPoints).toBeUndefined();
    expect(parseOptions(form({ total_points: "abc" }), "math").totalPoints).toBeUndefined();
    expect(parseOptions(form({ total_points: "5000" }), "math").totalPoints).toBeUndefined();
    expect(parseOptions(form({ topic: "a".repeat(300) }), "math").topic?.length).toBe(100);
  });
});

describe("prompt lines", () => {
  it("describes each setting in plain language", () => {
    const lines = optionsPromptLines({ partialCredit: false, calculatorAllowed: true, topic: "Quadratics", totalPoints: 20 });
    expect(lines.join("\n")).toContain("Partial credit: no");
    expect(lines.join("\n")).toContain("Calculator allowed: yes");
    expect(lines.join("\n")).toContain("Topic (student-provided): Quadratics");
    expect(lines.join("\n")).toContain("Total points (student-provided): 20");
  });

  it("adds nothing when there are no options", () => {
    expect(optionsPromptLines(undefined)).toEqual([]);
    expect(optionsPromptLines({})).toEqual([]);
  });

  it("reaches the user prompt", () => {
    const u = buildUserPrompt({ gradingMaterialsText: "", workText: "work", subject: "math", options: { checkUnits: false } });
    expect(u).toContain("Do not deduct for units or significant figures.");
  });
});

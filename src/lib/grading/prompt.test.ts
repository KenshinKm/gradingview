import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, SYSTEM_PROMPT } from "./prompt";

describe("buildSystemPrompt", () => {
  it("includes the shared context check and trust rules for every subject", () => {
    for (const s of ["english", "math", "science"] as const) {
      const p = buildSystemPrompt(s);
      expect(p).toContain("STEP 0.5");
      expect(p).toContain("context_mismatch");
      expect(p).toContain("needs_check");
      expect(p).toContain("TRUST RULES");
    }
  });

  it("adds only the selected subject's rules", () => {
    expect(buildSystemPrompt("math")).toContain("SUBJECT: MATH");
    expect(buildSystemPrompt("math")).not.toContain("SUBJECT: SCIENCE");
    expect(buildSystemPrompt("science")).toContain("SUBJECT: SCIENCE");
    expect(buildSystemPrompt("english")).toContain("SUBJECT: ENGLISH");
  });

  it("tells the model to solve math itself and to treat missing points as equal", () => {
    const p = buildSystemPrompt("math");
    expect(p).toContain("Solve every problem yourself");
    expect(p).toContain("equal points per question");
  });

  it("removes the mismatch option entirely once the student confirmed", () => {
    const normal = buildSystemPrompt("math");
    const confirmed = buildSystemPrompt("math", { contextConfirmed: true });
    expect(normal).toContain('{"context_mismatch": {"summary"');
    expect(confirmed).not.toContain('{"context_mismatch": {"summary"');
    expect(confirmed).toContain("the student has confirmed");
    // the rest of the rules are unchanged
    expect(confirmed).toContain("TRUST RULES");
    expect(confirmed).toContain("SUBJECT: MATH");
  });

  it("keeps SYSTEM_PROMPT as the English prompt", () => {
    expect(SYSTEM_PROMPT).toBe(buildSystemPrompt("english"));
  });
});

describe("buildUserPrompt", () => {
  const base = { gradingMaterialsText: "Rubric text", workText: "My essay" };

  it("defaults to English with an unspecified level", () => {
    const u = buildUserPrompt(base);
    expect(u).toContain("Subject (selected by the student): English");
    expect(u).toContain("Student level: not specified");
  });

  it("passes the selected subject and level to the model", () => {
    const u = buildUserPrompt({ ...base, subject: "math", level: "college" });
    expect(u).toContain("Subject (selected by the student): Math");
    expect(u).toContain("Student level: College");
  });

  it("only mentions the confirmation when the student confirmed", () => {
    expect(buildUserPrompt(base)).not.toContain("confirmed that these grading materials");
    expect(buildUserPrompt({ ...base, contextConfirmed: true })).toContain(
      "confirmed that these grading materials",
    );
  });
});

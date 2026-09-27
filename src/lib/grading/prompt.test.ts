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

  it("tells the model not to deduct for citations when not required", () => {
    const u = buildUserPrompt({ ...base, citationStyle: "not_required" });
    expect(u).toContain("not required for this assignment");
    expect(u).toContain("Do NOT deduct for missing citations");
    expect(u).not.toContain("Citation style (student-selected): NOT_REQUIRED");
  });

  it("still passes an explicit citation style normally", () => {
    const u = buildUserPrompt({ ...base, citationStyle: "mla" });
    expect(u).toContain("Citation style (student-selected): MLA");
    expect(u).not.toContain("not required for this assignment");
  });

  it("says nothing about citations when not specified", () => {
    const u = buildUserPrompt({ ...base, citationStyle: "not_specified" });
    expect(u).not.toContain("Citation style");
    expect(u).not.toContain("not required for this assignment");
  });
});

describe("English rubric-priority and grade-jump rules", () => {
  it("tells the model to grade to the rubric's exact wording", () => {
    const p = buildSystemPrompt("english");
    expect(p).toContain("strongest guide for the score and feedback");
    expect(p).toContain("not to a generic idea");
  });

  it("bans promising a specific grade jump and gives safe alternatives", () => {
    const p = buildSystemPrompt("english");
    expect(p).toContain("Never promise a specific grade outcome");
    expect(p).toContain("Fixing this could increase your grade");
  });
});

describe("transparent self-chosen weighting", () => {
  it("tells the model to disclose unequal inferred weights, for every subject", () => {
    for (const subj of ["english", "math", "science"] as const) {
      const p = buildSystemPrompt(subj);
      expect(p).toContain("Be transparent about self-chosen weights");
      expect(p).toContain("Never present a self-chosen weighting as if the rubric specified it");
    }
  });
});

describe("work type in the user prompt", () => {
  const base = { gradingMaterialsText: "Rubric text", workText: "My essay" };
  it("includes the resolved label for the subject", () => {
    const u = buildUserPrompt({ ...base, subject: "science", workType: "lab_report" });
    expect(u).toContain("Type of work (student-selected): Lab report");
  });
  it("says nothing when unspecified or unknown for that subject", () => {
    expect(buildUserPrompt({ ...base, subject: "english", workType: "unspecified" })).not.toContain("Type of work");
    expect(buildUserPrompt({ ...base, subject: "english", workType: "lab_report" })).not.toContain("Type of work");
    expect(buildUserPrompt(base)).not.toContain("Type of work");
  });
});

describe("English citation rules", () => {
  it("warns against flagging valid style variation as an error", () => {
    const p = buildSystemPrompt("english");
    expect(p).toContain("actually violates the rules of the selected style");
    expect(p).toContain("do not flag a valid variation as wrong");
  });

  it("asks for proportional citation deductions, not overshadowing content", () => {
    const p = buildSystemPrompt("english");
    expect(p).toContain("Keep citation and formatting deductions proportional");
    expect(p).toContain("do not let citation formatting nitpicks overshadow");
  });
});

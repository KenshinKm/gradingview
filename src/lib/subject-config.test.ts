import { describe, it, expect } from "vitest";
import { SUBJECT_CONFIG, parseEnabledSubjects } from "./subject-config";
import { SUBJECTS } from "./grading/subjects";

describe("subject config", () => {
  it("has a complete entry for every subject", () => {
    for (const s of SUBJECTS) {
      const c = SUBJECT_CONFIG[s];
      expect(c.key).toBe(s);
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.checks).toHaveLength(5);
      expect(c.teaser.length).toBeGreaterThan(0);
      expect(c.includes).toHaveLength(4);
    }
  });

  it("uses the agreed colors and beta flags", () => {
    expect(SUBJECT_CONFIG.english.color).toBe("#5b8cff");
    expect(SUBJECT_CONFIG.math.color).toBe("#f04438");
    expect(SUBJECT_CONFIG.science.color).toBe("#22d3ee");
    expect(SUBJECT_CONFIG.english.beta).toBe(false);
    expect(SUBJECT_CONFIG.math.beta).toBe(true);
    expect(SUBJECT_CONFIG.science.beta).toBe(true);
  });

  it("makes grading materials optional for Math only", () => {
    expect(SUBJECT_CONFIG.math.materials.optional).toBe(true);
    expect(SUBJECT_CONFIG.english.materials.optional).toBe(false);
    expect(SUBJECT_CONFIG.science.materials.optional).toBe(false);
  });

  it("keeps visible copy free of em-dashes", () => {
    const text = JSON.stringify(SUBJECT_CONFIG.math) + JSON.stringify(SUBJECT_CONFIG.science);
    expect(text).not.toContain("—");
  });
});

describe("parseEnabledSubjects", () => {
  it("is English-only by default", () => {
    expect(parseEnabledSubjects(undefined)).toEqual(["english"]);
    expect(parseEnabledSubjects("")).toEqual(["english"]);
  });
  it("always includes English and enables listed subjects", () => {
    expect(parseEnabledSubjects("math")).toEqual(["english", "math"]);
    expect(parseEnabledSubjects("english, Math , SCIENCE")).toEqual(["english", "math", "science"]);
  });
  it("ignores unknown subjects", () => {
    expect(parseEnabledSubjects("history,math")).toEqual(["english", "math"]);
  });
});

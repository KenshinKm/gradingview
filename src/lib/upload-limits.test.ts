import { describe, it, expect } from "vitest";
import { limitsFor, textLimitError, SUBJECT_LIMITS } from "./upload-limits";
import { parseLevel, parseSubject } from "./grading/subjects";

describe("subject limits", () => {
  it("keeps English at 5+5 files and 150K characters", () => {
    expect(limitsFor("english")).toEqual({ maxMaterialFiles: 5, maxWorkFiles: 5, maxTextChars: 150_000 });
  });
  it("gives Math more work photos but far less text", () => {
    const m = limitsFor("math");
    expect(m.maxWorkFiles).toBeGreaterThan(SUBJECT_LIMITS.english.maxWorkFiles);
    expect(m.maxTextChars).toBeLessThan(SUBJECT_LIMITS.english.maxTextChars);
  });
});

describe("textLimitError", () => {
  it("allows text at or under the limit", () => {
    expect(textLimitError(150_000, 150_000)).toBeNull();
    expect(textLimitError(0, 150_000)).toBeNull();
  });
  it("returns a friendly message over the limit", () => {
    const msg = textLimitError(150_001, 150_000);
    expect(msg).toContain("too much text");
    expect(msg).toContain("150,000");
  });
});

describe("parseSubject / parseLevel", () => {
  it("accepts valid values", () => {
    expect(parseSubject("math")).toBe("math");
    expect(parseSubject("science")).toBe("science");
    expect(parseLevel("college")).toBe("college");
    expect(parseLevel("high_school")).toBe("high_school");
  });
  it("defaults to English and unspecified for anything else", () => {
    expect(parseSubject(null)).toBe("english");
    expect(parseSubject("history")).toBe("english");
    expect(parseLevel("grad_school")).toBe("unspecified");
    expect(parseLevel(undefined)).toBe("unspecified");
  });
});

import { describe, it, expect } from "vitest";
import { effortFor } from "./effort";

describe("effortFor", () => {
  it("uses the defaults", () => {
    expect(effortFor("english", {})).toBeUndefined();
    expect(effortFor("math", {})).toBe("low");
    expect(effortFor("science", {})).toBe("medium");
  });
  it("lets env override per subject and ignores junk", () => {
    expect(effortFor("math", { LLM_EFFORT_MATH: "HIGH" })).toBe("high");
    expect(effortFor("english", { LLM_EFFORT_ENGLISH: "low" })).toBe("low");
    expect(effortFor("science", { LLM_EFFORT_SCIENCE: "off" })).toBe("off");
    expect(effortFor("math", { LLM_EFFORT_MATH: "max" })).toBe("low");
  });
});

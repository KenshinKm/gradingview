import { describe, it, expect } from "vitest";
import { estimateCostUsd } from "./llm-cost";

describe("estimateCostUsd", () => {
  it("prices Sonnet 5 at $2 in / $10 out per million tokens", () => {
    // 100K in = $0.20, 10K out = $0.10
    expect(estimateCostUsd("claude-sonnet-5", { input_tokens: 100_000, output_tokens: 10_000 })).toBeCloseTo(0.3, 6);
  });

  it("prices Opus 5 and Haiku 4.5 from the table", () => {
    expect(estimateCostUsd("claude-opus-5", { input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(5, 6);
    expect(estimateCostUsd("claude-haiku-4-5", { input_tokens: 0, output_tokens: 1_000_000 })).toBeCloseTo(5, 6);
  });

  it("is zero for zero usage", () => {
    expect(estimateCostUsd("claude-sonnet-5", { input_tokens: 0, output_tokens: 0 })).toBe(0);
  });

  it("returns null for models it does not know", () => {
    expect(estimateCostUsd("gpt-4o", { input_tokens: 1000, output_tokens: 1000 })).toBeNull();
  });
});

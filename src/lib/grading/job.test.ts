import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const updates: Array<Record<string, unknown>> = [];
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      update: (row: Record<string, unknown>) => {
        updates.push(row);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

const recordUsage = vi.fn(async () => {});
vi.mock("@/lib/entitlements", () => ({ recordUsage: (...a: unknown[]) => recordUsage(...(a as [])) }));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const gradeSubmission = vi.fn();
vi.mock("./service", () => ({ gradeSubmission: (...a: unknown[]) => gradeSubmission(...a) }));

import { runGradingJob } from "./job";
import { ContextMismatchError, UnreadableImageError } from "./normalize";

const params = {
  attemptId: "a1",
  userId: "u1",
  draftNumber: 1,
  entitlement: { plan: "free" } as never,
  ipHash: "h",
  grade: { gradingMaterialsText: "", workText: "w" },
};

beforeEach(() => {
  updates.length = 0;
  recordUsage.mockClear();
  gradeSubmission.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("runGradingJob", () => {
  it("saves the result and then charges exactly once", async () => {
    gradeSubmission.mockResolvedValue({
      result: { score: 90, letter_grade: "A-", estimated_range_low: 86, estimated_range_high: 93, scoring_basis: "rubric", inferred_rubric: false },
    });
    await runGradingJob(params);
    expect(updates[0]).toMatchObject({ status: "complete", score: 90 });
    expect(recordUsage).toHaveBeenCalledTimes(1);
  });

  it("does not charge when grading throws", async () => {
    gradeSubmission.mockRejectedValue(new Error("boom"));
    await runGradingJob(params);
    expect(recordUsage).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ status: "failed" });
    expect((updates[0].result as { blocked: { code: string } }).blocked.code).toBe("grading_failed");
  });

  it("does not charge on a context mismatch and keeps the details", async () => {
    gradeSubmission.mockRejectedValue(
      new ContextMismatchError({ summary: "Math vs essay", detected: "math", expected: "essay", suggestion: "Check files" }),
    );
    await runGradingJob(params);
    expect(recordUsage).not.toHaveBeenCalled();
    const r = updates[0].result as { blocked: { code: string; mismatch: { summary: string } } };
    expect(r.blocked.code).toBe("context_mismatch");
    expect(r.blocked.mismatch.summary).toBe("Math vs essay");
  });

  it("does not charge for unreadable photos", async () => {
    gradeSubmission.mockRejectedValue(new UnreadableImageError([{ label: "Your work page 2", reason: "blurry" }]));
    await runGradingJob(params);
    expect(recordUsage).not.toHaveBeenCalled();
    expect((updates[0].result as { blocked: { code: string } }).blocked.code).toBe("unreadable_image");
  });

  it("does not charge when the result cannot be saved", async () => {
    gradeSubmission.mockResolvedValue({ result: { score: 80, letter_grade: "B-" } });
    // first update (save) returns an error
    const mod = await import("@/lib/supabase/admin");
    const spy = vi.spyOn(mod, "createSupabaseAdminClient").mockReturnValueOnce({
      from: () => ({ update: () => ({ eq: async () => ({ error: { message: "db down" } }) }) }),
    } as never);
    await runGradingJob(params);
    spy.mockRestore();
    expect(recordUsage).not.toHaveBeenCalled();
  });
});

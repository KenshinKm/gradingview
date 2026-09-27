import { describe, it, expect } from "vitest";
import { parsePartial, partialSignature, isEmptyPartial } from "./partial";

const full = `{"understood": {"subject":"Math","level":"High school","topic":"Quadratics","assignment":"5 question quiz","graded_on":"10 points each"},
"sections": [
 {"name":"Question 1","kind":"short_answer","points_earned":10,"points_possible":10,"scoring_basis":"ai_inferred","feedback":"Correct, with \\"quotes\\" and a } brace."},
 {"name":"Question 2","points_earned":3,"points_possible":10,"feedback":"Sign error."}
],
"things_to_fix": [ {"priority":1,"title":"Sign error","explanation":"x","location":"Q2","suggestion":"Fix it."} ],
"strengths": [ {"title":"Good setup","explanation":"Clear."} ],
"overall_feedback": "Solid work overall.",
"score": 65}`;

describe("parsePartial", () => {
  it("reads everything from a complete answer", () => {
    const p = parsePartial(full);
    expect(p.understood?.topic).toBe("Quadratics");
    expect(p.sections).toHaveLength(2);
    expect(p.sections[0].feedback).toBe('Correct, with "quotes" and a } brace.');
    expect(p.things_to_fix[0].title).toBe("Sign error");
    expect(p.strengths).toHaveLength(1);
    expect(p.overall_feedback).toBe("Solid work overall.");
  });

  it("marks the unfinished item when the text is cut off", () => {
    const cut = full.slice(0, full.indexOf('"Question 2"') + 30);
    const p = parsePartial(cut);
    expect(p.understood).toBeDefined();
    // Question 1 is finished; Question 2 is shown as still being written.
    expect(p.sections.map((x) => x.name)).toEqual(["Question 1", "Question 2"]);
    expect(p.sections[0].writing).toBeUndefined();
    expect(p.sections[1].writing).toBe(true);
    expect(p.things_to_fix).toHaveLength(0);
  });

  it("grows as more text arrives", () => {
    const sizes = [200, 400, 600, full.length].map((n) => partialSignature(parsePartial(full.slice(0, n))));
    expect(new Set(sizes).size).toBeGreaterThan(1);
    expect(sizes[sizes.length - 1].startsWith("1:2:1:1:1")).toBe(true);
  });

  it("returns nothing for empty, non-JSON, or block-only responses", () => {
    expect(isEmptyPartial(parsePartial(""))).toBe(true);
    expect(isEmptyPartial(parsePartial("Sure, here you go"))).toBe(true);
    expect(isEmptyPartial(parsePartial('{"unreadable_images": [{"label":"p1","reason":"blurry"}]}'))).toBe(true);
    expect(isEmptyPartial(parsePartial('{"context_mismatch": {"summary":"x"}}'))).toBe(true);
    expect(isEmptyPartial(parsePartial('{"sections": ['))).toBe(true);
  });

  it("tolerates code fences and skips malformed items", () => {
    const p = parsePartial('```json\n{"sections":[{"name":"A","points_earned":1,"points_possible":2,"feedback":"ok"}, {bad json}, {"name":"B","points_earned":"3","points_possible":4}]');
    expect(p.sections.map((s) => s.name)).toEqual(["A", "B"]);
    expect(p.sections[1].points_earned).toBe(3);
  });

  it("shows the item being written, with text cut off mid-sentence", () => {
    const p = parsePartial('{"sections":[{"name":"Q1","points_earned":10,"points_possible":10,"feedback":"All good."},{"name":"Q2","points_earned":3,"points_possible":10,"feedback":"Sign err');
    expect(p.sections).toHaveLength(2);
    expect(p.sections[0].writing).toBeUndefined();
    expect(p.sections[1].writing).toBe(true);
    expect(p.sections[1].feedback).toBe("Sign err");
    expect(p.sections[1].points_earned).toBe(3);
  });

  it("holds back points until both numbers are written", () => {
    const p = parsePartial('{"sections":[{"name":"Q2","points_earned":3,"points_poss');
    expect(p.sections[0].points_possible).toBe(0);
    expect(p.sections[0].writing).toBe(true);
  });

  it("shows a fix being written", () => {
    const p = parsePartial('{"things_to_fix":[{"priority":1,"title":"Sign error","location":"Q2","explanation":"You dropped the min');
    expect(p.things_to_fix[0]).toMatchObject({ title: "Sign error", location: "Q2", writing: true });
    expect(p.things_to_fix[0].explanation).toBe("You dropped the min");
  });

  it("does not return an unfinished string", () => {
    expect(parsePartial('{"overall_feedback": "Half a sente').overall_feedback).toBeUndefined();
  });
});

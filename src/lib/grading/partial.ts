/**
 * Live results. While the model is still writing its JSON answer we can read
 * the pieces that are already complete (sections, fixes, ...) and show them.
 * Nothing here is final: the grade, letter and range are computed by the
 * server from the finished sections and are never shown from partial text.
 */

export interface PartialSection {
  name: string;
  points_earned: number;
  points_possible: number;
  feedback: string;
}
export interface PartialFix {
  title: string;
  location: string;
  explanation: string;
  suggestion: string;
}
export interface PartialStrength {
  title: string;
  explanation: string;
}
export interface PartialUnderstood {
  subject: string;
  level: string;
  topic: string;
  assignment: string;
  graded_on: string;
}

export interface PartialResult {
  understood?: PartialUnderstood;
  sections: PartialSection[];
  things_to_fix: PartialFix[];
  strengths: PartialStrength[];
  overall_feedback?: string;
}

/** Index just past the `}` or `]` that closes the one opening at `start`, or -1 if not closed yet. */
function findClose(text: string, start: number): number {
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function afterKey(text: string, key: string, opener: string): number {
  const m = new RegExp(`"${key}"\\s*:\\s*\\${opener}`).exec(text);
  return m ? m.index + m[0].length - 1 : -1;
}

/** Fully written objects of a top-level array, in order. Stops at the first unfinished one. */
function completedObjects(text: string, key: string): Record<string, unknown>[] {
  const at = afterKey(text, key, "[");
  if (at < 0) return [];
  const out: Record<string, unknown>[] = [];
  let i = at + 1;
  for (;;) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (text[i] !== "{") break;
    const end = findClose(text, i);
    if (end < 0) break;
    try {
      const v = JSON.parse(text.slice(i, end));
      if (v && typeof v === "object") out.push(v as Record<string, unknown>);
    } catch {
      // skip a malformed item
    }
    i = end;
  }
  return out;
}

function completedObject(text: string, key: string): Record<string, unknown> | null {
  const at = afterKey(text, key, "{");
  if (at < 0) return null;
  const end = findClose(text, at);
  if (end < 0) return null;
  try {
    const v = JSON.parse(text.slice(at, end));
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function completedString(text: string, key: string): string | undefined {
  const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(text);
  if (!m) return undefined;
  const start = m.index + m[0].length - 1;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === '"') {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Reads whatever is complete so far from the model's partial JSON text. */
export function parsePartial(text: string): PartialResult {
  const out: PartialResult = { sections: [], things_to_fix: [], strengths: [] };

  const u = completedObject(text, "understood");
  if (u) {
    out.understood = {
      subject: str(u.subject, 60),
      level: str(u.level, 40),
      topic: str(u.topic, 80),
      assignment: str(u.assignment, 100),
      graded_on: str(u.graded_on, 120),
    };
  }

  for (const s of completedObjects(text, "sections")) {
    const name = str(s.name, 120);
    if (!name) continue;
    out.sections.push({
      name,
      points_earned: num(s.points_earned),
      points_possible: num(s.points_possible),
      feedback: str(s.feedback, 400),
    });
  }

  for (const f of completedObjects(text, "things_to_fix")) {
    const title = str(f.title, 120);
    if (!title) continue;
    out.things_to_fix.push({
      title,
      location: str(f.location, 100),
      explanation: str(f.explanation, 400),
      suggestion: str(f.suggestion, 400),
    });
  }

  for (const s of completedObjects(text, "strengths")) {
    const title = str(s.title, 120);
    if (!title) continue;
    out.strengths.push({ title, explanation: str(s.explanation, 300) });
  }

  const overall = completedString(text, "overall_feedback");
  if (overall) out.overall_feedback = overall.trim().slice(0, 800);

  return out;
}

/** Cheap fingerprint so we only save when something new appeared. */
export function partialSignature(p: PartialResult): string {
  return [
    p.understood ? 1 : 0,
    p.sections.length,
    p.things_to_fix.length,
    p.strengths.length,
    p.overall_feedback ? 1 : 0,
  ].join(":");
}

export function isEmptyPartial(p: PartialResult): boolean {
  return partialSignature(p) === "0:0:0:0:0";
}

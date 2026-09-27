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
  /** True while the AI is still writing this item. */
  writing?: boolean;
}
export interface PartialFix {
  title: string;
  location: string;
  explanation: string;
  suggestion: string;
  writing?: boolean;
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

/**
 * Fields of an object that is still being written. Strings may be cut off
 * mid-sentence; numbers only count once the next character shows they're done.
 */
function looseFields(chunk: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const strRe = /"([a-z_]+)"\s*:\s*"((?:[^"\\]|\\.)*)("?)/g;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(chunk))) {
    let v = m[2];
    if (!m[3]) v = v.replace(/\\$/, ""); // drop a dangling backslash
    try {
      out[m[1]] = JSON.parse(`"${v}"`);
    } catch {
      out[m[1]] = v.replace(/\\"/g, '"').replace(/\\n/g, " ");
    }
  }
  const numRe = /"([a-z_]+)"\s*:\s*(-?\d+(?:\.\d+)?)\s*[,}]/g;
  while ((m = numRe.exec(chunk))) out[m[1]] = Number(m[2]);
  return out;
}

/** Fully written objects of a top-level array, in order. Stops at the first unfinished one. */
function completedObjects(text: string, key: string): Record<string, unknown>[] {
  return scanObjects(text, key).done;
}

/** Same, plus the fields of the one object that is still being written (if any). */
function scanObjects(
  text: string,
  key: string,
): { done: Record<string, unknown>[]; current: Record<string, unknown> | null } {
  const at = afterKey(text, key, "[");
  if (at < 0) return { done: [], current: null };
  const out: Record<string, unknown>[] = [];
  let i = at + 1;
  for (;;) {
    while (i < text.length && /[\s,]/.test(text[i])) i++;
    if (text[i] !== "{") break;
    const end = findClose(text, i);
    if (end < 0) return { done: out, current: looseFields(text.slice(i)) };
    try {
      const v = JSON.parse(text.slice(i, end));
      if (v && typeof v === "object") out.push(v as Record<string, unknown>);
    } catch {
      // skip a malformed item
    }
    i = end;
  }
  return { done: out, current: null };
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

  const secs = scanObjects(text, "sections");
  for (const s of [...secs.done, ...(secs.current ? [secs.current] : [])]) {
    const name = str(s.name, 120);
    if (!name) continue;
    const isCurrent = s === secs.current;
    // A section still being written shows its points only once both are known.
    const hasPoints = s.points_earned !== undefined && s.points_possible !== undefined;
    out.sections.push({
      name,
      points_earned: hasPoints ? num(s.points_earned) : 0,
      points_possible: hasPoints ? num(s.points_possible) : 0,
      feedback: str(s.feedback, 400),
      ...(isCurrent ? { writing: true } : {}),
    });
  }

  const fixes = scanObjects(text, "things_to_fix");
  for (const f of [...fixes.done, ...(fixes.current ? [fixes.current] : [])]) {
    const title = str(f.title, 120);
    if (!title) continue;
    out.things_to_fix.push({
      title,
      location: str(f.location, 100),
      explanation: str(f.explanation, 400),
      suggestion: str(f.suggestion, 400),
      ...(f === fixes.current ? { writing: true } : {}),
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
  const last = p.sections[p.sections.length - 1];
  const lastFix = p.things_to_fix[p.things_to_fix.length - 1];
  // Text growth of the item being written, in steps of ~25 characters.
  const growth =
    Math.floor(((last?.feedback.length ?? 0) + (lastFix ? lastFix.explanation.length + lastFix.suggestion.length : 0)) / 25);
  return [
    p.understood ? 1 : 0,
    p.sections.length,
    p.things_to_fix.length,
    p.strengths.length,
    p.overall_feedback ? 1 : 0,
    growth,
  ].join(":");
}

export function isEmptyPartial(p: PartialResult): boolean {
  return !p.understood && p.sections.length === 0 && p.things_to_fix.length === 0 && p.strengths.length === 0;
}

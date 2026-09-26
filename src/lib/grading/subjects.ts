export const SUBJECTS = ["english", "math", "science"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const LEVELS = ["high_school", "college", "unspecified"] as const;
export type Level = (typeof LEVELS)[number];

export const SUBJECT_LABEL: Record<Subject, string> = {
  english: "English",
  math: "Math",
  science: "Science",
};

export const LEVEL_LABEL: Record<Level, string> = {
  high_school: "High school",
  college: "College",
  unspecified: "Not specified",
};

/** Unknown or missing values fall back to English, the default subject. */
export function parseSubject(v: unknown): Subject {
  return (SUBJECTS as readonly string[]).includes(v as string) ? (v as Subject) : "english";
}

export function parseLevel(v: unknown): Level {
  return (LEVELS as readonly string[]).includes(v as string) ? (v as Level) : "unspecified";
}

import { SUBJECTS, type Subject } from "@/lib/grading/subjects";

/**
 * Everything that differs between the English, Math and Science pages: copy,
 * accent color, what the form asks for. Pure data, safe for server and client.
 */

export type OptionKey = "partialCredit" | "calculatorAllowed" | "checkUnits" | "checkCalculations";

export interface SubjectConfig {
  key: Subject;
  name: string;
  path: string;
  /** Accent color for the subject name (tab, label, headings). */
  color: string;
  beta: boolean;
  metaTitle: string;
  metaDescription: string;
  sub: string;
  blurb: string;
  stats: Array<[label: string, value: string]>;
  includes: string[];
  materials: { desc: string; chips: string[]; tip: string; optional: boolean; optionalNote?: string };
  work: { desc: string; tip: string; placeholder: string };
  hint: string;
  checks: Array<{ title: string; desc: string }>;
  teaser: Array<{ title: string; location: string; why: string; fix: string }>;
  fields: { topic: boolean; totalPoints: boolean; citation: boolean };
  toggles: Array<{ key: OptionKey; label: string }>;
  /** "Type of work" dropdown options for this subject. First entry is always the "unspecified" default. */
  workTypes: Array<[value: string, label: string]>;
}

const UNSPECIFIED: [string, string] = ["unspecified", "Not sure / mixed"];

const HINT = "PDF · DOCX · TXT · JPG · PNG · HEIC, multiple files & photos";

export const SUBJECT_CONFIG: Record<Subject, SubjectConfig> = {
  english: {
    key: "english",
    name: "English",
    path: "/",
    color: "#5b8cff",
    beta: false,
    metaTitle: "GradingView — Know Your Grade Before You Submit",
    metaDescription:
      "Upload your rubric and your essay to get an AI-powered estimated grade, rubric breakdown, and actionable feedback before you submit.",
    sub: "Upload your rubric and your essay. See your estimated grade, where you lost points, and what to fix first.",
    blurb:
      "Built for essays, literary analysis, research papers, and written responses. Feedback is tied to your rubric and your teacher's instructions.",
    stats: [
      ["Works with", "DOCX · PDF · photos"],
      ["Handles", "essays · analysis · research"],
      ["Answer in", "~30 seconds"],
    ],
    includes: [
      "Your estimated grade and likely range",
      "Points lost, by rubric category",
      "Fixes ranked by how much they matter",
      "A re-grade after you revise",
    ],
    materials: {
      desc: "Upload anything that explains how your essay will be graded.",
      chips: ["rubric", "assignment prompt", "MLA / APA requirements", "grading instructions", "word count"],
      tip: "Taking a photo? Make sure the whole page is visible, in focus, and well-lit for the most accurate grade.",
      optional: false,
    },
    work: {
      desc: "Upload your completed essay, analysis, or written response. Multiple pages and photos are fine, just keep them in order.",
      tip: "Handwritten? Photograph each page flat, in good light, and keep the pages in order.",
      placeholder: "Paste your essay or written response here…",
    },
    hint: HINT,
    checks: [
      { title: "Thesis & argument", desc: "Is your claim clear, arguable, and supported?" },
      { title: "Evidence & quotes", desc: "Do quotes support your points, with citations?" },
      { title: "Analysis", desc: "Do you explain why the evidence matters?" },
      { title: "Organization", desc: "Does each paragraph build on the last?" },
      { title: "Style & conventions", desc: "Grammar, tone, and MLA / APA formatting." },
    ],
    teaser: [
      {
        title: "Thesis doesn't take a stance",
        location: "Paragraph 1",
        why: "Your claim describes the symbols instead of arguing what they mean.",
        fix: "Rewrite it as one arguable sentence about what the green light shows.",
      },
      {
        title: "Quotes aren't analyzed",
        location: "Paragraphs 2 to 3",
        why: "Two quotes are dropped in with no explanation.",
        fix: "Follow each quote with one or two sentences tying it to your claim.",
      },
    ],
    fields: { topic: false, totalPoints: false, citation: true },
    toggles: [],
    workTypes: [
      UNSPECIFIED,
      ["essay", "Essay"],
      ["written_assignment", "Written assignment"],
      ["short_answer", "Short answer"],
      ["long_answer", "Long answer"],
      ["research_paper", "Research paper"],
    ],
  },

  math: {
    key: "math",
    name: "Math",
    path: "/math",
    color: "#f04438",
    beta: true,
    metaTitle: "Math",
    metaDescription:
      "Photograph your math test or homework and get an estimated grade with step-by-step credit before you submit.",
    sub: "Photograph your test or homework. See step-by-step credit, where you lost points, and what to fix first.",
    blurb:
      "Your paper already has the questions, so grading materials are optional. GradingView solves each problem itself, checks the math, and grades your steps, with partial credit for correct methods.",
    stats: [
      ["Works with", "photos · PDF · typed"],
      ["Handles", "quizzes · tests · homework"],
      ["Shows", "the step you slipped on"],
    ],
    includes: [
      "Your estimated grade and likely range",
      "Points lost by problem, with partial credit",
      "Feedback on the exact question and step",
      "A re-grade after you correct them",
    ],
    materials: {
      desc: "Add point values, partial credit rules, or teacher instructions for a more accurate grade. Skip it if your test already shows the points.",
      chips: ["point values", "partial credit rules", "teacher instructions", "formula sheet"],
      tip: "Have a photo of the grading rules or a point breakdown? Add it here. Otherwise skip this section.",
      optional: true,
      optionalNote:
        "No grading materials? We assume equal points per question unless your paper shows them. Your result will say so and show a wider likely range.",
    },
    work: {
      desc: "Snap photos of your worked problems or upload a scan. Show every step so we can give partial credit.",
      tip: "Keep one full page in frame, write dark and clear, and circle your final answers.",
      placeholder: "Type or paste your worked problems here…",
    },
    hint: "JPG · PNG · HEIC · PDF · DOCX · TXT, multiple pages or photos",
    checks: [
      { title: "Correct answers", desc: "Solved and verified by GradingView." },
      { title: "Setup & method", desc: "Did you choose and apply the right approach?" },
      { title: "Work shown", desc: "Every step is read, not just the answer." },
      { title: "Notation & simplifying", desc: "Signs, fractions, radicals, and units." },
      { title: "Partial credit", desc: "Credit for right method with a small slip." },
    ],
    teaser: [
      {
        title: "Sign error when c is negative",
        location: "Questions 5, 6",
        why: "You wrote −4ac as −28 instead of +28 when c = −7, which changed both roots.",
        fix: "Substitute inside parentheses first, then simplify.",
      },
      {
        title: "Balance both sides",
        location: "Question 8",
        why: "You added 9 to the left side when completing the square, but not the right.",
        fix: "Whatever you add to one side, add to the other.",
      },
    ],
    fields: { topic: true, totalPoints: true, citation: false },
    toggles: [
      { key: "partialCredit", label: "Give partial credit for correct methods" },
      { key: "calculatorAllowed", label: "Calculator allowed" },
    ],
    workTypes: [
      UNSPECIFIED,
      ["homework", "Homework"],
      ["worksheet", "Worksheet"],
      ["quiz", "Quiz"],
      ["test", "Test / exam"],
      ["practice_test", "Practice test"],
      ["word_problems", "Word problems"],
    ],
  },

  science: {
    key: "science",
    name: "Science",
    path: "/science",
    color: "#22d3ee",
    beta: true,
    metaTitle: "Science",
    metaDescription:
      "Upload your lab report, problem set, or short answers and get an estimated grade before you submit.",
    sub: "Upload your report, problem set, or worksheet. See your estimated grade, where you lost points, and what to fix first.",
    blurb:
      "Built for lab reports, problem sets, worksheets, and short answers across biology, chemistry, and physics. Grading materials are optional, a quick worksheet is fine on its own. Feedback covers your reasoning, your data, and your calculations.",
    stats: [
      ["Works with", "DOCX · PDF · photos"],
      ["Handles", "labs · problem sets · short answers"],
      ["Checks", "units · data · graphs"],
    ],
    includes: [
      "Your estimated grade and likely range",
      "Points lost, by lab report section",
      "Feedback on your data, calculations, and conclusions",
      "A re-grade after you revise",
    ],
    materials: {
      desc: "Add a rubric, handout, or grading instructions for a more accurate grade. Skip it for a quick worksheet with the questions right there.",
      chips: ["lab rubric", "lab handout", "report requirements", "data tables", "grading instructions"],
      tip: "Have a photo of the rubric or grading instructions? Add it here. Otherwise skip this section.",
      optional: true,
      optionalNote:
        "No grading materials? We assume equal points per question or section unless your paper shows them. Your result will say so and show a wider likely range.",
    },
    work: {
      desc: "Upload your lab report, problem set, worksheet, or short answers. Include graphs and data tables in the file or as photos.",
      tip: "Photographing a graph or data table? Keep the axes, labels, and units fully in frame.",
      placeholder: "Paste your lab report, worksheet answers, or written responses here…",
    },
    hint: HINT,
    checks: [
      { title: "Hypothesis & purpose", desc: "Testable, specific, and explained." },
      { title: "Data & graphs", desc: "Tables, labels, units, and clear figures." },
      { title: "Calculations & units", desc: "Math, significant figures, and units." },
      { title: "Analysis & conclusion", desc: "Do your claims match your data?" },
      { title: "Scientific writing", desc: "Method, terminology, and format." },
    ],
    teaser: [
      {
        title: "Graph is missing axis labels",
        location: "Figure 1",
        why: "The axes have no titles or units, so the trend can't be read on its own.",
        fix: "Label the y-axis 'Reaction rate (mL O₂/min)' and the x-axis 'Temperature (°C)'.",
      },
      {
        title: "Conclusion cites no numbers",
        location: "Conclusion",
        why: "You say rate increased with temperature but give no values.",
        fix: "Quote the rates at 20°C and 40°C and compare them.",
      },
    ],
    fields: { topic: true, totalPoints: false, citation: false },
    toggles: [
      { key: "checkUnits", label: "Check units and significant figures" },
      { key: "checkCalculations", label: "Check calculations" },
    ],
    workTypes: [
      UNSPECIFIED,
      ["lab_report", "Lab report"],
      ["problem_set", "Problem set"],
      ["worksheet", "Worksheet"],
      ["quiz", "Quiz"],
      ["test", "Test / exam"],
      ["short_answer", "Short answer"],
    ],
  },
};

/**
 * Subjects visible to students. English is always on. Math and Science ship
 * dark and are switched on with NEXT_PUBLIC_ENABLED_SUBJECTS="english,math,science"
 * once their safety nets are ready.
 */
export function parseEnabledSubjects(raw: string | undefined): Subject[] {
  const wanted = new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return SUBJECTS.filter((s) => s === "english" || wanted.has(s));
}

export function enabledSubjects(): Subject[] {
  return parseEnabledSubjects(process.env.NEXT_PUBLIC_ENABLED_SUBJECTS);
}

export function isSubjectEnabled(subject: Subject): boolean {
  return enabledSubjects().includes(subject);
}

/** Human label for a "Type of work" code, or null when unspecified/unknown. */
export function workTypeLabel(subject: Subject, code: string | null | undefined): string | null {
  if (!code || code === "unspecified") return null;
  const found = SUBJECT_CONFIG[subject].workTypes.find(([v]) => v === code);
  return found ? found[1] : null;
}

/** Beta reports go to support by email until there is an in-app report flow. */
export const REPORT_EMAIL = "support@grading-view.com";

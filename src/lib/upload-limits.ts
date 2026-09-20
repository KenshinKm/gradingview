/**
 * Max files a user can attach per section (grading materials / your work) in
 * a single grading request. Keeps a single pathological upload from blowing
 * up LLM cost — enforced both in the uploader UI and, authoritatively, in
 * the /api/grade route. Pasted/typed text has no such limit.
 */
export const MAX_FILES_PER_SECTION = 5;

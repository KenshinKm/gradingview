import type { GradeResult, ScoringBasis } from "@/lib/grading/schema";

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  course: string | null;
  work_type: string;
  citation_style: string;
  grading_materials_text: string;
  created_at: string;
  updated_at: string;
}

export interface GradingAttempt {
  id: string;
  assignment_id: string;
  user_id: string;
  draft_number: number;
  work_text: string;
  status: "pending" | "processing" | "complete" | "failed";
  score: number | null;
  letter_grade: string | null;
  estimated_range_low: number | null;
  estimated_range_high: number | null;
  scoring_basis: ScoringBasis | null;
  result: GradeResult | null;
  error_message: string | null;
  inferred_rubric: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface AssignmentWithAttempts extends Assignment {
  grading_attempts: GradingAttempt[];
}

export interface SubmissionFile {
  id: string;
  role: "grading_material" | "work";
  sort_order: number;
  original_name: string;
  mime_type: string;
  storage_path: string;
  extraction_status: "pending" | "extracted" | "failed";
  created_at: string;
}

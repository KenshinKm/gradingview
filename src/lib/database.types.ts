// Generated from the live Supabase schema (bysirakuutreavgocuqh).
// Regenerate with: supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
// The app's hand-written domain types live in src/lib/types.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          citation_style: string
          course: string | null
          created_at: string
          grading_materials_text: string
          id: string
          title: string
          updated_at: string
          user_id: string
          work_type: string
        }
        Insert: {
          citation_style?: string
          course?: string | null
          created_at?: string
          grading_materials_text?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
          work_type?: string
        }
        Update: {
          citation_style?: string
          course?: string | null
          created_at?: string
          grading_materials_text?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          work_type?: string
        }
        Relationships: []
      }
      grading_attempts: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          draft_number: number
          error_message: string | null
          estimated_range_high: number | null
          estimated_range_low: number | null
          id: string
          inferred_rubric: boolean
          letter_grade: string | null
          result: Json | null
          score: number | null
          scoring_basis: string | null
          status: string
          user_id: string
          work_text: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          draft_number?: number
          error_message?: string | null
          estimated_range_high?: number | null
          estimated_range_low?: number | null
          id?: string
          inferred_rubric?: boolean
          letter_grade?: string | null
          result?: Json | null
          score?: number | null
          scoring_basis?: string | null
          status?: string
          user_id: string
          work_text?: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          draft_number?: number
          error_message?: string | null
          estimated_range_high?: number | null
          estimated_range_low?: number | null
          id?: string
          inferred_rubric?: boolean
          letter_grade?: string | null
          result?: Json | null
          score?: number | null
          scoring_basis?: string | null
          status?: string
          user_id?: string
          work_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          free_grade_used: boolean
          full_name: string | null
          id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          free_grade_used?: boolean
          full_name?: string | null
          id: string
          plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          free_grade_used?: boolean
          full_name?: string | null
          id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      submission_files: {
        Row: {
          assignment_id: string | null
          created_at: string
          extracted_text: string | null
          extraction_status: string
          grading_attempt_id: string | null
          id: string
          mime_type: string
          original_name: string
          role: string
          size_bytes: number
          sort_order: number
          storage_path: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string
          grading_attempt_id?: string | null
          id?: string
          mime_type: string
          original_name: string
          role: string
          size_bytes?: number
          sort_order?: number
          storage_path: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string
          grading_attempt_id?: string | null
          id?: string
          mime_type?: string
          original_name?: string
          role?: string
          size_bytes?: number
          sort_order?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_files_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_files_grading_attempt_id_fkey"
            columns: ["grading_attempt_id"]
            isOneToOne: false
            referencedRelation: "grading_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          grading_attempt_id: string | null
          id: string
          period_end: string | null
          period_start: string | null
          plan: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          grading_attempt_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          grading_attempt_id?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_grading_attempt_id_fkey"
            columns: ["grading_attempt_id"]
            isOneToOne: false
            referencedRelation: "grading_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

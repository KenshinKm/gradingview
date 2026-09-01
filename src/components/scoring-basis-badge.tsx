import type { ScoringBasis } from "@/lib/grading/schema";

const LABELS: Record<ScoringBasis, { label: string; cls: string }> = {
  rubric: {
    label: "Rubric-backed",
    cls: "bg-emerald-500/10 text-emerald-300",
  },
  answer_key: {
    label: "Answer-key-backed",
    cls: "bg-emerald-500/10 text-emerald-300",
  },
  ai_inferred: {
    label: "AI-inferred scoring",
    cls: "bg-amber-500/10 text-amber-300",
  },
  mixed: {
    label: "Mixed basis",
    cls: "bg-brand-50 text-brand-700",
  },
};

export function ScoringBasisBadge({
  basis,
  small = false,
}: {
  basis: ScoringBasis | null | undefined;
  small?: boolean;
}) {
  const meta = LABELS[basis ?? "ai_inferred"] ?? LABELS.ai_inferred;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${meta.cls} ${
        small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      {meta.label}
    </span>
  );
}

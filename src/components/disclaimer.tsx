import { DISCLAIMER } from "@/lib/grading/schema";

export function Disclaimer({
  text,
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <p className={`text-xs leading-relaxed text-ink-muted ${className}`}>
      {text ?? DISCLAIMER}
    </p>
  );
}

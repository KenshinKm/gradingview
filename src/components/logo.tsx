import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
        G
      </span>
      <span className="text-lg tracking-tight text-ink">GradingView</span>
    </Link>
  );
}

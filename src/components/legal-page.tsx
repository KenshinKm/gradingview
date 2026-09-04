import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex-1 py-12">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="btn-ghost -ml-2 mb-4">
            ← Back to home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted">Last updated {updated}</p>

          <div className="legal-copy mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function LSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-ink">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

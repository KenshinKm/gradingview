import Link from "next/link";
import { Logo } from "./logo";
import { SubjectTabs } from "./subject-tabs";
import { getSessionUser } from "@/lib/supabase/server";
import { enabledSubjects } from "@/lib/subject-config";

export async function SiteHeader() {
  const user = await getSessionUser();
  const subjects = enabledSubjects();
  const multi = subjects.length > 1;

  return (
    <header className="border-b border-line">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        {multi && <SubjectTabs subjects={subjects} className="hidden md:flex" />}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className="btn-ghost">
            Pricing
          </Link>
          {user ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn-secondary">
              Log in
            </Link>
          )}
        </nav>
      </div>
      {multi && (
        <div className="container-page overflow-x-auto pb-3 md:hidden">
          <SubjectTabs subjects={subjects} />
        </div>
      )}
    </header>
  );
}

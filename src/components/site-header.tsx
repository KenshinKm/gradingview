import Link from "next/link";
import { Logo } from "./logo";
import { getSessionUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-slate-100">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className="btn-ghost">
            Pricing
          </Link>
          {user ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/login?mode=signup" className="btn-primary">
                Grade My Work Free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

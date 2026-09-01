import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container-page flex h-16 items-center">
        <Logo />
      </div>
      <main className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="card">Loading…</div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-xs text-ink-muted">
            By continuing you agree that GradingView provides an AI-generated
            estimate, not a guaranteed grade.
          </p>
          <p className="mt-4 text-center text-sm text-ink-muted">
            <Link href="/" className="hover:text-ink">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

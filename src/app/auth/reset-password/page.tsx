import Link from "next/link";
import { Logo } from "@/components/logo";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getSessionUser } from "@/lib/supabase/server";

export const metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  // Reached only via the emailed recovery link, which /auth/callback exchanges
  // for a session before redirecting here. No session means an invalid,
  // expired, or already-used link — not an error, just ask them to try again.
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container-page flex h-16 items-center">
        <Logo />
      </div>
      <main className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="card">
            {user ? (
              <ResetPasswordForm />
            ) : (
              <div className="text-center">
                <h2 className="text-lg font-semibold text-ink">Link expired</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  This password reset link is invalid or has expired. Request a new
                  one from the log in page.
                </p>
                <Link href="/login" className="btn-primary mt-4">
                  Back to log in
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

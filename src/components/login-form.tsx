"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const hasAuthError = params.get("error") === "auth";

  return (
    <div className="card">
      {hasAuthError && (
        <p className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          That link expired or was already used. Try again below.
        </p>
      )}
      <AuthPanel
        defaultMode={mode}
        redirectTo={redirectTo}
        heading={mode === "signup" ? "Create your free account" : "Welcome back"}
        sub={
          mode === "signup"
            ? "Your first full grade is free. No card required."
            : "Log in to grade and track your drafts."
        }
        onAuthed={() => {
          router.push(redirectTo);
          router.refresh();
        }}
      />
    </div>
  );
}

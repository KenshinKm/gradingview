"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/lib/env";

type Mode = "signup" | "login";
type Method = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "signup" ? "signup" : "login",
  );
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (method === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
        });
        if (error) throw error;
        setSent(true);
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
        });
        if (error) throw error;
        track("account_created", { method: "password" });
        // If email confirmation is disabled, a session exists immediately.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
          return;
        }
        setSent(true);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-semibold text-ink">Check your email</h1>
        <p className="mt-2 text-sm text-ink-soft">
          We sent a link to <strong>{email}</strong>. Click it to{" "}
          {mode === "signup" ? "finish creating your account" : "sign in"}.
        </p>
        <button
          className="btn-ghost mt-4"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {mode === "signup" ? "Create your free account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {mode === "signup"
            ? "Your first full grade is free. No card required."
            : "Log in to grade and track your drafts."}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {method === "password" && (
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy
          ? "Please wait…"
          : method === "magic"
            ? "Email me a login link"
            : mode === "signup"
              ? "Create account"
              : "Log in"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-brand-600 hover:underline"
          onClick={() => setMethod(method === "password" ? "magic" : "password")}
        >
          {method === "password" ? "Use a magic link instead" : "Use a password instead"}
        </button>
        <button
          type="button"
          className="text-ink-muted hover:text-ink"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        >
          {mode === "signup" ? "I have an account" : "Create an account"}
        </button>
      </div>
    </form>
  );
}

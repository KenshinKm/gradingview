"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { SITE_URL } from "@/lib/env";

type Mode = "signup" | "login";
type Method = "password" | "magic";

export interface AuthPanelProps {
  defaultMode?: Mode;
  heading?: string;
  sub?: string;
  /** Where the magic-link email should land the user. */
  redirectTo?: string;
  /**
   * Called once a real session exists (password signup with confirmation off,
   * or successful login). Magic-link flows can't call this — they show the
   * "check your email" state instead.
   */
  onAuthed: () => void;
}

export function AuthPanel({
  defaultMode = "signup",
  heading,
  sub,
  redirectTo = "/dashboard",
  onAuthed,
}: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = createSupabaseBrowserClient();
  const emailRedirect = `${SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (method === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: emailRedirect },
        });
        if (error) throw error;
        setSent(true);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: emailRedirect },
        });

        // signUp returns a session immediately when email confirmation is off.
        if (!error && data.session) {
          track("account_created", { method: "password" });
          onAuthed();
          return;
        }

        // No session yet — the account may still have been created (e.g. the
        // built-in confirmation email was rate-limited, but the row exists and
        // is auto-confirmed). Try to sign in with the same credentials.
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (!signIn.error && signIn.data.session) {
          track("account_created", { method: "password" });
          onAuthed();
          return;
        }

        // Genuinely needs email confirmation.
        if (!error) {
          setSent(true);
          return;
        }
        throw error;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error("Could not start a session. Try again.");
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-ink">Check your email</h2>
        <p className="mt-2 text-sm text-ink-soft">
          We sent a link to <strong className="text-ink">{email}</strong>. Open it to{" "}
          {mode === "signup" ? "finish creating your account" : "sign in"}, then come
          back to this tab.
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
    <form onSubmit={submit} className="space-y-4">
      {(heading || sub) && (
        <div>
          {heading && (
            <h2 className="text-lg font-semibold text-ink">{heading}</h2>
          )}
          {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
        </div>
      )}

      <div>
        <label className="label" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
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
          <label className="label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
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
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy
          ? "Please wait…"
          : method === "magic"
            ? "Email me a login link"
            : mode === "signup"
              ? "Create account & see my grade"
              : "Log in"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-brand-600 hover:text-brand-500"
          onClick={() => setMethod(method === "password" ? "magic" : "password")}
        >
          {method === "password" ? "Use a magic link" : "Use a password"}
        </button>
        <button
          type="button"
          className="text-ink-muted hover:text-ink"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
        >
          {mode === "signup" ? "I already have an account" : "Create an account"}
        </button>
      </div>
    </form>
  );
}

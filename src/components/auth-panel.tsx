"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { trackTikTok } from "@/lib/tiktok-client";
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
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const supabase = createSupabaseBrowserClient();
  const emailRedirect = `${SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
  const resetRedirect = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirect,
      });
      if (error) throw error;
      track("password_reset_requested");
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

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
          trackTikTok("CompleteRegistration");
          onAuthed();
          return;
        }

        // Supabase returns an obfuscated user with no identities when the email
        // is already registered. Send them to log in instead of "check email".
        if (!error && data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode("login");
          setError(
            "You already have an account with this email — enter your password to log in.",
          );
          return;
        }

        // No session yet — the account may still have been created (e.g. the
        // built-in confirmation email was rate-limited, but the row exists and
        // is auto-confirmed). Try to sign in with the same credentials.
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        if (!signIn.error && signIn.data.session) {
          track("account_created", { method: "password" });
          trackTikTok("CompleteRegistration");
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

  if (forgotSent) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-semibold text-ink">Check your email</h2>
        <p className="mt-2 text-sm text-ink-soft">
          If there&apos;s an account for <strong className="text-ink">{email}</strong>,
          we sent a link to reset your password.
        </p>
        <button
          className="btn-ghost mt-4"
          onClick={() => {
            setForgot(false);
            setForgotSent(false);
            setError(null);
          }}
        >
          Back to log in
        </button>
      </div>
    );
  }

  if (forgot) {
    return (
      <form onSubmit={submitForgot} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Reset your password</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Please wait…" : "Send reset link"}
        </button>

        <button
          type="button"
          className="w-full text-center text-sm text-ink-muted hover:text-ink"
          onClick={() => {
            setForgot(false);
            setError(null);
          }}
        >
          Back to log in
        </button>
      </form>
    );
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
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="auth-password">
              Password
            </label>
            {mode === "login" && (
              <button
                type="button"
                className="mb-1.5 text-xs text-ink-muted hover:text-ink"
                onClick={() => {
                  setForgot(true);
                  setError(null);
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
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

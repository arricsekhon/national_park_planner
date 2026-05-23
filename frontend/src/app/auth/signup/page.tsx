"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthIcon } from "../AuthIcon";
import { AuthShell } from "../AuthShell";
import { GoogleAuthButton } from "../GoogleAuthButton";
import { useAuth } from "@/lib/auth";

export default function SignUpPage() {
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const nameId = "signup-name";
  const emailId = "signup-email";
  const passwordId = "signup-password";
  const confirmId = "signup-confirm";
  const rulesId = "signup-password-rules";
  const errorId = "signup-error";

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const passwordLongEnough = password.length >= 6;
  const passwordsMatch = confirm.length === 0 || password === confirm;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!passwordLongEnough) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUp(name.trim(), email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign up failed.");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start planning with TrailQuest"
      description="Save routes, compare parks, and keep a journal tied to your park visits."
      visualTitle="Build a better park habit."
      visualDescription="Turn scattered park ideas into a route, a packing list, and a trail archive you can return to after every trip."
      visualVariant="starting"
      stats={[
        { value: "400+", label: "Parks" },
        { value: "Free", label: "Account" },
        { value: "Local", label: "Saved" },
      ]}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-semibold transition hover:opacity-70" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <GoogleAuthButton loading={googleLoading} onClick={handleGoogleSignUp} mode="signup" />

        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
          <span className="h-px flex-1" style={{ background: "var(--line)" }} />
          or use email
          <span className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>

        <div>
          <label htmlFor={nameId} className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            Full name
          </label>
          <span className="group relative mt-2 block">
            <AuthIcon name="user" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              id={nameId}
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Smith"
              aria-invalid={error === "Enter your full name."}
              aria-describedby={error ? errorId : undefined}
              className="w-full rounded-lg border py-3.5 pl-10 pr-3 text-sm font-medium outline-none transition"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "linear-gradient(180deg,#fff,#fbfbf8)" }}
            />
          </span>
        </div>

        <div>
          <label htmlFor={emailId} className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            Email address
          </label>
          <span className="group relative mt-2 block">
            <AuthIcon name="mail" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(error && error !== "Enter your full name." && !error.includes("Password"))}
              aria-describedby={error ? errorId : undefined}
              className="w-full rounded-lg border py-3.5 pl-10 pr-3 text-sm font-medium outline-none transition"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "linear-gradient(180deg,#fff,#fbfbf8)" }}
            />
          </span>
        </div>

        <div>
          <label htmlFor={passwordId} className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            Password
          </label>
          <span className="group relative mt-2 block">
            <AuthIcon name="lock" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              aria-invalid={Boolean(password && !passwordLongEnough)}
              aria-describedby={`${rulesId}${error ? ` ${errorId}` : ""}`}
              className="w-full rounded-lg border py-3.5 pl-10 pr-12 text-sm font-medium outline-none transition"
              style={{
                borderColor: password && !passwordLongEnough ? "rgba(185,28,28,0.36)" : "var(--line)",
                color: "var(--ink)",
                background: "linear-gradient(180deg,#fff,#fbfbf8)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md transition hover:bg-stone-100"
              style={{ color: "var(--muted)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <AuthIcon name={showPassword ? "eyeOff" : "eye"} className="h-4 w-4" />
            </button>
          </span>
        </div>

        <div>
          <label htmlFor={confirmId} className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            Confirm password
          </label>
          <span className="group relative mt-2 block">
            <AuthIcon name="shield" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              id={confirmId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat password"
              aria-invalid={Boolean(confirm && !passwordsMatch)}
              aria-describedby={`${rulesId}${error ? ` ${errorId}` : ""}`}
              className="w-full rounded-lg border py-3.5 pl-10 pr-3 text-sm font-medium outline-none transition"
              style={{
                borderColor: confirm && !passwordsMatch ? "rgba(185,28,28,0.36)" : "var(--line)",
                color: "var(--ink)",
                background: "linear-gradient(180deg,#fff,#fbfbf8)",
              }}
            />
          </span>
        </div>

        <div id={rulesId} aria-live="polite" className="grid gap-2 rounded-lg border p-3" style={{ borderColor: "rgba(23,109,101,0.14)", background: "linear-gradient(180deg,var(--surface),#fff)" }}>
          <PasswordRule active={passwordLongEnough} label="At least 6 characters" />
          <PasswordRule active={Boolean(confirm) && password === confirm} label="Passwords match" muted={!confirm} />
        </div>

        {error && (
          <div id={errorId} role="alert" className="rounded-lg border px-3 py-3 text-sm" style={{ background: "#fef2f2", borderColor: "rgba(185,28,28,0.18)", color: "#b91c1c" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,var(--ink),#263237)", boxShadow: "0 16px 34px rgba(17,19,21,0.18)" }}
        >
          {loading ? "Creating account..." : "Create account"}
          <AuthIcon name="arrowRight" className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}

function PasswordRule({ active, label, muted = false }: { active: boolean; label: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: active ? "var(--accent)" : muted ? "var(--muted)" : "#b91c1c" }}>
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md"
        style={{ background: active ? "var(--accent-soft)" : "rgba(17,19,21,0.05)" }}
      >
        <AuthIcon name="check" className="h-3.5 w-3.5" />
      </span>
      {label}
    </div>
  );
}

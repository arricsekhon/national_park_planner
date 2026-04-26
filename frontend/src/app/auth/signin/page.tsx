"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthIcon } from "../AuthIcon";
import { AuthShell } from "../AuthShell";
import { useAuth } from "@/lib/auth";

export default function SignInPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailId = "signin-email";
  const passwordId = "signin-password";
  const errorId = "signin-error";

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to TrailQuest"
      description="Open your saved trips, journal entries, and park planning workspace."
      visualTitle="Return to your next route."
      visualDescription="Pick up where you left off with saved itineraries, field notes, and park ideas in one calm workspace."
      visualVariant="returning"
      stats={[
        { value: "400+", label: "Parks" },
        { value: "3", label: "Tools" },
        { value: "Local", label: "Saved" },
      ]}
      footer={
        <>
          New here?{" "}
          <Link href="/auth/signup" className="font-semibold transition hover:opacity-70" style={{ color: "var(--accent)" }}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={emailId} className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            Email address
          </label>
          <span className="relative mt-2 block">
            <AuthIcon name="mail" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="w-full rounded-lg border py-3 pl-10 pr-3 text-sm font-medium outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
            />
          </span>
        </div>

        <div>
          <label htmlFor={passwordId} className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
            Password
          </label>
          <span className="relative mt-2 block">
            <AuthIcon name="lock" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="w-full rounded-lg border py-3 pl-10 pr-12 text-sm font-medium outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
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

        {error && (
          <div id={errorId} role="alert" className="rounded-lg border px-3 py-3 text-sm" style={{ background: "#fef2f2", borderColor: "rgba(185,28,28,0.18)", color: "#b91c1c" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
          style={{ background: "var(--ink)", boxShadow: "0 12px 26px rgba(17,19,21,0.16)" }}
        >
          {loading ? "Signing in..." : "Sign in"}
          <AuthIcon name="arrowRight" className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}

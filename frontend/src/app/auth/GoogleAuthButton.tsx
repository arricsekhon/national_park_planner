"use client";

import { AuthIcon } from "./AuthIcon";

interface GoogleAuthButtonProps {
  loading: boolean;
  onClick: () => void;
  mode: "signin" | "signup";
}

export function GoogleAuthButton({ loading, onClick, mode }: GoogleAuthButtonProps) {
  const label = mode === "signin" ? "Sign in with Google" : "Sign up with Google";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="inline-flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-stone-50 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
      style={{ borderColor: "var(--line)", color: "var(--ink)", background: "linear-gradient(180deg,#fff,#fbfbf8)" }}
    >
      <AuthIcon name="google" className="h-5 w-5" />
      {loading ? "Opening Google..." : label}
    </button>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen pt-[var(--nav-h)] flex items-center justify-center px-6"
      style={{ background: "var(--surface)" }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-7"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.14)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2
          className="font-bold text-2xl mb-3"
          style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
        >
          Something went wrong
        </h2>
        <p className="text-sm leading-7 mb-8" style={{ color: "var(--muted)" }}>
          {error.message || "An unexpected error occurred. Refresh to try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
            style={{ background: "var(--ink)" }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-stone-50"
            style={{ color: "var(--muted)", border: "1px solid var(--line)" }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

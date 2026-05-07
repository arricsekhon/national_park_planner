import Link from "next/link";
import type { ReactNode } from "react";
import { AuthIcon } from "./AuthIcon";
import { AuthVisualPanel, MobileAuthAccent, VISUAL_STYLES, type AuthVisualVariant } from "./AuthVisuals";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  visualTitle: string;
  visualDescription: string;
  visualVariant: AuthVisualVariant;
  stats: { value: string; label: string }[];
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  visualTitle,
  visualDescription,
  visualVariant,
  stats,
  children,
  footer,
}: AuthShellProps) {
  const visual = VISUAL_STYLES[visualVariant];

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1480px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,0.58fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(470px,0.56fr)]">
        <section
          className="relative hidden overflow-hidden rounded-xl border lg:block"
          style={{
            background: visual.panel,
            borderColor: "rgba(17,19,21,0.1)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="absolute inset-0 opacity-45"
            style={{ backgroundImage: visual.overlay, backgroundSize: "44px 44px" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.22),transparent_22rem),radial-gradient(circle_at_20%_84%,rgba(246,240,220,0.14),transparent_18rem),linear-gradient(180deg,rgba(17,19,21,0.04),rgba(17,19,21,0.42))]" />
          <div className="relative flex h-full min-h-[calc(100vh-98px)] flex-col justify-between p-7 text-white xl:p-8">
            <Link href="/" className="flex w-fit items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/18 backdrop-blur-xl"
                style={{ background: visual.markBackground }}
              >
                <AuthIcon name="mountain" className="h-5 w-5" />
              </span>
              <span className="text-base font-semibold">TrailQuest</span>
            </Link>

            <div className="grid gap-7">
              <AuthVisualPanel variant={visualVariant} />
              <div className="max-w-2xl">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/64">
                  <span className="h-px w-8 bg-white/42" />
                  {eyebrow}
                </div>
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/16"
                  style={{ background: visual.markBackground }}
                >
                  <AuthIcon name={visual.mark} className="h-5 w-5" />
                </div>
                <h2 className="max-w-2xl text-4xl font-semibold leading-[1.04] xl:text-5xl">{visualTitle}</h2>
                <p className="mt-4 max-w-xl text-base leading-8 text-white/72">{visualDescription}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-lg border p-3.5 backdrop-blur-xl"
                  style={{ background: visual.statBackground, borderColor: visual.statBorder }}
                >
                  <p className="text-xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: visual.statLabel }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="flex min-w-0 items-center justify-center">
          <div className="w-full max-w-[500px]">
            <Link href="/" className="mb-5 flex w-fit items-center gap-3 lg:hidden">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: "var(--ink)", color: "white" }}
              >
                <AuthIcon name="mountain" className="h-5 w-5" />
              </span>
              <span className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                TrailQuest
              </span>
            </Link>

            <MobileAuthAccent
              eyebrow={eyebrow}
              title={visualTitle}
              visual={visual}
            />

            <section
              className="relative overflow-hidden rounded-xl border bg-white p-5 sm:p-6"
              style={{ borderColor: "rgba(17,19,21,0.08)", boxShadow: "0 24px 70px rgba(17,19,21,0.08)" }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: visual.panel }} />
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight" style={{ color: "var(--ink)" }}>
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
                  {description}
                </p>
              </div>

              {children}

              <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                {["Saved trips", "Park journal", "No ads"].map((item) => (
                  <div key={item} className="rounded-lg px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-5 text-center text-sm" style={{ color: "var(--muted)" }}>
              {footer}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

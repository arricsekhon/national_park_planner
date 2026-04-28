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
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1480px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_500px]">
        <section
          className="relative hidden overflow-hidden rounded-lg border lg:block"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.18),transparent_22rem),linear-gradient(180deg,rgba(17,19,21,0.08),rgba(17,19,21,0.36))]" />
          <div className="relative flex h-full min-h-[calc(100vh-98px)] flex-col justify-between p-8 text-white xl:p-10">
            <Link href="/" className="flex w-fit items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/18 backdrop-blur-xl"
                style={{ background: visual.markBackground }}
              >
                <AuthIcon name="mountain" className="h-5 w-5" />
              </span>
              <span className="text-base font-semibold">TrailQuest</span>
            </Link>

            <div className="grid gap-8">
              <AuthVisualPanel variant={visualVariant} />
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/64">
                <span className="h-px w-8 bg-white/42" />
                {eyebrow}
              </div>
              <div className="max-w-2xl">
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-white/16"
                  style={{ background: visual.markBackground }}
                >
                  <AuthIcon name={visual.mark} className="h-6 w-6" />
                </div>
                <h2 className="text-5xl font-semibold leading-tight xl:text-6xl">{visualTitle}</h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-white/72">{visualDescription}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {stats.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-lg border p-4 backdrop-blur-xl"
                  style={{ background: visual.statBackground, borderColor: visual.statBorder }}
                >
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: visual.statLabel }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="flex min-w-0 items-center justify-center">
          <div className="w-full max-w-[460px]">
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

            <section className="rounded-lg border bg-white p-5 sm:p-6" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
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

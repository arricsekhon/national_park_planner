import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { MobileAuthAccent, VISUAL_STYLES, type AuthVisualVariant } from "./AuthVisuals";
import BrandLogo from "@/app/components/BrandLogo";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  visualTitle: string;
  visualDescription: string;
  visualVariant: AuthVisualVariant;
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
  children,
  footer,
}: AuthShellProps) {
  const visual = VISUAL_STYLES[visualVariant];

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1320px] gap-8 px-4 py-6 lg:grid-cols-[minmax(0,0.76fr)_minmax(400px,0.58fr)] xl:grid-cols-[minmax(0,0.72fr)_minmax(440px,0.56fr)]">
        <section
          className="relative hidden overflow-hidden rounded-lg border lg:block"
          style={{
            borderColor: "rgba(17,19,21,0.1)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Image
            src="/auth-grand-teton.webp"
            alt="Grand Teton mountains and meadow"
            fill
            priority
            className="object-cover object-center"
            sizes="(min-width: 1024px) 58vw, 100vw"
            style={{ filter: "saturate(1.04) contrast(1.02) brightness(1.06)" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,14,14,0.36)_0%,rgba(9,14,14,0.1)_52%,rgba(9,14,14,0)_100%),linear-gradient(180deg,rgba(9,14,14,0)_0%,rgba(9,14,14,0.16)_54%,rgba(9,14,14,0.62)_100%)]" />
          <div className="relative flex h-full min-h-[calc(100vh-114px)] items-end p-6 text-white xl:p-7">
            <div className="max-w-xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/66">
                <span className="h-px w-7 bg-white/38" />
                {eyebrow}
              </div>
              <h2 className="max-w-xl text-3xl font-semibold leading-[1.08] drop-shadow-sm xl:text-[2.55rem]">{visualTitle}</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/82">{visualDescription}</p>
            </div>
          </div>
        </section>

        <main className="flex min-w-0 items-center justify-center">
          <div className="w-full max-w-[500px]">
            <Link href="/" className="mb-5 flex w-fit items-center gap-3 lg:hidden">
              <BrandLogo textColor="var(--ink)" />
            </Link>

            <MobileAuthAccent
              eyebrow={eyebrow}
              title={visualTitle}
            />

            <section
              className="relative overflow-hidden rounded-lg border bg-white p-5 sm:p-6"
              style={{ borderColor: "rgba(17,19,21,0.08)", boxShadow: "0 18px 48px rgba(17,19,21,0.07)" }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: visual.panel }} />
              <div className="mb-5">
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

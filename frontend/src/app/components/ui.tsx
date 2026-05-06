import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

const buttonTone: Record<ButtonTone, string> = {
  primary: "bg-[var(--ink)] text-white shadow-[0_14px_34px_rgba(17,19,21,0.16)] hover:bg-[#252a2d]",
  secondary: "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--surface-soft)]",
  ghost: "text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline",
  danger: "text-red-600 hover:bg-red-50",
};

export function Button({
  tone = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-all active:scale-95 disabled:scale-100 disabled:opacity-50",
        buttonTone[tone],
        className
      )}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx("rounded-xl border bg-white/70", className)}
      style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)", ...props.style }}
    />
  );
}

export function IconButton({
  label,
  tone = "ghost",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "ghost" | "primary" | "danger";
  size?: "sm" | "md";
}) {
  const sizes = { sm: "h-8 w-8", md: "h-9 w-9" };
  const tones: Record<string, string> = {
    ghost: "bg-[rgba(17,19,21,0.05)] text-[var(--muted)] hover:bg-[rgba(17,19,21,0.1)] hover:text-[var(--ink)]",
    primary: "bg-[var(--accent)] text-white hover:opacity-90",
    danger: "text-red-600 hover:bg-red-50",
  };
  return (
    <button
      aria-label={label}
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-50",
        sizes[size],
        tones[tone],
        className
      )}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx("animate-pulse rounded-lg", className)}
      style={{ background: "var(--linen)", ...props.style }}
    />
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
      style={{ color: "var(--accent)" }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      {children}
    </Link>
  );
}

export function SectionHeading({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      {...props}
      className={cx("text-xl font-semibold", className)}
      style={{ color: "var(--ink)", ...props.style }}
    >
      {children}
    </h2>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border px-8 py-14 text-center" style={{ background: "rgba(255,255,255,0.58)", borderColor: "var(--line)" }}>
      <p className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
        {title}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7" style={{ color: "var(--muted)" }}>
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

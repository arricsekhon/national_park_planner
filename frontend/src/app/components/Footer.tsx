import Link from "next/link";
import BrandLogo from "./BrandLogo";

const PRIMARY_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/planner", label: "Plan" },
  { href: "/journal", label: "Journal" },
  { href: "/compare", label: "Compare" },
];

const ACCOUNT_LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/auth/signin", label: "Sign in" },
  { href: "/auth/signup", label: "Create account" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: "var(--ink)", color: "white" }}>
      <div className="premium-shell py-9">
        <div className="grid gap-8 md:grid-cols-[1fr_auto_auto] md:items-start">
          <div className="max-w-sm">
            <Link href="/" className="block w-fit transition-opacity hover:opacity-90">
              <BrandLogo variant="full" textColor="white" tone="light" className="[&>span:first-child]:h-8 [&>span:first-child]:w-[70px] [&>span:last-child>span:first-child]:text-base [&>span:last-child>span:last-child]:text-[9px]" />
            </Link>
            <p className="mt-4 text-sm leading-6 text-white/58">
              Compare parks, check the trip basics, and keep the notes you need before heading out.
            </p>
          </div>

          <FooterGroup title="Pages" links={PRIMARY_LINKS} />
          <FooterGroup title="Account" links={ACCOUNT_LINKS} />
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <p>TrailQuest national park planner · built with NPS park data</p>
          <a
            href="https://www.nps.gov"
            target="_blank"
            rel="noreferrer"
            className="w-fit underline underline-offset-4 transition hover:text-white"
          >
            Park data from the National Park Service
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title} className="min-w-32">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">{title}</p>
      <div className="mt-4 grid gap-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="w-fit text-sm font-medium text-white/68 underline-offset-4 transition hover:text-white hover:underline">
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

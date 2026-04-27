import Image from "next/image";
import Link from "next/link";
import { API_BASE, type Park } from "@/lib/api";
import AnimatedSection from "./AnimatedSection";
import FeaturedImageSwipe from "./FeaturedImageSwipe";
import { HeroSearchAndStats } from "./HomeActions";
import NearbySection from "./NearbySection";
import UserCollection from "./UserCollection";



const HERO_LABEL = "National Park Planning";

const HERO_PREVIEW_STOPS = [
  { time: "Day 1", title: "Pick the anchor park", detail: "Shortlist views, trails, and overnight options" },
  { time: "Day 2", title: "Shape the route", detail: "Compare drive time, weather, and park fit" },
  { time: "Day 3", title: "Save the memory", detail: "Keep notes, photos, and visit status together" },
];

const JOURNEY_STEPS = [
  {
    href: "/explore",
    eyebrow: "Discover",
    title: "Find the place that fits the moment.",
    desc: "Search parks by name, activity, state, or distance, then move from curiosity to a clear shortlist.",
  },
  {
    href: "/planner",
    eyebrow: "Plan",
    title: "Shape the route without clutter.",
    desc: "Build a multi-stop trip, keep notes close, and generate a packing list that adapts to the season.",
  },
  {
    href: "/journal",
    eyebrow: "Remember",
    title: "Keep every trail in one quiet archive.",
    desc: "Save photos, ratings, and field notes so the trip still has a place after you return.",
  },
];

const DESIGN_NOTES = [
  "Search by park, state, activity, or mood.",
  "Save candidates without leaving the flow.",
  "Turn the shortlist into a calm itinerary.",
];

const ACTIVITY_DISCOVERY = [
  { label: "Hiking", q: "hiking" },
  { label: "Camping", q: "camping" },
  { label: "Wildlife", q: "wildlife" },
  { label: "Climbing", q: "climbing" },
  { label: "Kayaking", q: "kayaking" },
  { label: "Fishing", q: "fishing" },
  { label: "Cycling", q: "cycling" },
  { label: "Swimming", q: "swimming" },
];

async function getFeaturedParks(): Promise<{ parks: Park[]; total: number }> {
  try {
    const params = new URLSearchParams({ limit: "9", start: "0" });
    const response = await fetch(`${API_BASE}/parks?${params}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return { parks: [], total: 0 };
    const data = await response.json();
    return {
      parks: Array.isArray(data.parks) ? data.parks.slice(0, 9) : [],
      total: typeof data.total === "number" ? data.total : 0,
    };
  } catch {
    return { parks: [], total: 0 };
  }
}

export default async function HomePage() {
  const { parks: featured, total: parkTotal } = await getFeaturedParks();
  const featureImage = featured[1]?.images?.[0] ?? featured[0]?.images?.[0];

  return (
    <main className="min-h-screen overflow-hidden" style={{ background: "var(--surface)" }}>
      <section className="relative min-h-[55svh] overflow-hidden text-white sm:min-h-[100svh]">
        <Image
          src="/hero.jpg"
          alt="Grand Prismatic Spring, Yellowstone National Park"
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.36)_44%,rgba(0,0,0,0.18)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.16)_46%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(255,255,255,0.24),transparent_24rem)]" />

        <div className="premium-shell relative z-10 grid items-center gap-12 pt-20 pb-14 sm:min-h-[100svh] sm:pt-28 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="min-w-0 w-full max-w-5xl text-center lg:text-left">
            <div className="animate-hero-1 mb-6 hidden sm:inline-flex items-center gap-3 rounded-lg border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/74 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8ee3d5]" />
              National park trip planning
            </div>

            <h1
              className="animate-hero-2 text-balance font-semibold leading-[1.05] sm:leading-[0.92]"
              style={{ fontSize: "clamp(1.75rem, 7.5vw, 8.75rem)", overflowWrap: "break-word" }}
            >
              Plan the park trip without the chaos.
            </h1>

            <p className="animate-hero-3 mx-auto mt-8 max-w-2xl text-balance text-lg leading-8 text-white/74 sm:text-xl lg:mx-0">
              Move from search to route, packing, and memory keeping with a planning surface that stays quiet.
            </p>

            <HeroSearchAndStats parkCount={parkTotal} />
          </div>

          <aside className="animate-hero-4 hidden lg:block">
            <div
              className="rounded-xl border p-4 backdrop-blur-2xl"
              style={{ background: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.2)", boxShadow: "0 30px 90px rgba(0,0,0,0.22)" }}
            >
              <div className="rounded-lg bg-white p-5 text-[var(--ink)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                      Suggested plan
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight">
                      Long weekend route
                    </h2>
                  </div>
                  <span className="rounded-lg px-3 py-1 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    3 days
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {HERO_PREVIEW_STOPS.map((stop, index) => (
                    <div key={stop.time} className="flex gap-3 rounded-lg p-3" style={{ background: index === 0 ? "var(--surface-soft)" : "transparent" }}>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold" style={{ background: "var(--ink)", color: "white" }}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>{stop.time}</p>
                        <p className="mt-0.5 text-sm font-semibold">{stop.title}</p>
                        <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>{stop.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/planner"
                  className="mt-5 flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold transition-all hover:opacity-85"
                  style={{ background: "var(--ink)", color: "white" }}
                >
                  Open planner
                </Link>
              </div>
            </div>
          </aside>

          <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-lg border border-white/16 bg-black/24 px-4 py-2 text-xs text-white/62 backdrop-blur-xl md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            {HERO_LABEL}
          </div>
        </div>
      </section>

      <section className="premium-shell py-24 sm:py-32">
        <AnimatedSection direction="up">
        <div className="grid items-end gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
              From idea to itinerary
            </p>
            <h2
              className="text-balance font-semibold leading-[1.02]"
              style={{ color: "var(--ink)", fontSize: "clamp(2.7rem, 7vw, 6.5rem)" }}
            >
              Less interface. More anticipation.
            </h2>
          </div>
          <div className="lg:pb-3">
            <p className="max-w-2xl text-lg leading-8" style={{ color: "var(--muted)" }}>
              The homepage should feel like opening a travel film, not a dashboard. Search stays immediate, planning stays nearby, and the visual weight belongs to the places.
            </p>
          </div>
        </div>
        </AnimatedSection>

        <div className="mt-16 overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.58)", boxShadow: "var(--shadow-card)" }}>
          {JOURNEY_STEPS.map(({ href, eyebrow, title, desc }, index) => (
            <AnimatedSection key={href} direction="left" delay={index * 100}>
            <Link
              href={href}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/70 sm:px-8 sm:py-5 lg:grid lg:grid-cols-[120px_1fr_260px_40px] lg:items-center lg:gap-5 lg:py-8"
              style={{ borderTop: index === 0 ? "none" : "1px solid var(--line)" }}
            >
              {/* On mobile: wraps eyebrow+title as one flex column. On lg: contents dissolves into grid. */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:contents">
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                  {eyebrow}
                </p>
                <h3 className="text-base font-semibold leading-tight sm:text-xl lg:text-2xl" style={{ color: "var(--ink)" }}>
                  {title}
                </h3>
              </div>
              <p className="hidden text-sm leading-7 lg:block" style={{ color: "var(--muted)" }}>
                {desc}
              </p>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all group-hover:translate-x-1 lg:h-10 lg:w-10" style={{ background: "var(--ink)", color: "white" }}>
                →
              </span>
            </Link>
            </AnimatedSection>
          ))}
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {DESIGN_NOTES.map((note) => (
            <div key={note} className="rounded-lg border px-5 py-3 text-sm font-medium" style={{ borderColor: "var(--line)", color: "var(--muted)", background: "rgba(255,255,255,0.5)" }}>
              {note}
            </div>
          ))}
        </div>
      </section>

      <section className="premium-shell pb-24 sm:pb-32">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <AnimatedSection direction="left">
          <div className="relative min-h-[520px] overflow-hidden rounded-xl" style={{ background: "var(--surface-soft)", boxShadow: "var(--shadow-card)" }}>
            {featureImage && (
              <Image
                src={featureImage.url}
                alt={featureImage.altText}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 55vw, 100vw"
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.62)_100%)]" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white sm:p-10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Quiet utility</p>
              <h2 className="max-w-2xl text-4xl font-semibold leading-none sm:text-6xl">
                Every detail has room to breathe.
              </h2>
            </div>
          </div>
          </AnimatedSection>
          <AnimatedSection direction="right">
          <div className="lg:pl-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
              Start with what you want to do
            </p>
            <h2 className="mt-5 text-5xl font-semibold leading-[1.02]" style={{ color: "var(--ink)" }}>
              Browse by activity, then refine.
            </h2>
            <p className="mt-6 text-base leading-8" style={{ color: "var(--muted)" }}>
              Begin with the kind of day you want. The interface stays calm while the park data does the heavy lifting.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {ACTIVITY_DISCOVERY.map(({ label, q }, index) => (
                <AnimatedSection key={q} direction="up" delay={index * 60}>
                <Link
                  href={`/explore?q=${q}`}
                  className="rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-white"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "rgba(255,255,255,0.56)" }}
                >
                  {label}
                </Link>
                </AnimatedSection>
              ))}
            </div>
          </div>
          </AnimatedSection>
        </div>
      </section>

      <AnimatedSection direction="up">
      <NearbySection />
      </AnimatedSection>
      <AnimatedSection direction="up">
      <UserCollection />
      </AnimatedSection>

      <AnimatedSection direction="up">
      <section className="premium-shell pb-28 sm:pb-36">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
              Featured destinations
            </p>
            <h2 className="text-4xl font-semibold sm:text-6xl" style={{ color: "var(--ink)" }}>
              Swipe through the views.
            </h2>
          </div>
          <Link href="/explore" className="text-sm font-semibold underline-offset-4 transition hover:underline" style={{ color: "var(--ink)" }}>
            Explore all parks
          </Link>
        </div>

        <FeaturedImageSwipe parks={featured} />
      </section>
      </AnimatedSection>
    </main>
  );
}

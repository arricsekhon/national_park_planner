import Image from "next/image";
import Link from "next/link";
import { API_BASE, type Park } from "@/lib/api";
import AnimatedSection from "./AnimatedSection";
import FeaturedImageSwipe from "./FeaturedImageSwipe";
import { HeroSearchAndStats } from "./HomeActions";
import NearbySection from "./NearbySection";
import UserCollection from "./UserCollection";

const READINESS_ITEMS = [
  { label: "Pick trail difficulty", done: true },
  { label: "Check road or permit alerts", done: true },
  { label: "Save backup trail", done: false },
  { label: "Add sunrise or parking note", done: false },
];

const ACTIVITY_DISCOVERY = [
  { label: "Hiking", q: "hiking" },
  { label: "Camping", q: "camping" },
  { label: "Wildlife", q: "wildlife" },
  { label: "Climbing", q: "climbing" },
  { label: "Kayaking", q: "kayaking" },
  { label: "Scenic drives", q: "scenic driving" },
];

const BUILDER_STATUS_ITEMS = [
  "Entry fee checked",
  "Parking note added",
  "Backup route selected",
  "Shuttle timing reviewed",
];

const DRAFT_PREVIEW_DAYS = [
  {
    day: "Day 1",
    label: "Arrival",
    items: [
      { text: "Valley Loop", note: "Easy · 1.5 hr", tags: ["Easy", "1.5 hr"] },
      { text: "Tunnel View sunset", note: "Parking fills early", tags: ["Parking"] },
    ],
  },
  {
    day: "Day 2",
    label: "Main hike",
    items: [
      { text: "Mist Trail", note: "Moderate/Hard · start before 8 AM", tags: ["Hard", "before 8 AM"] },
      { text: "Lower Yosemite Fall if wet", note: "Rainy-day backup", tags: ["Backup"] },
    ],
  },
  {
    day: "Day 3",
    label: "Short route",
    items: [
      { text: "Easy overlook before leaving", note: "Low effort, good payoff", tags: ["Easy"] },
      { text: "Save notes to journal", note: "Keep parking and trail notes", tags: ["Journal"] },
    ],
  },
];

const ICONIC_PARK_CODES = [
  "yose",
  "grca",
  "yell",
  "zion",
  "grsm",
  "glac",
  "romo",
  "acad",
  "olym",
];

async function getFeaturedParks(): Promise<{ parks: Park[]; total: number }> {
  try {
    const results = await Promise.all(
      ICONIC_PARK_CODES.map((code) =>
        fetch(`${API_BASE}/parks/${code}`, { next: { revalidate: 3600 } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );
    const parks = results.filter(Boolean) as Park[];
    return { parks, total: parks.length };
  } catch {
    return { parks: [], total: 0 };
  }
}

function formatFee(park?: Park) {
  const fee = park?.entranceFees?.[0];
  if (!fee) return "Check fee";
  const cost = parseFloat(fee.cost);
  return cost === 0 ? "Free entry" : `$${cost.toFixed(0)} entry`;
}

function activitySummary(park?: Park) {
  const activities = park?.activities?.slice(0, 3).map((activity) => activity.name);
  return activities?.length ? activities.join(" / ") : "Trails / overlooks / visitor center";
}

export default async function HomePage() {
  const { parks: featured } = await getFeaturedParks();
  const featuredPark = featured.find((park) => park.parkCode === "yose") ?? featured[0];

  return (
    <main className="min-h-screen overflow-hidden" style={{ background: "var(--surface)" }}>
      <section className="relative overflow-hidden border-b pt-[var(--nav-h)]" style={{ borderColor: "var(--line)" }}>
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg"
            alt="Mountain valley landscape"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,13,13,0.86)_0%,rgba(10,13,13,0.66)_45%,rgba(10,13,13,0.24)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,13,13,0.22)_0%,rgba(10,13,13,0.54)_100%)]" />
        </div>

        <div className="premium-shell relative z-10 grid min-h-[calc(100svh-var(--nav-h))] items-center gap-10 py-12 text-white lg:grid-cols-[minmax(0,0.98fr)_380px] lg:py-16">
          <div className="min-w-0 w-full max-w-2xl">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-md border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/72">
                Featured park plan
              </span>
            </div>

            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl lg:text-6xl">
              Pick a park. Build the day. Keep the notes.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/74">
              TrailQuest helps you compare parks, check trip basics, and save the plan before another tab takes over.
            </p>

            <HeroSearchAndStats />
          </div>

          <aside className="rounded-lg border border-white/14 bg-[#fbfbf8]/88 p-3.5 text-[var(--ink)] shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                  Today&apos;s planning board
                </p>
                <h2 className="mt-1.5 text-xl font-semibold leading-tight">
                  {featuredPark?.fullName ?? "Yosemite National Park"}
                </h2>
              </div>
              <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: "rgba(23,109,101,0.1)", color: "var(--accent)" }}>
                Saved
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <InfoTile label="Best for" value={activitySummary(featuredPark)} />
              <InfoTile label="Need to check" value="permits / road status" />
              <InfoTile label="Entry" value={formatFee(featuredPark)} />
              <InfoTile label="Backup" value="shorter trail if weather turns" />
            </div>

            <div className="mt-4 rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.72)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                Readiness checklist
              </p>
              <div className="mt-2.5 grid gap-2">
                {READINESS_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded border text-[10px]"
                      style={{
                        borderColor: item.done ? "var(--accent)" : "rgba(17,19,21,0.18)",
                        background: item.done ? "var(--accent)" : "transparent",
                        color: item.done ? "white" : "transparent",
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ color: item.done ? "var(--ink)" : "var(--muted)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/planner"
              className="mt-4 flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold transition hover:opacity-90"
              style={{ background: "var(--ink)", color: "white" }}
            >
              Continue this plan
            </Link>
          </aside>
        </div>
      </section>

      <section className="premium-shell py-20 sm:py-24">
        <div className="grid gap-7 lg:grid-cols-[0.46fr_1fr] lg:items-start">
          <AnimatedSection direction="up">
            <div className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                AI itinerary builder
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
                Tell TrailQuest what kind of trip you want.
              </h2>
              <p className="mt-4 text-sm leading-7" style={{ color: "var(--muted)" }}>
                Start with a park, pace, and a few limits. TrailQuest turns that into a draft you can edit.
              </p>
              <Link
                href="/planner"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition hover:opacity-90"
                style={{ background: "var(--ink)", color: "white" }}
              >
                Build my itinerary
              </Link>
            </div>
          </AnimatedSection>

          <div className="min-w-0 overflow-hidden rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}>
            <AnimatedSection direction="up">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
                    Conversation
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                    A few plain details are enough to start a draft.
                  </p>
                </div>
                <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  drafting
                </span>
              </div>
            </AnimatedSection>

            <div className="mt-4 grid gap-3">
              <AnimatedSection direction="up" delay={80}>
                <div className="max-w-[86%] rounded-lg border bg-[var(--surface)] p-3" style={{ borderColor: "var(--line)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                    You
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--ink)" }}>
                    Plan 3 days in Yosemite. Moderate pace. Avoid hard trails.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection direction="up" delay={180}>
                <div className="ml-auto max-w-[88%] rounded-lg p-3" style={{ background: "var(--ink)", color: "white" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/56">
                    TrailQuest
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/84">
                    Got it. I&apos;ll keep hikes under 5 miles, add parking notes, and include a rainy-day backup.
                  </p>
                </div>
              </AnimatedSection>

              <AnimatedSection direction="up" delay={280}>
                <div className="rounded-lg border bg-[var(--surface)] p-3" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                    TrailQuest is checking fees, shuttle notes, trail difficulty, and backup options...
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {BUILDER_STATUS_ITEMS.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-strong)" }}>
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]" style={{ borderColor: "var(--accent)", background: "var(--accent)", color: "white" }}>
                          ✓
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection direction="up" delay={380}>
                <div className="rounded-lg border bg-white p-3.5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
                        Draft itinerary
                      </p>
                      <h3 className="mt-1 text-lg font-semibold" style={{ color: "var(--ink)" }}>
                        Yosemite long weekend
                      </h3>
                    </div>
                    <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--sand)", color: "var(--ink)" }}>
                      editable draft
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {DRAFT_PREVIEW_DAYS.map((day, index) => (
                      <AnimatedSection key={day.day} direction="up" delay={460 + index * 80}>
                        <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          {day.day} · {day.label}
                        </p>
                        <div className="mt-3 grid gap-3">
                          {day.items.map((item) => (
                            <div key={item.text}>
                              <p className="text-sm font-medium" style={{ color: "var(--muted-strong)" }}>
                                {item.text}
                              </p>
                              <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--muted)" }}>
                                {item.note}
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {item.tags.map((tag) => (
                                  <span key={tag} className="rounded px-2 py-1 text-[11px] font-semibold" style={{ background: "white", color: tag === "Hard" ? "#9a4b1f" : "var(--accent)", border: "1px solid var(--line)" }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        </div>
                      </AnimatedSection>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-shell pb-20 sm:pb-24">
        <div className="grid items-start gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <AnimatedSection direction="left">
            <div className="rounded-lg border bg-white p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Start with a constraint
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight" style={{ color: "var(--ink)" }}>
                Filter by the day you actually have.
              </h2>
              <p className="mt-4 text-sm leading-6" style={{ color: "var(--muted)" }}>
                Choose an activity, then compare parks with the details that change the plan: drive time, entry cost, weather, permits, and trail difficulty.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {ACTIVITY_DISCOVERY.map(({ label, q }) => (
                  <Link
                    key={q}
                    href={`/explore?q=${q}`}
                    className="rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection direction="right">
            <div className="rounded-lg border bg-white p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                    Itinerary draft
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                    Yosemite long weekend
                  </h2>
                </div>
                <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--sand)", color: "var(--ink)" }}>
                  2 nights
                </span>
              </div>
              {["Arrive before lunch, check shuttle status", "Mist Trail if dry; Valley Loop if crowded", "Glacier Point road note and sunrise backup"].map((item, index) => (
                <div key={item} className="grid grid-cols-[56px_1fr] gap-3 border-t py-3 text-sm" style={{ borderColor: "var(--line)" }}>
                  <span className="font-semibold" style={{ color: "var(--accent)" }}>Day {index + 1}</span>
                  <span style={{ color: "var(--muted)" }}>{item}</span>
                </div>
              ))}
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
        <section className="premium-shell pb-24 sm:pb-28">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Featured parks
              </p>
              <h2 className="text-3xl font-semibold sm:text-5xl" style={{ color: "var(--ink)" }}>
                Compare the next stop.
              </h2>
            </div>
            <Link href="/explore" className="text-sm font-semibold underline-offset-4 transition hover:underline" style={{ color: "var(--ink)" }}>
              Browse all parks
            </Link>
          </div>

          <FeaturedImageSwipe parks={featured} />
        </section>
      </AnimatedSection>
    </main>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: "rgba(17,19,21,0.07)", background: "rgba(255,255,255,0.66)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="mt-1 text-[13px] font-semibold leading-5" style={{ color: "var(--ink)" }}>{value}</p>
    </div>
  );
}

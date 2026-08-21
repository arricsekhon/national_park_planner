import Image from "next/image";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { API_BASE, type Park } from "@/lib/api";
import AnimatedSection from "./AnimatedSection";
import FeaturedImageSwipe from "./FeaturedImageSwipe";
import { HeroSearchAndStats } from "./HomeActions";
import ItineraryBuilderDemo from "./ItineraryBuilderDemo";
import NearbySection from "./NearbySection";
import UserCollection from "./UserCollection";

const ACTIVITY_DISCOVERY = [
  { label: "Hiking", q: "hiking" },
  { label: "Camping", q: "camping" },
  { label: "Wildlife", q: "wildlife" },
  { label: "Climbing", q: "climbing" },
  { label: "Kayaking", q: "kayaking" },
  { label: "Scenic drives", q: "scenic driving" },
];

const FAQ_ITEMS = [
  {
    value: "planner",
    question: "How does TrailQuest build an itinerary?",
    answer:
      "Start with a park, trip length, pace, and constraints. TrailQuest drafts a route with trail difficulty, parking notes, fees, and backup options you can edit.",
  },
  {
    value: "data",
    question: "Where does park information come from?",
    answer:
      "Park pages use public National Park Service data, then TrailQuest organizes it around planning details like activities, entrance fees, weather, and location.",
  },
  {
    value: "location",
    question: "Do you save my location?",
    answer:
      "No. Location is requested by your browser only when you use nearby sorting, and it is used for that view only.",
  },
  {
    value: "compare",
    question: "Can I compare parks before choosing one?",
    answer:
      "Yes. Use Explore or Compare to review parks by activity, state, fee, weather, and planning notes before saving a trip.",
  },
  {
    value: "backup",
    question: "Can TrailQuest add backup plans?",
    answer:
      "Yes. Itinerary drafts can include lower-effort routes, weather-safe options, parking reminders, and notes for changing conditions.",
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

export default async function HomePage() {
  const { parks: featured } = await getFeaturedParks();

  return (
    <main className="min-h-screen overflow-hidden" style={{ background: "var(--surface)" }}>
      <section className="relative overflow-hidden border-b pt-[var(--nav-h)]" style={{ borderColor: "rgba(17,19,21,0.14)" }}>
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg"
            alt="Mountain valley landscape"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,18,16,0.76)_0%,rgba(12,18,16,0.58)_48%,rgba(12,18,16,0.22)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,rgba(12,18,16,0)_0%,rgba(251,251,248,0.90)_100%)]" />
        </div>

        <div className="premium-shell relative z-10 flex min-h-[calc(100svh-var(--nav-h))] items-center justify-center py-10 text-center text-white lg:py-12">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.04] sm:text-5xl lg:text-[4.75rem]">
              Plan the park day before the parking lot fills.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/74">
              Find parks by activity, entry fee, trail difficulty, and the time you actually have.
            </p>

            <HeroSearchAndStats />
          </div>
        </div>
      </section>

      <section className="premium-shell py-20 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.42fr_0.9fr] lg:items-center">
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

          <AnimatedSection direction="up" delay={120}>
            <ItineraryBuilderDemo />
          </AnimatedSection>
        </div>
      </section>

      <AnimatedSection direction="up">
        <section className="premium-shell pb-16 sm:pb-20">
          <div className="flex flex-col gap-4 border-y py-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--line)" }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                Popular ways to explore
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Start with an activity, then compare parks by fee, weather, permits, and trail difficulty.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {ACTIVITY_DISCOVERY.map(({ label, q }) => (
                <Link
                  key={q}
                  href={`/explore?q=${q}`}
                  className="rounded-md border px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

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

      <AnimatedSection direction="up">
        <section className="premium-shell pb-24 sm:pb-28">
          <div className="grid gap-8 border-t pt-14 lg:grid-cols-[0.36fr_0.64fr]" style={{ borderColor: "var(--line)" }}>
            <div>
              <h2 className="text-3xl font-semibold leading-tight sm:text-5xl" style={{ color: "var(--ink)" }}>
                Questions, answered.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-7" style={{ color: "var(--muted)" }}>
                Quick answers about planning, nearby sorting, and what TrailQuest saves.
              </p>
            </div>

            <Accordion type="multiple" defaultValue={["planner"]} className="w-full">
              {FAQ_ITEMS.map((item) => (
                <AccordionItem key={item.value} value={item.value} className="border-[var(--line)]">
                  <AccordionTrigger className="py-6 text-left text-xl font-semibold hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-sm leading-7 text-[var(--muted)]">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </AnimatedSection>
    </main>
  );
}

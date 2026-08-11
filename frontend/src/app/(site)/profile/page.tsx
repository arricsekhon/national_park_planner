"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useParkData, type FavoritePark } from "@/lib/park-data";
import { supabase } from "@/lib/supabase";

interface JournalEntry { id: string; title: string; date: string; parkName: string; rating: number; }
interface Trip { id: string; name: string; startDate: string; stops: { parkName: string }[]; }
interface ParkRating { park_code: string; stars: number; }

const STARTER_PARKS = [
  { name: "Yosemite National Park", note: "Waterfalls, valley walks, parking fills early." },
  { name: "Acadia National Park", note: "Coast trails, sunrise drive, timed entry checks." },
  { name: "Zion National Park", note: "Shuttle timing, canyon hikes, permit notes." },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(value: string): string {
  if (!value) return "Dates not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-xs" style={{ color: "#a96f2d" }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { favorites, toggleFavorite, visitStatus } = useParkData();
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [parkRatings, setParkRatings] = useState<ParkRating[]>([]);
  const [tab, setTab] = useState<"saved" | "journal" | "trips">("saved");

  useEffect(() => {
    if (!user) { router.replace("/auth/signin"); return; }

    supabase.from("journal_entries")
      .select("id,title,date,park_name,rating")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data.map((r) => ({
          id: r.id as string,
          title: r.title as string,
          date: r.date as string,
          parkName: (r.park_name as string) ?? "",
          rating: (r.rating as number) ?? 0,
        })));
      });

    supabase.from("trips")
      .select("id,name,start_date,stops")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTrips(data.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          startDate: (r.start_date as string) ?? "",
          stops: (r.stops as { parkName: string }[]) ?? [],
        })));
      });

    supabase.from("park_ratings")
      .select("park_code,stars")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setParkRatings(data as ParkRating[]);
      });
  }, [user, router]);

  if (!user) return null;

  const wantCount = Object.values(visitStatus).filter((v) => v === "want").length;
  const beenCount = Object.values(visitStatus).filter((v) => v === "been").length;
  const stats = [
    { num: favorites.length, label: "Saved parks" },
    { num: wantCount, label: "Want to go" },
    { num: beenCount, label: "Been here" },
    { num: entries.length, label: "Journal entries" },
    { num: trips.length, label: "Trips" },
  ];
  const hasAnyActivity = stats.some((item) => item.num > 0);
  const tabCounts = { saved: favorites.length, journal: entries.length, trips: trips.length };

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <section
          className="rounded-lg border bg-white p-4 sm:p-5"
          style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), #4a7c59)" }}
              >
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  Account
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                  {user.name}
                </h1>
                <p className="mt-1 truncate text-sm" style={{ color: "var(--muted)" }}>{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                Signed in
              </span>
              <span className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: "var(--sand)", color: "var(--ink)" }}>
                Synced
              </span>
              <span className="rounded-md border bg-white px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--line)", color: "var(--muted-strong)" }}>
                {parkRatings.length} rated
              </span>
              <button
                onClick={() => { signOut(); router.push("/"); }}
                className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold transition hover:bg-stone-50"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            {hasAnyActivity ? (
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                {stats.map(({ num, label }) => (
                  <div
                    key={label}
                    className="min-w-[9rem] rounded-lg border bg-[var(--surface)] px-3 py-2.5 sm:min-w-0"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <p className="text-lg font-semibold leading-none" style={{ color: "var(--ink)" }}>{num}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--line)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Start tracking your parks</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                    Save parks, write field notes, or open a trip draft before you leave.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/explore" className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "var(--ink)" }}>
                    Explore parks
                  </Link>
                  <Link href="/planner" className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--line)", color: "var(--accent)" }}>
                    Plan a trip
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <nav className="mt-4 rounded-lg border bg-white p-1" style={{ borderColor: "var(--line)" }} aria-label="Profile sections">
          <div className="grid grid-cols-3 gap-1">
            {([
              ["saved", "Saved Parks"],
              ["journal", "Journal"],
              ["trips", "Trips"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-semibold transition"
                style={{
                  background: tab === key ? "var(--ink)" : "transparent",
                  color: tab === key ? "white" : "var(--muted)",
                }}
              >
                <span className="truncate">{label}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: tab === key ? "rgba(255,255,255,0.16)" : "var(--surface-soft)",
                    color: tab === key ? "white" : "var(--muted-strong)",
                  }}
                >
                  {tabCounts[key]}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <main className="mt-4">
          {tab === "saved" && (
            <>
              {favorites.length === 0 ? (
                <EmptyState
                  title="No saved parks yet."
                  desc="Save parks from Explore to compare fees, seasons, and trip notes later."
                  primary={{ href: "/explore", label: "Explore parks" }}
                  secondary={{ href: "/explore?recommended=1", label: "View recommended parks" }}
                  starters={STARTER_PARKS}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {favorites.map((park) => (
                    <FavCard key={park.code} park={park} onRemove={() => toggleFavorite(park)} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "journal" && (
            <>
              {entries.length === 0 ? (
                <EmptyState
                  title="No field notes yet."
                  desc="Write parking, weather, trail condition, and next-time notes after a visit."
                  primary={{ href: "/journal?action=new", label: "Write first note" }}
                  secondary={{ href: "/explore", label: "Browse parks" }}
                  starters={[
                    { name: "Parking note", note: "Where you parked, what filled early, shuttle timing." },
                    { name: "Trail condition", note: "Mud, snow, closure, crowd, or gear details." },
                    { name: "Next time", note: "What you would start earlier, skip, or pack." },
                  ]}
                />
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/journal?id=${entry.id}`}
                      className="flex flex-col gap-3 rounded-lg border bg-white p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                      style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{entry.title || "Untitled entry"}</p>
                        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{entry.parkName || "Park not selected"} · {formatDate(entry.date)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {["Trail note", "Parking", "Weather"].map((tag) => (
                            <span key={tag} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--surface-soft)", color: "var(--muted-strong)" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Stars rating={entry.rating} />
                        <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>View</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "trips" && (
            <>
              {trips.length === 0 ? (
                <EmptyState
                  title="No trips planned yet."
                  desc="Create a draft route, add stops, and review packing before you leave."
                  primary={{ href: "/planner", label: "Plan a trip" }}
                  secondary={{ href: "/planner", label: "Start with Yosemite weekend" }}
                  starters={[
                    { name: "Yosemite weekend", note: "3 days, arrival stop, main hike, backup route." },
                    { name: "Utah parks road trip", note: "Compare drive time, heat, and permit notes." },
                    { name: "Family day hike", note: "Easy route, parking note, short backup stop." },
                  ]}
                />
              ) : (
                <div className="space-y-3">
                  {trips.map((trip) => (
                    <Link
                      key={trip.id}
                      href="/planner"
                      className="flex flex-col gap-3 rounded-lg border bg-white p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                      style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{trip.name || "Untitled trip"}</p>
                        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                          {formatDate(trip.startDate)} · {trip.stops.length} {trip.stops.length === 1 ? "stop" : "stops"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                          Open
                        </span>
                        <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--sand)", color: "var(--ink)" }}>
                          Draft
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FavCard({ park, onRemove }: { park: FavoritePark; onRemove: () => void }) {
  return (
    <div
      className="group relative overflow-hidden rounded-lg border bg-white transition hover:-translate-y-0.5"
      style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
    >
      <Link href={`/parks/${park.code}`} className="block">
        <div className="relative h-32" style={{ background: "var(--accent-soft)" }}>
          {park.imageUrl ? (
            <Image
              src={park.imageUrl}
              alt={park.name}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold" style={{ color: "var(--accent)" }}>
              TrailQuest
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>
            {park.name}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            {park.states || "NPS site"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              Saved
            </span>
            <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--sand)", color: "var(--ink)" }}>
              Compare later
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t px-3 py-2" style={{ borderColor: "var(--line)" }}>
        <Link href="/planner" className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Add to trip</Link>
        <button
          onClick={(event) => { event.preventDefault(); onRemove(); }}
          className="text-xs font-semibold transition hover:opacity-70"
          style={{ color: "#9f241b" }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  title, desc, primary, secondary, starters,
}: {
  title: string;
  desc: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  starters: { name: string; note: string }[];
}) {
  return (
    <section className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(320px,1fr)] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Starter
          </p>
          <h2 className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--muted)" }}>{desc}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={primary.href} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>
              {primary.label}
            </Link>
            <Link href={secondary.href} className="rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--line)", color: "var(--accent)" }}>
              {secondary.label}
            </Link>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {starters.map((starter) => (
            <Link
              key={starter.name}
              href="/explore"
              className="rounded-lg border bg-[var(--surface)] p-3 transition hover:-translate-y-0.5"
              style={{ borderColor: "var(--line)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{starter.name}</p>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>{starter.note}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

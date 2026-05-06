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

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-xs" style={{ color: "#c8860a" }}>
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

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #071510 0%, #0f2518 55%, #1a3a2a 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 50%, rgba(45,90,61,0.28) 0%, transparent 65%)" }} />
        <div className="max-w-4xl mx-auto px-6 py-12 relative">
          <div className="flex items-end gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #2d5a3d, #4a7c59)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
            >
              {initials(user.name)}
            </div>
            <div className="flex-1 pb-1">
              <h1
                className="font-bold text-white mb-1 leading-tight"
                style={{ fontFamily: "var(--font-playfair)", fontSize: "1.8rem" }}
              >
                {user.name}
              </h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{user.email}</p>
            </div>
            <button
              onClick={() => { signOut(); router.push("/"); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10 shrink-0 mb-1"
              style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Sign out
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8">
            {[
              { num: favorites.length, label: "Saved Parks" },
              { num: beenCount, label: "Been Here" },
              { num: wantCount, label: "Want to Go" },
              { num: entries.length, label: "Journal Entries" },
              { num: parkRatings.length, label: "Parks Rated" },
            ].map(({ num, label }) => (
              <div
                key={label}
                className="p-4 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-2xl font-bold text-white mb-0.5" style={{ fontFamily: "var(--font-playfair)" }}>{num}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ background: "white", borderBottom: "1px solid rgba(26,58,42,0.08)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-6">
            {([
              ["saved", "Saved Parks"],
              ["journal", "Journal"],
              ["trips", "Trips"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="py-4 text-sm font-semibold relative transition-colors"
                style={{ color: tab === key ? "var(--ink)" : "var(--muted)" }}
              >
                {label}
                {tab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "#c8860a" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Saved Parks */}
        {tab === "saved" && (
          <>
            {favorites.length === 0 ? (
              <EmptyState
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
                title="No saved parks yet"
                desc="Hit the heart button on any park to save it here."
                action={{ href: "/explore", label: "Explore Parks" }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((park) => (
                  <FavCard key={park.code} park={park} onRemove={() => toggleFavorite(park)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Journal */}
        {tab === "journal" && (
          <>
            <div className="flex justify-end mb-5">
              <Link
                href="/journal?action=new"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)" }}
              >
                + New Entry
              </Link>
            </div>
            {entries.length === 0 ? (
              <EmptyState
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>}
                title="No journal entries yet"
                desc="Log your hikes and park visits to build your adventure journal."
                action={{ href: "/journal", label: "Go to Journal" }}
              />
            ) : (
              <div className="space-y-3">
                {entries.map((e) => (
                  <Link
                    key={e.id}
                    href={`/journal?id=${e.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                    style={{ background: "white", boxShadow: "var(--shadow-card)", border: "1px solid rgba(26,58,42,0.06)" }}
                  >
                    <div>
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>{e.title}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{e.parkName} · {e.date}</p>
                    </div>
                    <Stars rating={e.rating} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Trips */}
        {tab === "trips" && (
          <>
            <div className="flex justify-end mb-5">
              <Link
                href="/planner"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)" }}
              >
                + New Trip
              </Link>
            </div>
            {trips.length === 0 ? (
              <EmptyState
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                title="No trips planned yet"
                desc="Build multi-stop itineraries in the trip planner."
                action={{ href: "/planner", label: "Open Planner" }}
              />
            ) : (
              <div className="space-y-3">
                {trips.map((t) => (
                  <Link
                    key={t.id}
                    href="/planner"
                    className="flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-0.5"
                    style={{ background: "white", boxShadow: "var(--shadow-card)", border: "1px solid rgba(26,58,42,0.06)" }}
                  >
                    <div>
                      <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>{t.name}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {t.stops.length} {t.stops.length === 1 ? "stop" : "stops"}
                        {t.startDate && ` · Starting ${t.startDate}`}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FavCard({ park, onRemove }: { park: FavoritePark; onRemove: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden relative group transition-all hover:-translate-y-1"
      style={{ background: "white", boxShadow: "var(--shadow-card)" }}
    >
      <Link href={`/parks/${park.code}`}>
        <div className="h-36 relative" style={{ background: "var(--accent-soft)" }}>
          {park.imageUrl && (
            <Image
              src={park.imageUrl}
              alt={park.name}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
        </div>
        <div className="p-4">
          <p className="font-semibold text-sm leading-snug mb-0.5" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
            {park.name}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{park.states}</p>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onRemove(); }}
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
        style={{ background: "rgba(220,38,38,0.85)" }}
        aria-label="Remove from saved parks"
      >
        ✕
      </button>
    </div>
  );
}

function EmptyState({
  icon, title, desc, action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="text-center py-16 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "var(--accent-soft)" }}>
        {icon}
      </div>
      <p className="font-bold mb-2" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)", fontSize: "1.1rem" }}>{title}</p>
      <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "var(--muted)" }}>{desc}</p>
      <Link
        href={action.href}
        className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        style={{ background: "var(--accent)" }}
      >
        {action.label}
      </Link>
    </div>
  );
}

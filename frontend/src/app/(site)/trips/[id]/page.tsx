import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface TripStop {
  id: string;
  parkCode: string;
  parkName: string;
  day: number;
  notes: string;
}

interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  stops: TripStop[];
  notes: string;
}

function formatDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(year, month - 1, day)
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase.from("trips").select("name").eq("id", id).eq("is_public", true).single();
  return {
    title: data ? `${data.name} — TrailQuest` : "Trip — TrailQuest",
    description: "A national park trip itinerary shared via TrailQuest.",
  };
}

export default async function PublicTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: trip } = await supabase
    .from("trips")
    .select("id,name,start_date,end_date,stops,notes")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (!trip) notFound();

  const t = trip as Trip;
  const stops: TripStop[] = Array.isArray(t.stops) ? t.stops : [];
  const byDay = stops.reduce<Record<number, TripStop[]>>((acc, stop) => {
    const d = stop.day ?? 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(stop);
    return acc;
  }, {});
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div
          className="rounded-2xl overflow-hidden p-7 mb-8 text-white"
          style={{
            background: "linear-gradient(135deg, rgba(17,19,21,0.98) 0%, rgba(31,54,54,0.96) 54%, rgba(122,98,60,0.88) 100%)",
            boxShadow: "0 22px 70px rgba(17,19,21,0.16)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60 mb-2">Shared itinerary</p>
          <h1
            className="text-4xl font-semibold leading-tight mb-4"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {t.name}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-white/72">
            {t.start_date && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3 py-2">
                {t.end_date
                  ? `${formatDate(t.start_date)} – ${formatDate(t.end_date)}`
                  : `Starting ${formatDate(t.start_date)}`}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3 py-2">
              {stops.length} {stops.length === 1 ? "stop" : "stops"}
            </span>
          </div>
        </div>

        {/* Stops by day */}
        {days.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>No stops in this trip yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "var(--accent)" }}>
                  Day {day}
                </p>
                <div className="space-y-3">
                  {byDay[day].map((stop) => (
                    <div
                      key={stop.id}
                      className="p-5 rounded-2xl"
                      style={{ background: "white", boxShadow: "var(--shadow-card)", border: "1px solid rgba(26,58,42,0.06)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className="font-semibold text-base mb-0.5"
                            style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}
                          >
                            {stop.parkName}
                          </p>
                          {stop.notes && (
                            <p className="text-sm leading-relaxed mt-2 whitespace-pre-wrap" style={{ color: "var(--muted)" }}>
                              {stop.notes}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/parks/${stop.parkCode}`}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          View Park
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trip notes */}
        {t.notes && (
          <div className="mt-6 p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "var(--muted)" }}>
              Trip Notes
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink-soft)" }}>
              {t.notes}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Want to plan your own national park trip?
          </p>
          <Link
            href="/planner"
            className="inline-block px-6 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: "var(--ink)" }}
          >
            Open Trip Planner
          </Link>
        </div>
      </div>
    </div>
  );
}

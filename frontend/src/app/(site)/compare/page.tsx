"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPark, parseLatLong, type Park } from "@/lib/api";

function CompareSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
      <div className="h-48" style={{ background: "var(--linen)" }} />
      <div className="p-5 space-y-3">
        <div className="h-4 rounded w-3/4" style={{ background: "var(--linen)" }} />
        <div className="h-3 rounded w-1/2" style={{ background: "var(--linen)" }} />
        <div className="h-3 rounded w-full" style={{ background: "var(--linen)" }} />
        <div className="h-3 rounded w-5/6" style={{ background: "var(--linen)" }} />
      </div>
    </div>
  );
}

function Row({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(26,58,42,0.07)" }}>
      <td
        className="py-3 pr-4 text-xs font-semibold uppercase tracking-[0.1em] align-top whitespace-nowrap"
        style={{ color: "var(--muted)", width: 140 }}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="py-3 px-4 text-sm align-top" style={{ color: "var(--ink)" }}>
          {v ?? <span style={{ color: "var(--linen)" }}>—</span>}
        </td>
      ))}
    </tr>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const codesKey = searchParams.get("parks") ?? "";
  const codes = useMemo(() => codesKey.split(",").filter(Boolean).slice(0, 3), [codesKey]);
  const [parks, setParks] = useState<(Park | null)[]>([]);
  const [loading, setLoading] = useState(() => codes.length > 0);

  useEffect(() => {
    if (codes.length === 0) return;

    let active = true;
    Promise.resolve()
      .then(async () => {
        setLoading(true);
        const results = await Promise.all(codes.map((c) => getPark(c).catch(() => null)));
        if (active) setParks(results);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [codes]);

  if (codes.length === 0) {
    return (
      <div className="min-h-screen pt-[var(--nav-h)] flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <div className="text-center">
          <p className="font-bold mb-3" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)", fontSize: "1.2rem" }}>
            No parks selected
          </p>
          <Link href="/explore" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--accent)" }}>
            ← Browse parks to compare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4 transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            ← Back to Explore
          </Link>
          <h1
            className="font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)", fontSize: "2rem" }}
          >
            Park Comparison
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Comparing {codes.length} parks side by side
          </p>
        </div>

        {/* Park header cards */}
        <div className={`mb-8 grid grid-cols-1 gap-5 ${codes.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {loading
            ? codes.map((c) => <CompareSkeleton key={c} />)
            : parks.map((park, i) =>
                park ? (
                  <Link
                    key={park.parkCode}
                    href={`/parks/${park.parkCode}`}
                    className="rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
                    style={{ background: "white", boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="h-44 relative" style={{ background: "var(--accent-soft)" }}>
                      {park.images?.[0] && (
                        <Image
                          src={park.images[0].url}
                          alt={park.images[0].altText}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        />
                      )}
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="font-bold text-white text-sm leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
                          {park.fullName}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{park.states}</p>
                      </div>
                      <div
                        className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "rgba(200,134,10,0.9)" }}
                      >
                        {i + 1}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div key={i} className="rounded-2xl h-44 flex items-center justify-center text-sm" style={{ background: "white", color: "var(--muted)", boxShadow: "var(--shadow-card)" }}>
                    Park not found
                  </div>
                )
              )}
        </div>

        {/* Comparison table */}
        {!loading && parks.some(Boolean) && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "var(--shadow-card)" }}
          >
            <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(26,58,42,0.08)" }}>
              <p className="font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
                At a Glance
              </p>
            </div>
            <div className="hidden overflow-x-auto px-6 py-2 md:block">
              <table className="w-full">
                <tbody>
                  <Row
                    label="Designation"
                    values={parks.map((p) => p?.fullName)}
                  />
                  <Row
                    label="Location"
                    values={parks.map((p) => {
                      const addr = p?.addresses?.find((a) => a.type === "Physical") ?? p?.addresses?.[0];
                      return addr ? `${addr.city}, ${addr.stateCode}` : p?.states;
                    })}
                  />
                  <Row
                    label="Entrance Fee"
                    values={parks.map((p) => {
                      const fee = p?.entranceFees?.[0];
                      if (!fee) return "Unknown";
                      return parseFloat(fee.cost) === 0 ? (
                        <span className="font-semibold" style={{ color: "var(--accent)" }}>Free</span>
                      ) : (
                        <span className="font-semibold">${fee.cost}</span>
                      );
                    })}
                  />
                  <Row
                    label="Activities"
                    values={parks.map((p) => (
                      p?.activities?.length
                        ? <span key={p.parkCode}>{p.activities.length} activities</span>
                        : null
                    ))}
                  />
                  <Row
                    label="Top Activities"
                    values={parks.map((p) =>
                      p?.activities?.slice(0, 5).map((a) => (
                        <span
                          key={a.id}
                          className="inline-block mr-1.5 mb-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: "var(--accent-soft)", color: "#1a4a2a" }}
                        >
                          {a.name}
                        </span>
                      ))
                    )}
                  />
                  <Row
                    label="Coordinates"
                    values={parks.map((p) => {
                      const c = p ? parseLatLong(p.latLong) : null;
                      return c ? `${c.lat.toFixed(3)}°N, ${Math.abs(c.lng).toFixed(3)}°W` : null;
                    })}
                  />
                  <Row
                    label="About"
                    values={parks.map((p) =>
                      p?.description
                        ? <span key={p.parkCode} className="leading-relaxed text-xs" style={{ color: "var(--muted)" }}>{p.description.slice(0, 200)}{p.description.length > 200 ? "…" : ""}</span>
                        : null
                    )}
                  />
                  <Row
                    label="Details"
                    values={parks.map((p) =>
                      p ? (
                        <Link
                          key={p.parkCode}
                          href={`/parks/${p.parkCode}`}
                          className="text-xs font-semibold hover:opacity-70 transition-opacity"
                          style={{ color: "var(--accent)" }}
                        >
                          View full details →
                        </Link>
                      ) : null
                    )}
                  />
                </tbody>
              </table>
            </div>

            {/* Mobile — attribute-grouped rows for true side-by-side comparison */}
            <div className="md:hidden">
              {/* Park name headers */}
              <div className={`grid gap-2 px-4 pt-4 pb-2 ${parks.filter(Boolean).length === 2 ? "grid-cols-[80px_1fr_1fr]" : "grid-cols-[80px_1fr_1fr_1fr]"}`}>
                <div />
                {parks.filter(Boolean).map((park) => park && (
                  <div key={park.parkCode} className="text-center">
                    <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: "var(--ink)" }}>{park.fullName}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{park.states}</p>
                  </div>
                ))}
              </div>
              {[
                {
                  label: "Entrance",
                  values: parks.filter(Boolean).map((p) => {
                    if (!p) return "—";
                    const fee = p.entranceFees?.[0];
                    return !fee ? "Unknown" : parseFloat(fee.cost) === 0 ? "Free" : `$${fee.cost}`;
                  }),
                },
                {
                  label: "Location",
                  values: parks.filter(Boolean).map((p) => {
                    if (!p) return "—";
                    const addr = p.addresses?.find((a) => a.type === "Physical") ?? p.addresses?.[0];
                    return addr ? `${addr.city}, ${addr.stateCode}` : p.states;
                  }),
                },
                {
                  label: "Activities",
                  values: parks.filter(Boolean).map((p) => p ? `${p.activities?.length ?? 0}` : "—"),
                },
                {
                  label: "Coordinates",
                  values: parks.filter(Boolean).map((p) => {
                    if (!p) return "—";
                    const c = parseLatLong(p.latLong);
                    return c ? `${c.lat.toFixed(2)}°N` : "—";
                  }),
                },
              ].map(({ label, values }, rowIdx) => (
                <div
                  key={label}
                  className={`grid gap-2 px-4 py-3 ${parks.filter(Boolean).length === 2 ? "grid-cols-[80px_1fr_1fr]" : "grid-cols-[80px_1fr_1fr_1fr]"}`}
                  style={{ borderTop: "1px solid var(--line)", background: rowIdx % 2 === 0 ? "rgba(255,255,255,0.5)" : "transparent" }}
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] pt-0.5" style={{ color: "var(--muted)" }}>{label}</dt>
                  {values.map((v, i) => (
                    <dd key={i} className="text-sm font-medium text-center" style={{ color: "var(--ink)" }}>{v}</dd>
                  ))}
                </div>
              ))}
              <div className={`grid gap-2 px-4 py-4 ${parks.filter(Boolean).length === 2 ? "grid-cols-[80px_1fr_1fr]" : "grid-cols-[80px_1fr_1fr_1fr]"}`} style={{ borderTop: "1px solid var(--line)" }}>
                <div />
                {parks.filter(Boolean).map((park) => park && (
                  <div key={park.parkCode} className="text-center">
                    <Link href={`/parks/${park.parkCode}`} className="text-xs font-semibold underline-offset-4 hover:underline" style={{ color: "var(--accent)" }}>
                      Details
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-h)] flex items-center justify-center" style={{ color: "var(--muted)" }}>
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}

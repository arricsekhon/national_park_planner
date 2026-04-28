"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { searchParks, parseLatLong, haversineDistance, type Park } from "@/lib/api";
import { useParkData } from "@/lib/park-data";

const US_STATES = [
  ["", "All States"], ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],
  ["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],
  ["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],
  ["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],
  ["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],
  ["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],
  ["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],
  ["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],
  ["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],
  ["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

const ACTIVITY_FILTERS = ["Hiking", "Camping", "Fishing", "Swimming", "Rock Climbing", "Wildlife Watching", "Cycling", "Kayaking"];

function ExploreContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [stateCode, setStateCode] = useState("");
  const [parks, setParks] = useState<Park[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedPark, setSelectedPark] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState("");
  const [npOnly, setNpOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState("");
  const requestIdRef = useRef(0);

  const fetchParks = useCallback(async (q: string, state: string, limit = 50) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const data = await searchParks(q, state, 0, limit);
      if (requestId !== requestIdRef.current) return;
      setParks(data.parks);
      setTotal(data.total);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("Could not load parks. Is the backend running?");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const data = await searchParks(query, stateCode, parks.length, 50);
      if (requestId !== requestIdRef.current) return;
      setParks((prev) => [...prev, ...data.parks]);
      setTotal(data.total);
    } catch {
      /* ignore — stale loadMore should not surface an error */
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }, [query, stateCode, parks.length]);

  // Initial load
  useEffect(() => {
    fetchParks(query, stateCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-search as user types
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setUserLocation(null);
    const timer = setTimeout(() => {
      fetchParks(query, stateCode);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, stateCode]);

  const displayParks = useMemo(() => {
    let result = parks;
    if (npOnly) {
      result = result.filter((p) => p.designation === "National Park");
    }
    if (activityFilter) {
      result = result.filter((p) =>
        p.activities?.some((a) => a.name.toLowerCase().includes(activityFilter.toLowerCase()))
      );
    }
    if (userLocation) {
      result = [...result].sort((a, b) => {
        const ca = parseLatLong(a.latLong);
        const cb = parseLatLong(b.latLong);
        const da = ca ? haversineDistance(userLocation.lat, userLocation.lng, ca.lat, ca.lng) : Infinity;
        const db = cb ? haversineDistance(userLocation.lat, userLocation.lng, cb.lat, cb.lng) : Infinity;
        return da - db;
      });
    }
    return result;
  }, [parks, activityFilter, npOnly, userLocation]);

  const handleNearMe = () => {
    if (userLocation) {
      setUserLocation(null);
      return;
    }
    if (!navigator.geolocation) {
      setNearMeError("Geolocation is not supported by your browser.");
      setTimeout(() => setNearMeError(""), 4000);
      return;
    }
    setNearMeLoading(true);
    setNearMeError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        try {
          await fetchParks("", "", 300);
        } finally {
          setNearMeLoading(false);
        }
      },
      () => {
        setNearMeLoading(false);
        setNearMeError("Location access denied. Try searching by state.");
        setTimeout(() => setNearMeError(""), 4000);
      }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserLocation(null);
    fetchParks(query, stateCode);
  };
  const npCount = parks.filter((p) => p.designation === "National Park").length;
  const resultText = userLocation
    ? `${displayParks.length} nearby NPS sites`
    : npOnly
      ? `${displayParks.length} of ${npCount} national parks`
      : activityFilter
        ? `${displayParks.length} NPS sites · ${activityFilter}`
        : `${parks.length} of ${total} NPS sites`;

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto flex min-h-[calc(100vh-66px)] max-w-[1680px] flex-col px-4 py-4 sm:px-6">
        <section
          className="relative z-20 mb-4 overflow-hidden rounded-[2.2rem] border p-4 sm:p-5"
          style={{ background: "rgba(255,255,255,0.72)", borderColor: "rgba(255,255,255,0.78)", boxShadow: "var(--shadow-card)", backdropFilter: "blur(24px) saturate(145%)" }}
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(220,233,243,0.8),transparent_24rem),radial-gradient(circle_at_88%_20%,rgba(229,242,239,0.9),transparent_26rem)]" />
          <div className="flex flex-col gap-3 sm:gap-5">
            <div className="max-w-2xl">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.24em] sm:mb-2" style={{ color: "var(--accent)" }}>
                Explore
              </p>
              <h1 className="text-2xl font-semibold sm:text-4xl lg:text-6xl" style={{ color: "var(--ink)" }}>
                Find your next park.
              </h1>
              <p className="hidden sm:block mt-3 max-w-xl text-sm leading-6 sm:text-base" style={{ color: "var(--muted)" }}>
                Search the park system, filter by activity, and build a short list from a clean visual browser.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-3 flex flex-col gap-2.5 sm:mt-6 sm:gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_210px_auto]">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parks, states, trails, wildlife, camping..."
                className="min-h-12 w-full rounded-full border px-5 pr-11 text-[15px] font-medium shadow-none transition-all sm:min-h-14"
                style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-lg leading-none transition-opacity hover:opacity-65"
                  style={{ color: "var(--muted)" }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
              {loading && (
                <svg
                  className="animate-spin absolute right-4 top-1/2 -translate-y-1/2"
                  width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/>
                  <path d="M12 3a9 9 0 019 9"/>
                </svg>
              )}
            </div>

            {/* On mobile: flex row — select gets most space, button gets minimum. On lg: contents → grid children. */}
            <div className="flex gap-2.5 lg:contents">
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="min-w-0 flex-1 min-h-12 rounded-full border px-4 text-sm font-semibold shadow-none sm:min-h-14"
                style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
              >
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>

              <button
                type="submit"
                className="shrink-0 min-h-12 rounded-full px-6 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-95 sm:min-h-14"
                style={{ background: "var(--ink)", boxShadow: "0 14px 34px rgba(17,19,21,0.16)" }}
              >
                Search
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 pr-10">
              {/* Near me chip */}
              <button
                type="button"
                onClick={handleNearMe}
                disabled={nearMeLoading}
                className="shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: userLocation ? "var(--accent)" : "rgba(255,255,255,0.7)",
                  color: userLocation ? "white" : "var(--muted)",
                  border: `1px solid ${userLocation ? "transparent" : "var(--line)"}`,
                }}
              >
                {nearMeLoading ? (
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M12 3a9 9 0 019 9"/>
                  </svg>
                ) : userLocation ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/>
                  </svg>
                )}
                {userLocation ? "Clear location" : "Near me"}
              </button>

              <span className="w-px self-stretch mx-1" style={{ background: "var(--line)" }} aria-hidden="true" />

              {/* Designation toggle */}
              <button
                onClick={() => setNpOnly((v) => !v)}
                className="shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: npOnly ? "#a96f2d" : "rgba(255,255,255,0.7)",
                  color: npOnly ? "white" : "var(--muted)",
                  border: `1px solid ${npOnly ? "transparent" : "var(--line)"}`,
                }}
                title="The US has 63 designated National Parks. The full NPS system manages 474+ sites including monuments, seashores, historic sites, and more."
              >
                {npOnly && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                National Parks only
              </button>

              <span className="w-px self-stretch mx-1" style={{ background: "var(--line)" }} aria-hidden="true" />

              <button
                onClick={() => setActivityFilter("")}
                className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: activityFilter === "" ? "var(--ink)" : "rgba(255,255,255,0.7)",
                  color: activityFilter === "" ? "white" : "var(--muted)",
                  border: "1px solid var(--line)",
                }}
              >
                All activities
              </button>
              {ACTIVITY_FILTERS.map((act) => (
                <button
                  key={act}
                  onClick={() => setActivityFilter(activityFilter === act ? "" : act)}
                  className="shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{
                    background: activityFilter === act ? "var(--accent)" : "rgba(255,255,255,0.7)",
                    color: activityFilter === act ? "white" : "var(--muted)",
                    border: `1px solid ${activityFilter === act ? "transparent" : "var(--line)"}`,
                  }}
                >
                  {act}
                </button>
              ))}
            </div>
            {/* Fade hint for horizontal scroll on mobile */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:hidden" style={{ background: "linear-gradient(to left, rgba(255,255,255,0.82), transparent)" }} />
            </div>
            {nearMeError && (
              <p className="mt-1.5 text-xs font-medium" style={{ color: "#dc2626" }}>{nearMeError}</p>
            )}

            <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
              {loading ? "Searching..." : resultText}
            </p>
          </div>
        </section>

        <section className="flex-1 overflow-hidden">
          <div
            className="flex min-h-[580px] flex-col overflow-hidden rounded-[2rem] border"
            style={{ background: "rgba(255,255,255,0.68)", borderColor: "rgba(255,255,255,0.76)", boxShadow: "var(--shadow-card)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--line)" }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  {npOnly ? "National Parks" : "NPS Sites"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                  {loading ? "Searching…" : resultText}
                </h2>
              </div>
              {error && <p className="max-w-[180px] text-right text-xs font-medium text-red-600">{error}</p>}
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3 sm:px-4">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-[1.6rem] border p-3" style={{ background: "rgba(255,255,255,0.72)", borderColor: "var(--line)" }}>
                      <div className="h-40 rounded-[1.15rem]" style={{ background: "var(--linen)" }} />
                      <div className="mt-4 space-y-2">
                        <div className="h-4 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                        <div className="h-3 w-full rounded-full" style={{ background: "var(--linen)" }} />
                        <div className="h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {displayParks.length === 0 && (
                    <div className="rounded-[1.6rem] border px-6 py-16 text-center md:col-span-2 xl:col-span-3 2xl:col-span-4" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.7)" }}>
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--surface-soft)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>
                        </svg>
                      </div>
                      <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>No parks found</p>
                      <p className="mt-2 max-w-xs mx-auto text-sm leading-6" style={{ color: "var(--muted)" }}>
                        Try a different keyword, change the state, or clear the activity filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setActivityFilter(""); setNpOnly(false); setQuery(""); setStateCode(""); }}
                        className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0"
                        style={{ background: "var(--ink)" }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                  {displayParks.map((park) => {
                    const coords = parseLatLong(park.latLong);
                    const distance = userLocation && coords
                      ? haversineDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
                      : null;
                    return (
                      <ParkListCard
                        key={park.parkCode}
                        park={park}
                        selected={selectedPark === park.parkCode}
                        distance={distance}
                        onHover={() => setSelectedPark(park.parkCode)}
                      />
                    );
                  })}

                  {!activityFilter && parks.length < total && (
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-full py-3.5 text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40 md:col-span-2 xl:col-span-3 2xl:col-span-4"
                      style={{ background: "var(--ink)", color: "white" }}
                    >
                      {loadingMore ? "Loading..." : `Load more parks`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ParkListCard({
  park, selected, distance, onHover,
}: {
  park: Park;
  selected: boolean;
  distance: number | null;
  onHover: () => void;
}) {
  const { toggleFavorite, isFavorite, getVisitStatus, setVisitStatus, toggleCompare, inCompare } = useParkData();
  const image = park.images?.[0];
  const fee = park.entranceFees?.[0];
  const fav = isFavorite(park.parkCode);
  const status = getVisitStatus(park.parkCode);
  const comparing = inCompare(park.parkCode);

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({ code: park.parkCode, name: park.fullName, states: park.states, imageUrl: image?.url });
  };

  const handleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = status === "none" ? "want" : status === "want" ? "been" : "none";
    setVisitStatus(park.parkCode, next);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare({ code: park.parkCode, name: park.fullName });
  };

  return (
    <article onMouseEnter={onHover}>
      <div
        className="group relative overflow-hidden rounded-xl border p-2.5 transition-all duration-300 hover:-translate-y-1"
        style={{
          background: selected ? "rgba(229,242,239,0.92)" : "rgba(255,255,255,0.74)",
          borderColor: selected ? "rgba(23,109,101,0.28)" : "var(--line)",
          boxShadow: selected ? "0 18px 48px rgba(23,109,101,0.13)" : "0 10px 34px rgba(17,19,21,0.06)",
        }}
      >
        {/* Full-card link — action buttons sit above via z-index */}
        <Link href={`/parks/${park.parkCode}`} className="absolute inset-0 z-0 rounded-xl" aria-label={`View ${park.fullName}`} />

        <div className="relative h-44 overflow-hidden rounded-[1.25rem]" style={{ background: "var(--surface-soft)" }}>
          {image && (
            <Image
              src={image.url}
              alt={image.altText}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.1)_48%,rgba(0,0,0,0.52)_100%)]" />
          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1.5">
              {park.designation && (
                <span className="rounded-full border border-white/18 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm leading-tight">
                  {park.designation}
                </span>
              )}
              {distance !== null && (
                <span className="rounded-full border border-white/18 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm leading-tight">
                  {distance < 10 ? distance.toFixed(1) : Math.round(distance)} mi
                </span>
              )}
            </div>
            <span className="rounded-full border border-white/18 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm leading-tight">
              {park.states}
            </span>
          </div>
          <button
            type="button"
            onClick={handleFav}
            className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/22 bg-white/18 text-white backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
            style={{ color: fav ? "#ff7a8a" : "white" }}
            aria-label={fav ? "Remove saved park" : "Save park"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>

        <div className="px-2 pb-2 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-lg font-semibold leading-tight" style={{ color: "var(--ink)" }}>
                {park.fullName}
              </p>
              <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: "var(--muted)" }}>{park.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {fee && (
              <span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {parseFloat(fee.cost) === 0 ? "Free entry" : `$${fee.cost} entry`}
              </span>
            )}
            {park.activities?.slice(0, 2).map((activity) => (
              <span key={activity.id} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(17,19,21,0.05)", color: "var(--muted)" }}>
                {activity.name}
              </span>
            ))}
          </div>

          <div className="relative z-10 mt-4 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStatus}
                data-tip={status === "been" ? "Been here" : status === "want" ? "Want to go" : "Mark visited"}
                className="icon-btn-tooltip flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: status === "been" ? "rgba(23,109,101,0.12)" : status === "want" ? "rgba(169,111,45,0.12)" : "rgba(17,19,21,0.05)",
                  color: status === "been" ? "var(--accent)" : status === "want" ? "var(--amber)" : "var(--muted)",
                }}
                aria-label="Change visit status"
              >
                {status === "been" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : status === "want" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                )}
              </button>
              <button
                type="button"
                onClick={handleCompare}
                data-tip={comparing ? "Remove from compare" : "Compare parks"}
                className="icon-btn-tooltip flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: comparing ? "rgba(169,111,45,0.12)" : "rgba(17,19,21,0.05)",
                  color: comparing ? "var(--amber)" : "var(--muted)",
                }}
                aria-label={comparing ? "Remove from compare" : "Compare park"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </button>
            </div>
            <span className="text-sm font-semibold transition-all group-hover:translate-x-0.5" style={{ color: "var(--ink)" }}>
              Details →
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExploreSkeleton() {
  return (
    <div className="min-h-screen pt-[var(--nav-h)] animate-pulse" style={{ background: "var(--surface)" }}>
      <div className="mx-auto flex max-w-[1680px] flex-col px-4 py-4 sm:px-6">
        <div className="mb-4 rounded-[2.2rem] border p-5" style={{ background: "rgba(255,255,255,0.72)", borderColor: "rgba(255,255,255,0.78)" }}>
          <div className="h-3 w-16 rounded-full mb-3" style={{ background: "var(--linen)" }} />
          <div className="h-10 w-56 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-3 w-80 rounded-full mb-6" style={{ background: "var(--linen)" }} />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="col-span-2 h-14 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="col-span-2 sm:col-span-1 h-14 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-14 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-14 rounded-full" style={{ background: "var(--linen)" }} />
          </div>
        </div>
        <div className="rounded-[2rem] border p-4" style={{ background: "rgba(255,255,255,0.68)", borderColor: "rgba(255,255,255,0.76)" }}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-3" style={{ background: "rgba(255,255,255,0.72)", borderColor: "var(--line)" }}>
                <div className="h-44 rounded-xl mb-4" style={{ background: "var(--linen)" }} />
                <div className="h-4 w-3/4 rounded-full mb-2" style={{ background: "var(--linen)" }} />
                <div className="h-3 w-full rounded-full mb-1" style={{ background: "var(--linen)" }} />
                <div className="h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <ExploreContent />
    </Suspense>
  );
}

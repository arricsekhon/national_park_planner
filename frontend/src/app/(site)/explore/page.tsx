"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { searchParks, parseLatLong, haversineDistance, type Park } from "@/lib/api";
import { useParkData } from "@/lib/park-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
const QUICK_FILTERS = ["Hiking", "Camping", "No entry fee", "Pets allowed", "Permit required"];
const SITE_TYPE_FILTERS = ["National Park", "National Monument", "National Historical Park"];
const DIFFICULTY_FILTERS = ["Easy", "Moderate", "Hard"];
const FEE_FILTERS = ["Free", "Under $20", "$20+"];
const SEASON_FILTERS = ["Spring", "Summer", "Fall", "Winter"];
const TRIP_NEEDS = ["Pets allowed", "Shuttle required", "Permit required", "Good for families"];

function getEntranceCost(park: Park) {
  const fee = park.entranceFees?.[0];
  if (!fee) return null;
  const cost = Number.parseFloat(fee.cost);
  return Number.isFinite(cost) ? cost : null;
}

function getBestSeason(park: Park) {
  const states = park.states.split(",").map((state) => state.trim());
  if (states.some((state) => ["AZ", "UT", "NV", "TX"].includes(state))) return "Oct-Apr";
  if (states.some((state) => ["AK", "MT", "WY", "CO", "ME"].includes(state))) return "Jun-Sep";
  if (states.some((state) => ["FL", "HI", "VI", "PR"].includes(state))) return "Nov-Mar";
  return "Spring-Fall";
}

function getPlanningNotes(park: Park) {
  const activities = park.activities?.map((activity) => activity.name.toLowerCase()) ?? [];
  const notes = [];
  if (activities.some((activity) => activity.includes("hiking"))) notes.push("Check trail conditions");
  if (activities.some((activity) => activity.includes("camping"))) notes.push("Reserve camping early");
  if (park.designation?.includes("National Park")) notes.push("Parking fills early");
  if (park.states.includes("CA") || park.states.includes("UT") || park.states.includes("AZ")) notes.push("Start before heat");
  if (notes.length === 0) notes.push("Check hours before you go");
  return notes.slice(0, 2);
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const { compareList, clearCompare } = useParkData();
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [noEntryFee, setNoEntryFee] = useState(false);
  const [tripNeeds, setTripNeeds] = useState<string[]>([]);
  const [siteTypeFilter, setSiteTypeFilter] = useState("");
  const [feeFilter, setFeeFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [sortBy, setSortBy] = useState("Recommended");
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
    const timer = window.setTimeout(() => {
      fetchParks(query, stateCode);
    }, 0);
    return () => window.clearTimeout(timer);
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
    if (siteTypeFilter) {
      result = result.filter((p) => p.designation === siteTypeFilter);
    }
    if (noEntryFee || feeFilter) {
      result = result.filter((p) => {
        const cost = getEntranceCost(p);
        if (noEntryFee || feeFilter === "Free") return cost === 0;
        if (feeFilter === "Under $20") return cost !== null && cost > 0 && cost < 20;
        if (feeFilter === "$20+") return cost !== null && cost >= 20;
        return true;
      });
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
    if (sortBy !== "Recommended") {
      result = [...result].sort((a, b) => {
        if (sortBy === "Name") return a.fullName.localeCompare(b.fullName);
        if (sortBy === "State") return a.states.localeCompare(b.states) || a.fullName.localeCompare(b.fullName);
        if (sortBy === "Entry fee") return (getEntranceCost(a) ?? 999) - (getEntranceCost(b) ?? 999);
        return 0;
      });
    }
    return result;
  }, [parks, activityFilter, npOnly, userLocation, siteTypeFilter, noEntryFee, feeFilter, sortBy]);

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
  const toggleTripNeed = (need: string) => {
    setTripNeeds((current) => current.includes(need) ? current.filter((item) => item !== need) : [...current, need]);
  };
  const activeLabels = [
    query ? `Search: ${query}` : "",
    stateCode,
    activityFilter,
    npOnly ? "National Parks" : "",
    userLocation ? "Nearest first" : "",
    noEntryFee ? "Free entry" : "",
    ...tripNeeds,
    siteTypeFilter,
    feeFilter,
    seasonFilter,
    difficultyFilter,
  ].filter(Boolean);
  const hasActiveFilters = activeLabels.length > 0;
  const activeFilterCount = activeLabels.length;
  const sheetFilterCount = [stateCode, activityFilter, npOnly, noEntryFee, siteTypeFilter, feeFilter, seasonFilter, difficultyFilter, ...tripNeeds].filter(Boolean).length;
  const clearFilters = () => {
    setQuery("");
    setStateCode("");
    setActivityFilter("");
    setNpOnly(false);
    setUserLocation(null);
    setNoEntryFee(false);
    setTripNeeds([]);
    setSiteTypeFilter("");
    setFeeFilter("");
    setSeasonFilter("");
    setDifficultyFilter("");
    setFilterSheetOpen(false);
    void fetchParks("", "");
  };
  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="app-shell flex min-h-[calc(100vh-66px)] flex-col py-3 sm:py-5">
        <section
          className="app-panel relative z-20 mb-3 overflow-hidden rounded-lg p-3.5 sm:mb-4 sm:p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Explore
              </p>
              <h1 className="text-[1.65rem] font-semibold leading-tight sm:text-3xl" style={{ color: "var(--ink)" }}>
                Find a park that fits your trip.
              </h1>
              <p className="mt-1.5 hidden max-w-xl text-sm leading-6 sm:block" style={{ color: "var(--muted)" }}>
                Search by park, state, trail type, entry fee, season, or trip constraint.
              </p>
              </div>
              <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                {loading ? "Loading park details..." : `${displayParks.length} parks found`}
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-3 flex flex-col gap-2.5 sm:gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_9.5rem_auto]">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parks, trails, fees, season..."
                className="min-h-11 w-full rounded-lg border px-4 pr-16 text-[15px] font-medium shadow-none transition-all"
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
                  className={`animate-spin absolute top-1/2 -translate-y-1/2 ${query ? "right-10" : "right-4"}`}
                  width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/>
                  <path d="M12 3a9 9 0 019 9"/>
                </svg>
              )}
            </div>

            {/* On mobile, detailed filters live in the sheet. On larger screens, state stays inline. */}
            <div className="grid grid-cols-2 gap-2.5 sm:flex lg:contents">
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="hidden min-h-11 w-36 min-w-0 flex-none rounded-lg border px-4 text-sm font-semibold shadow-none sm:block sm:w-44 lg:w-auto"
                style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
              >
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>

              <button
                type="submit"
                className="min-h-11 rounded-lg px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] sm:flex-none sm:px-7"
                style={{ background: "var(--ink)" }}
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition active:scale-[0.98] sm:hidden"
                style={{ background: "rgba(255,255,255,0.78)", borderColor: "var(--line)", color: "var(--ink)" }}
                aria-haspopup="dialog"
                aria-expanded={filterSheetOpen}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16" />
                  <path d="M7 12h10" />
                  <path d="M10 18h4" />
                </svg>
                Filters
                {sheetFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: "var(--accent)" }}>
                    {sheetFilterCount}
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-col gap-2 sm:gap-3">
            <div className="relative -mx-3.5 sm:mx-0">
            <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-1 pr-10 [scrollbar-width:none] sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pr-0 [&::-webkit-scrollbar]:hidden">
              {/* Near me chip */}
              <button
                type="button"
                onClick={handleNearMe}
                disabled={nearMeLoading}
                data-active={userLocation ? "true" : "false"}
                className="app-chip flex shrink-0 items-center gap-1.5 px-3 text-xs font-semibold active:scale-[0.98] disabled:opacity-40"
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

              <span className="mx-1 hidden w-px self-stretch sm:block" style={{ background: "var(--line)" }} aria-hidden="true" />

              {/* Designation toggle */}
              <button
                type="button"
                onClick={() => setNpOnly((v) => !v)}
                data-active={npOnly ? "true" : "false"}
                className="app-chip flex shrink-0 items-center gap-1.5 px-3 text-xs font-semibold active:scale-[0.98]"
                title="The US has 63 designated National Parks. The full NPS system manages 474+ sites including monuments, seashores, historic sites, and more."
              >
                {npOnly && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                National Parks only
              </button>

              {QUICK_FILTERS.map((act) => (
                <button
                  type="button"
                  key={act}
                  onClick={() => {
                    if (act === "No entry fee") {
                      setNoEntryFee((value) => !value);
                      setFeeFilter("");
                    } else if (act === "Pets allowed" || act === "Permit required") {
                      toggleTripNeed(act);
                    } else {
                      setActivityFilter(activityFilter === act ? "" : act);
                    }
                  }}
                  data-active={activityFilter === act || (act === "No entry fee" && noEntryFee) || tripNeeds.includes(act) ? "true" : "false"}
                  className="app-chip shrink-0 px-3 text-xs font-semibold active:scale-[0.98]"
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
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(23,109,101,0.16)", background: "rgba(255,255,255,0.62)" }}>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                <span className="mr-1 uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
                  {activeFilterCount} active
                </span>
                {activeLabels.map((label) => (
                  <span key={label} className="rounded-full bg-white px-2.5 py-1">{label}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 self-start rounded-full px-3 py-1.5 text-xs font-semibold transition hover:bg-white sm:self-auto"
                style={{ color: "var(--ink)" }}
              >
                Reset view
              </button>
            </div>
          )}

        </section>

        {filterSheetOpen && (
          <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Explore filters">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setFilterSheetOpen(false)}
              aria-label="Close filters"
            />
            <div
              className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl border px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-5 shadow-2xl"
              style={{ background: "var(--surface)", borderColor: "rgba(255,255,255,0.82)" }}
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Filters</p>
                  <h2 className="mt-1 text-xl font-semibold" style={{ color: "var(--ink)" }}>Refine results</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-lg leading-none"
                  style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                  aria-label="Close filters"
                >
                  ×
                </button>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-2.5">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>State</span>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="min-h-12 w-full rounded-lg border px-4 text-base font-medium"
                    style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2.5">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>Activity</span>
                  <select
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                    className="min-h-12 w-full rounded-lg border px-4 text-base font-medium"
                    style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    <option value="">All activities</option>
                    {ACTIVITY_FILTERS.map((act) => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => setNpOnly((value) => !value)}
                  className="flex min-h-12 items-center justify-between rounded-lg border px-4 text-left text-base font-medium"
                  style={{
                    background: npOnly ? "rgba(169,111,45,0.12)" : "white",
                    borderColor: npOnly ? "rgba(169,111,45,0.32)" : "var(--line)",
                    color: npOnly ? "var(--amber)" : "var(--ink)",
                  }}
                >
                  <span>National Parks only</span>
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
                    style={{ background: npOnly ? "var(--amber)" : "rgba(17,19,21,0.14)" }}
                  >
                    {npOnly ? "✓" : ""}
                  </span>
                </button>

                <FilterGroup title="Site type" options={SITE_TYPE_FILTERS} value={siteTypeFilter} onChange={setSiteTypeFilter} />
                <FilterGroup title="Difficulty" options={DIFFICULTY_FILTERS} value={difficultyFilter} onChange={setDifficultyFilter} />
                <FilterGroup title="Entry fee" options={FEE_FILTERS} value={feeFilter} onChange={(value) => {
                  setFeeFilter(value);
                  setNoEntryFee(value === "Free");
                }} />
                <FilterGroup title="Best season" options={SEASON_FILTERS} value={seasonFilter} onChange={setSeasonFilter} />
                <TripNeedsFilter values={tripNeeds} onToggle={toggleTripNeed} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-11 rounded-lg border px-4 text-sm font-semibold"
                  style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="min-h-11 rounded-lg px-4 text-sm font-semibold text-white"
                  style={{ background: "var(--ink)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="app-panel hidden self-start rounded-lg p-4 lg:sticky lg:block lg:top-[calc(var(--nav-h)+16px)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>Filters</p>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Narrow by trip basics.</p>
              </div>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                  Clear
                </button>
              )}
            </div>

            <FilterGroup title="Site type" options={SITE_TYPE_FILTERS} value={siteTypeFilter} onChange={setSiteTypeFilter} />
            <FilterGroup title="Difficulty" options={DIFFICULTY_FILTERS} value={difficultyFilter} onChange={setDifficultyFilter} />
            <FilterGroup title="Entry fee" options={FEE_FILTERS} value={feeFilter} onChange={(value) => {
              setFeeFilter(value);
              setNoEntryFee(value === "Free");
            }} />
            <FilterGroup title="Best season" options={SEASON_FILTERS} value={seasonFilter} onChange={setSeasonFilter} />
            <TripNeedsFilter values={tripNeeds} onToggle={toggleTripNeed} />
          </aside>

          <div
            className="app-panel flex min-h-[580px] min-w-0 flex-col overflow-hidden rounded-lg"
          >
            <div className="flex flex-col gap-3 border-b px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4" style={{ borderColor: "var(--line)" }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                  {npOnly ? "National Parks" : "NPS sites"}
                </p>
                <h2 className="mt-1 text-xl font-semibold" style={{ color: "var(--ink)" }}>
                  {loading ? "Loading park details, fees, and alerts..." : `${displayParks.length} parks found`}
                </h2>
                {activeLabels.length > 0 && (
                  <p className="mt-1 max-w-2xl truncate text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {activeLabels.join(" · ")}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                {error && <p className="text-xs font-medium text-red-600">{error}</p>}
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="min-h-10 w-full rounded-lg border px-3 text-xs font-semibold sm:w-auto"
                  style={{ background: "white", borderColor: "var(--line)", color: "var(--ink)" }}
                  aria-label="Sort parks"
                >
                  {["Recommended", "Entry fee", "Name", "State"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-10 w-full rounded-lg border px-3 text-xs font-semibold transition hover:bg-white sm:w-auto"
                    style={{ background: "rgba(255,255,255,0.68)", borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3 sm:px-4">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-lg border p-3" style={{ background: "rgba(255,255,255,0.72)", borderColor: "var(--line)" }}>
                      <div className="h-40 rounded-lg" style={{ background: "var(--linen)" }} />
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
                    <div className="rounded-lg border px-6 py-16 text-center md:col-span-2 xl:col-span-3" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.7)" }}>
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg" style={{ background: "var(--surface-soft)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>
                        </svg>
                      </div>
                      <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>No parks match these filters</p>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-6" style={{ color: "var(--muted)" }}>
                        Try removing “Permit required” or choose another state.
                      </p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
                        style={{ background: "var(--ink)" }}
                      >
                        Clear filters
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

                  {!activityFilter && !siteTypeFilter && !feeFilter && !noEntryFee && parks.length < total && (
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-lg py-3.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 md:col-span-2 xl:col-span-3 2xl:col-span-4"
                      style={{ background: "var(--ink)", color: "white" }}
                    >
                      {loadingMore ? "Loading more parks..." : `Load more parks`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {compareList.length > 0 && (
              <div className="sticky bottom-0 z-30 border-t bg-white/95 px-4 py-3 backdrop-blur" style={{ borderColor: "var(--line)" }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Compare {compareList.length} parks</p>
                    <p className="mt-1 truncate text-xs" style={{ color: "var(--muted)" }}>
                      {compareList.map((park) => park.name).join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/compare" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>
                      Compare
                    </Link>
                    <button type="button" onClick={clearCompare} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--line)", color: "var(--ink)" }}>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterGroup({
  title, options, value, onChange,
}: {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4 border-t pt-3.5" style={{ borderColor: "var(--line)" }}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              type="button"
              key={option}
              onClick={() => onChange(active ? "" : option)}
              className="min-h-8 rounded-md border px-2.5 text-left text-xs font-medium transition hover:bg-white"
              style={{
                background: active ? "var(--accent)" : "rgba(255,255,255,0.58)",
                borderColor: active ? "var(--accent)" : "var(--line)",
                color: active ? "white" : "var(--muted-strong)",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TripNeedsFilter({
  values, onToggle,
}: {
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-4 border-t pt-3.5" style={{ borderColor: "var(--line)" }}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
        Trip needs
      </p>
      <div className="grid gap-1">
        {TRIP_NEEDS.map((need) => {
          const active = values.includes(need);
          return (
            <button
              type="button"
              key={need}
              onClick={() => onToggle(need)}
              className="flex min-h-8 items-center gap-2 rounded-md px-2 text-left text-xs font-medium transition hover:bg-white"
              style={{ color: active ? "var(--accent)" : "var(--muted-strong)" }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]"
                style={{
                  background: active ? "var(--accent)" : "white",
                  borderColor: active ? "var(--accent)" : "var(--line)",
                  color: "white",
                }}
                aria-hidden="true"
              >
                {active ? "✓" : ""}
              </span>
              {need}
            </button>
          );
        })}
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
  const router = useRouter();
  const { toggleFavorite, isFavorite, getVisitStatus, setVisitStatus, toggleCompare, inCompare } = useParkData();
  const image = park.images?.[0];
  const feeCost = getEntranceCost(park);
  const fav = isFavorite(park.parkCode);
  const status = getVisitStatus(park.parkCode);
  const comparing = inCompare(park.parkCode);
  const bestSeason = getBestSeason(park);
  const planningNotes = getPlanningNotes(park);
  const topActivity = park.activities?.[0]?.name ?? "Check activities";
  const entryLabel = feeCost === null ? "Entry check" : feeCost === 0 ? "Free entry" : `$${feeCost} entry`;

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

  const openPark = () => {
    router.push(`/parks/${park.parkCode}`);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPark();
    }
  };

  return (
    <article className="h-full min-w-0" onMouseEnter={onHover}>
      <Card
        role="link"
        tabIndex={0}
        onClick={openPark}
        onKeyDown={handleCardKeyDown}
        className="group relative h-full min-w-0 cursor-pointer gap-0 overflow-hidden rounded-lg pt-0 outline-none transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{
          background: "white",
          borderColor: selected ? "rgba(23,109,101,0.24)" : "var(--line)",
          boxShadow: selected ? "0 12px 28px rgba(23,109,101,0.1)" : "0 5px 18px rgba(17,19,21,0.04)",
        }}
        aria-label={`View ${park.fullName}`}
      >
        <div className="relative z-10 aspect-[16/10] min-w-0 overflow-hidden" style={{ background: "var(--surface-soft)" }}>
          {image ? (
            <Image
              src={image.url}
              alt={image.altText || park.fullName}
              fill
              className="object-cover brightness-[0.96] saturate-[0.95] transition-transform duration-700 group-hover:scale-[1.025]"
              sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--accent-soft),var(--surface-soft))]">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 21 8 8l4.5 8L16 10l6 11H2Z" />
                <path d="M8 21 12 13l4 8" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.08)_55%,rgba(0,0,0,0.26)_100%)]" />
          <div className="absolute left-2.5 right-2.5 top-2.5 z-20 flex min-w-0 items-start justify-between gap-2 sm:left-3 sm:right-3 sm:top-3">
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              {distance !== null && (
                <Badge variant="secondary" className="border-white/18 bg-black/35 text-[10px] leading-tight text-white/90 backdrop-blur-sm">
                  {distance < 10 ? distance.toFixed(1) : Math.round(distance)} mi
                </Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleFav}
            className="absolute bottom-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/28 bg-black/22 text-white backdrop-blur-md transition-all hover:bg-black/32 active:scale-95"
            style={{ color: fav ? "#ff7a8a" : "white" }}
            aria-label={fav ? "Remove saved park" : "Save park"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>

        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <CardHeader className="relative z-10 px-4 pb-0 pt-4">
            <CardAction>
              <span className="text-xs font-semibold leading-none" style={{ color: "var(--muted)" }}>
                {park.states}
              </span>
            </CardAction>
            <CardTitle className="line-clamp-2 pr-1 text-[18px] font-semibold leading-[1.12] text-[var(--ink)] transition-colors group-hover/card:text-[var(--accent)]">
              {park.fullName}
            </CardTitle>
            <p className="mt-1 min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
              {park.designation || "NPS site"}
            </p>
            <CardDescription className="line-clamp-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
              {park.description}
            </CardDescription>
          </CardHeader>

          <div className="relative z-10 min-w-0 px-4 pb-4 pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium">
              <span className="rounded-md border border-[#d8e5df] bg-[#f3f8f5] px-2 py-1 text-[#46645b]">
                {entryLabel}
              </span>
              <span className="rounded-md border border-[#eadfca] bg-[#fbf7ee] px-2 py-1 text-[#755f3a]">
                Best {bestSeason}
              </span>
              <span className="min-w-0 truncate rounded-md border border-[#dfe3e2] bg-[#f6f7f5] px-2 py-1 text-[#5c6464]">
                {topActivity}
              </span>
            </div>

            <div className="mt-3 grid gap-1.5 border-t pt-3" style={{ borderColor: "var(--line)" }}>
              {planningNotes.map((note) => (
                <div key={note} className="flex min-w-0 items-start gap-2 text-xs font-medium leading-5" style={{ color: "var(--muted-strong)" }}>
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                  <span className="min-w-0 break-words">{note}</span>
                </div>
              ))}
            </div>
          </div>

          <CardFooter className="relative z-10 mt-auto flex min-w-0 flex-col items-stretch gap-2 border-t bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--line)" }}>
            <div className="hidden min-w-0 items-center justify-between gap-1 sm:flex sm:justify-start">
              <button
                type="button"
                onClick={handleStatus}
                data-tip={status === "been" ? "Been here" : status === "want" ? "Want to go" : "Mark visited"}
                className="icon-btn-tooltip flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-black/[0.04] active:scale-95"
                style={{
                  background: status === "been" ? "rgba(23,109,101,0.1)" : status === "want" ? "rgba(169,111,45,0.1)" : "transparent",
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
                className="icon-btn-tooltip flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-all hover:bg-black/[0.04] active:scale-95"
                style={{
                  background: comparing ? "rgba(169,111,45,0.1)" : "transparent",
                  color: comparing ? "var(--amber)" : "var(--muted)",
                }}
                aria-label={comparing ? "Remove from compare" : "Compare park"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span className="hidden sm:inline">Compare</span>
              </button>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button asChild variant="outline" size="sm" className="relative z-20 h-10 px-2 text-[var(--muted-strong)] hover:bg-[var(--surface-soft)] sm:h-7">
                <Link href="/planner" onClick={(e) => e.stopPropagation()}>Add to trip</Link>
              </Button>
              <Button asChild size="sm" className="relative z-20 h-10 bg-[var(--ink)] text-white transition-all hover:bg-[#252a2d] group-hover:translate-x-0.5 sm:h-7">
                <Link href={`/parks/${park.parkCode}`} onClick={(e) => e.stopPropagation()}>Details</Link>
              </Button>
            </div>
          </CardFooter>
        </div>
      </Card>
    </article>
  );
}

function ExploreSkeleton() {
  return (
    <div className="min-h-screen pt-[var(--nav-h)] animate-pulse" style={{ background: "var(--surface)" }}>
      <div className="app-shell flex flex-col py-4 sm:py-5">
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

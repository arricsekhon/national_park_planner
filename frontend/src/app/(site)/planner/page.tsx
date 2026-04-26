"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { searchParks, type Park } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  startDate: string;
  endDate: string;
  stops: TripStop[];
  notes: string;
  createdAt: string;
}

type IconName =
  | "calendar"
  | "check"
  | "chevron"
  | "close"
  | "map"
  | "note"
  | "plus"
  | "print"
  | "route"
  | "search"
  | "share"
  | "trash";

const STORAGE_KEY = "trailquest_trips";
const DAY_MS = 86400000;

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getTripDays(startDate: string, endDate: string): number {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (!start || !end) return 0;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
}

function formatDate(value: string): string {
  const date = parseInputDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function dateSummary(trip: Trip): string {
  if (trip.startDate && trip.endDate) {
    return `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`;
  }
  if (trip.startDate) return `Starts ${formatDate(trip.startDate)}`;
  if (trip.endDate) return `Ends ${formatDate(trip.endDate)}`;
  return "Dates not set";
}

function stopSummary(count: number): string {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function generatePackingList(stops: TripStop[], startDate: string, endDate: string): string[] {
  const start = parseInputDate(startDate);
  const days = start && endDate ? Math.max(1, getTripDays(startDate, endDate)) : 1;
  const month = start ? start.getMonth() : new Date().getMonth();
  const isCold = month <= 2 || month >= 10;
  const isMultiDay = days > 1;

  const list = [
    "Water (2-3L per person per day)",
    "Trail snacks / energy bars",
    "Hiking boots or trail shoes",
    "Wool or moisture-wicking socks",
    "Navigation (downloaded maps / GPS)",
    "First aid kit",
    "Sunscreen SPF 30+",
    "Sunglasses",
    "Headlamp + extra batteries",
    "Emergency whistle",
    "Pocket knife or multi-tool",
    "Phone charger / power bank",
    "ID and park pass",
  ];

  if (isCold) {
    list.push("Insulated jacket / puffy", "Gloves and warm hat", "Thermal base layer");
  } else {
    list.push("Breathable hat or sun hat", "Lightweight rain jacket");
  }

  if (isMultiDay) {
    list.push(
      `Tent or shelter for ${days} nights`,
      "Sleeping bag rated for conditions",
      "Sleeping pad",
      `Food for ${days} days`,
      "Bear canister or hang bag",
      "Camp stove + fuel",
      "Water filter / purification tablets",
      "Trekking poles",
      "Camp towel",
      "Toiletry kit + waste bags",
    );
  }

  if (stops.length > 1) list.push("Detailed area map (paper backup)");
  return list;
}

function loadTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTrips(trips: Trip[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function rowToTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    name: row.name as string,
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    stops: (row.stops as TripStop[]) ?? [],
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
  };
}

export default function PlannerPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parkSearch, setParkSearch] = useState("");
  const [parkResults, setParkResults] = useState<Park[]>([]);
  const [searching, setSearching] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    if (!user) {
      const loaded = loadTrips();
      setTrips(loaded);
      setActiveId(loaded[0]?.id ?? null);
      return;
    }

    supabase
      .from("trips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        let loaded = data ? data.map((r) => rowToTrip(r as Record<string, unknown>)) : [];

        // Migrate any _draft trip from localStorage into Supabase
        const lsTrips = loadTrips();
        const draft = lsTrips.find((t) => t.id === "_draft");
        if (draft) {
          const migratedDraft: Trip = { ...draft, id: createLocalId("trip") };
          loaded = [migratedDraft, ...loaded];
          void supabase.from("trips").insert({
            id: migratedDraft.id,
            user_id: user.id,
            name: migratedDraft.name,
            start_date: migratedDraft.startDate,
            end_date: migratedDraft.endDate,
            stops: migratedDraft.stops,
            notes: migratedDraft.notes,
            created_at: migratedDraft.createdAt,
          });
          const remaining = lsTrips.filter((t) => t.id !== "_draft");
          saveTrips(remaining);
        }

        setTrips(loaded);
        setActiveId(loaded[0]?.id ?? null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const activeTrip = trips.find((t) => t.id === activeId) ?? null;

  const updateTrip = useCallback((updated: Trip) => {
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      if (!user) saveTrips(next);
      return next;
    });
    if (user) {
      void supabase.from("trips").update({
        name: updated.name,
        start_date: updated.startDate,
        end_date: updated.endDate,
        stops: updated.stops,
        notes: updated.notes,
      }).eq("id", updated.id).eq("user_id", user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const newTrip = () => {
    const trip: Trip = {
      id: createLocalId("trip"),
      name: "My Trip",
      startDate: "",
      endDate: "",
      stops: [],
      notes: "",
      createdAt: new Date().toISOString(),
    };
    const next = [trip, ...trips];
    setTrips(next);
    setActiveId(trip.id);
    if (user) {
      supabase.from("trips").insert({
        id: trip.id,
        user_id: user.id,
        name: trip.name,
        start_date: trip.startDate,
        end_date: trip.endDate,
        stops: trip.stops,
        notes: trip.notes,
        created_at: trip.createdAt,
      }).then(({ error }) => {
        if (error) console.error("[planner] insert error:", error);
      });
    } else {
      saveTrips(next);
    }
  };

  const saveTrip = async () => {
    if (!activeTrip) return;
    setSaving(true);
    if (!user) {
      saveTrips(trips);
      setSaving(false);
      setSaveMsg("saved");
      setTimeout(() => setSaveMsg(null), 2500);
      return;
    }
    const { error } = await supabase.from("trips").upsert({
      id: activeTrip.id,
      user_id: user.id,
      name: activeTrip.name,
      start_date: activeTrip.startDate,
      end_date: activeTrip.endDate,
      stops: activeTrip.stops,
      notes: activeTrip.notes,
      created_at: activeTrip.createdAt,
    });
    setSaving(false);
    if (error) {
      console.error("[planner] save error:", error);
      setSaveMsg("error");
    } else {
      setSaveMsg("saved");
    }
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const deleteTrip = (id: string) => {
    const next = trips.filter((t) => t.id !== id);
    setTrips(next);
    setActiveId(next[0]?.id ?? null);
    if (user) {
      void supabase.from("trips").delete().eq("id", id).eq("user_id", user.id);
    } else {
      saveTrips(next);
    }
  };

  const searchIdRef = useRef(0);
  const searchForParks = useCallback(async (q: string) => {
    if (!q.trim()) {
      setParkResults([]);
      return;
    }
    const id = ++searchIdRef.current;
    setSearching(true);
    try {
      const data = await searchParks(q, "", 0, 8);
      if (id !== searchIdRef.current) return;
      setParkResults(data.parks);
    } catch {
      if (id !== searchIdRef.current) return;
      setParkResults([]);
    } finally {
      if (id === searchIdRef.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchForParks(parkSearch), 350);
    return () => clearTimeout(t);
  }, [parkSearch, searchForParks]);

  const addStop = (park: Park) => {
    if (!activeTrip) return;
    const stop: TripStop = {
      id: createLocalId("stop"),
      parkCode: park.parkCode,
      parkName: park.fullName,
      day: (activeTrip.stops[activeTrip.stops.length - 1]?.day ?? 0) + 1,
      notes: "",
    };
    updateTrip({ ...activeTrip, stops: [...activeTrip.stops, stop] });
    setParkSearch("");
    setParkResults([]);
  };

  const removeStop = (stopId: string) => {
    if (!activeTrip) return;
    updateTrip({ ...activeTrip, stops: activeTrip.stops.filter((s) => s.id !== stopId) });
  };

  const updateStop = (stopId: string, patch: Partial<TripStop>) => {
    if (!activeTrip) return;
    const stops = activeTrip.stops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop));
    updateTrip({ ...activeTrip, stops });
  };

  const packingList = activeTrip
    ? generatePackingList(activeTrip.stops, activeTrip.startDate, activeTrip.endDate)
    : [];
  const tripDays = activeTrip ? getTripDays(activeTrip.startDate, activeTrip.endDate) : 0;

  return (
    <div
      className="min-h-screen pt-[66px]"
      style={{
        background:
          "linear-gradient(180deg, rgba(251,251,248,0.92) 0%, rgba(245,246,243,0.96) 48%, rgba(251,251,248,1) 100%)",
      }}
    >
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          className="rounded-lg border bg-white/80 p-4 lg:sticky lg:top-[82px] lg:h-[calc(100vh-98px)]"
          style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)", backdropFilter: "blur(18px)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
                Planner
              </p>
              <h1 className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                Trip Studio
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {trips.length} {trips.length === 1 ? "trip" : "trips"} saved locally
              </p>
            </div>
            <button
              type="button"
              onClick={newTrip}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: "var(--ink)", boxShadow: "0 12px 26px rgba(17,19,21,0.16)" }}
              aria-label="New trip"
              title="New trip"
            >
              <Icon name="plus" />
            </button>
          </div>

          <div className="mt-5 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-220px)]">
            {trips.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center" style={{ borderColor: "var(--line)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  No trips yet
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Create a trip to start planning.
                </p>
              </div>
            )}

            {trips.map((trip) => {
              const active = activeId === trip.id;
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setActiveId(trip.id)}
                  className="w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5"
                  style={{
                    background: active ? "var(--ink)" : "rgba(255,255,255,0.72)",
                    borderColor: active ? "var(--ink)" : "var(--line)",
                    color: active ? "white" : "var(--ink)",
                    boxShadow: active ? "0 14px 32px rgba(17,19,21,0.18)" : "none",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ background: active ? "rgba(255,255,255,0.12)" : "var(--accent-soft)", color: active ? "white" : "var(--accent)" }}
                    >
                      <Icon name="route" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{trip.name || "Untitled trip"}</span>
                      <span className="mt-1 block truncate text-xs" style={{ color: active ? "rgba(255,255,255,0.68)" : "var(--muted)" }}>
                        {stopSummary(trip.stops.length)} - {dateSummary(trip)}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0">
          {!activeTrip ? (
            <div
              className="flex min-h-[calc(100vh-98px)] flex-col items-center justify-center rounded-lg border bg-white/80 px-6 py-16 text-center"
              style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <Icon name="map" className="h-6 w-6" />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
                No active trip
              </p>
              <h2 className="mt-2 max-w-xl text-4xl font-semibold" style={{ color: "var(--ink)" }}>
                Start a park route.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7" style={{ color: "var(--muted)" }}>
                Create a trip, add stops, and keep the route details in one workspace.
              </p>
              <button
                type="button"
                onClick={newTrip}
                className="mt-7 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "var(--ink)" }}
              >
                <Icon name="plus" />
                Create trip
              </button>
            </div>
          ) : (
            <>
              <section
                className="overflow-hidden rounded-lg border p-5 text-white sm:p-6"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(17,19,21,0.98) 0%, rgba(31,54,54,0.96) 54%, rgba(122,98,60,0.88) 100%)",
                  borderColor: "rgba(255,255,255,0.14)",
                  boxShadow: "0 22px 70px rgba(17,19,21,0.16)",
                }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
                        <Icon name="route" className="h-4 w-4" />
                      </span>
                      Current itinerary
                    </div>
                    <input
                      type="text"
                      value={activeTrip.name}
                      onChange={(e) => updateTrip({ ...activeTrip, name: e.target.value })}
                      className="mt-4 w-full border-none p-0 text-4xl font-semibold leading-tight text-white outline-none md:text-5xl"
                      style={{ background: "transparent" }}
                      placeholder="Trip name"
                    />
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/72">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3 py-2">
                        <Icon name="calendar" className="h-4 w-4" />
                        {dateSummary(activeTrip)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3 py-2">
                        <Icon name="map" className="h-4 w-4" />
                        {stopSummary(activeTrip.stops.length)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <ShareTripButton trip={activeTrip} />
                    <button
                      type="button"
                      onClick={saveTrip}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/16 px-3 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                      style={{
                        color: saveMsg === "saved" ? "#86efac" : saveMsg === "error" ? "#f87171" : "rgba(255,255,255,0.78)",
                        borderColor: saveMsg === "saved" ? "rgba(134,239,172,0.3)" : saveMsg === "error" ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.16)",
                      }}
                    >
                      <Icon name="check" className="h-4 w-4" />
                      {saving ? "Saving…" : saveMsg === "saved" ? "Saved!" : saveMsg === "error" ? "Error" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/16 px-3 py-2 text-sm font-semibold text-white/78 transition hover:bg-white/10"
                    >
                      <Icon name="print" className="h-4 w-4" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTrip(activeTrip.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/16 px-3 py-2 text-sm font-semibold text-white/78 transition hover:bg-white/10"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Stops", value: activeTrip.stops.length.toString(), icon: "map" as IconName },
                    { label: "Days", value: tripDays ? tripDays.toString() : "Set dates", icon: "calendar" as IconName },
                    { label: "Pack items", value: packingList.length.toString(), icon: "check" as IconName },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur-xl">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-2xl font-semibold">{value}</p>
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white/72">
                          <Icon name={icon} className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
                <section className="min-w-0 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                        <Icon name="calendar" className="h-4 w-4" />
                        Start date
                      </span>
                      <input
                        type="date"
                        value={activeTrip.startDate}
                        onChange={(e) => updateTrip({ ...activeTrip, startDate: e.target.value })}
                        className="mt-3 w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none"
                        style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                      />
                    </label>
                    <label className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                        <Icon name="calendar" className="h-4 w-4" />
                        End date
                      </span>
                      <input
                        type="date"
                        value={activeTrip.endDate}
                        onChange={(e) => updateTrip({ ...activeTrip, endDate: e.target.value })}
                        className="mt-3 w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none"
                        style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                          Itinerary
                        </p>
                        <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                          Route Builder
                        </h2>
                      </div>
                      <div className="relative w-full lg:max-w-sm">
                        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search parks to add"
                          value={parkSearch}
                          onChange={(e) => setParkSearch(e.target.value)}
                          className="w-full rounded-lg border py-3 pl-10 pr-3 text-sm font-medium outline-none"
                          style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                        />
                        {(parkResults.length > 0 || searching) && (
                          <div
                            className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border bg-white"
                            style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card-hover)" }}
                          >
                            {searching && (
                              <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
                                Searching...
                              </p>
                            )}
                            {parkResults.map((park) => (
                              <button
                                key={park.parkCode}
                                type="button"
                                onClick={() => addStop(park)}
                                className="flex w-full items-center gap-3 border-t px-4 py-3 text-left text-sm transition-colors hover:bg-stone-50"
                                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-semibold">{park.fullName}</span>
                                  <span className="mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
                                    {park.states || "National Park Service"}
                                  </span>
                                </span>
                                <span
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                                >
                                  <Icon name="plus" className="h-4 w-4" />
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {activeTrip.stops.length === 0 ? (
                      <div className="mt-5 rounded-lg border border-dashed px-5 py-10 text-center" style={{ borderColor: "rgba(17,19,21,0.16)" }}>
                        <span
                          className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg"
                          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                        >
                          <Icon name="map" className="h-5 w-5" />
                        </span>
                        <p className="mt-4 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          No stops yet
                        </p>
                        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                          Search for a park and add it to the route.
                        </p>
                      </div>
                    ) : (
                      <div className="relative mt-5 space-y-3">
                        <div className="absolute bottom-8 left-5 top-8 w-px bg-stone-200" />
                        {activeTrip.stops.map((stop, i) => (
                          <div key={stop.id} className="relative grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[44px_minmax(0,1fr)_auto]" style={{ borderColor: "var(--line)" }}>
                            <div
                              className="z-10 flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white"
                              style={{ background: i === 0 ? "var(--accent)" : "var(--ink)" }}
                            >
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/parks/${stop.parkCode}`}
                                  className="truncate text-base font-semibold transition hover:opacity-70"
                                  style={{ color: "var(--ink)" }}
                                >
                                  {stop.parkName}
                                </Link>
                                <label
                                  className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold"
                                  style={{ background: "var(--surface-soft)", color: "var(--muted-strong)" }}
                                >
                                  Day
                                  <input
                                    type="number"
                                    min={1}
                                    value={stop.day}
                                    onChange={(e) => updateStop(stop.id, { day: Math.max(1, Number(e.target.value) || 1) })}
                                    className="w-10 border-none p-0 text-xs font-semibold outline-none"
                                    style={{ background: "transparent", color: "var(--ink)" }}
                                  />
                                </label>
                              </div>
                              <input
                                type="text"
                                placeholder="Trail ideas, arrival time, campsite..."
                                value={stop.notes}
                                onChange={(e) => updateStop(stop.id, { notes: e.target.value })}
                                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                                style={{ borderColor: "var(--line)", color: "var(--ink-soft)", background: "rgba(251,251,248,0.74)" }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStop(stop.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-red-50"
                              style={{ color: "var(--muted)" }}
                              aria-label={`Remove ${stop.parkName}`}
                              title="Remove stop"
                            >
                              <Icon name="close" className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-4 xl:sticky xl:top-[82px] xl:self-start">
                  <div className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 p-4 text-left"
                      onClick={() => setShowChecklist((s) => !s)}
                    >
                      <span>
                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                          <Icon name="check" className="h-4 w-4" />
                          Packing
                        </span>
                        <span className="mt-1 block text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                          Checklist
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                          {packingList.length} items
                        </span>
                        <Icon
                          name="chevron"
                          className={`h-4 w-4 transition ${showChecklist ? "rotate-180" : ""}`}
                        />
                      </span>
                    </button>
                    {showChecklist && (
                      <div className="max-h-[420px] overflow-y-auto border-t p-4" style={{ borderColor: "var(--line)" }}>
                        <div className="space-y-2">
                          {packingList.map((item, i) => (
                            <label key={i} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-stone-50">
                              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-teal-700" />
                              <span className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                                {item}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      <Icon name="note" className="h-4 w-4" />
                      Notes
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                      Trip notes
                    </h3>
                    <textarea
                      value={activeTrip.notes}
                      onChange={(e) => updateTrip({ ...activeTrip, notes: e.target.value })}
                      placeholder="Reservations, permit numbers, route reminders..."
                      rows={8}
                      className="mt-4 w-full resize-none rounded-lg border px-3 py-3 text-sm leading-6 outline-none"
                      style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                    />
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ShareTripButton({ trip }: { trip: Trip }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const payload = btoa(encodeURIComponent(JSON.stringify(trip)));
      const url = `${window.location.origin}/planner?trip=${payload}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore clipboard errors */
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
      style={{
        color: "rgba(255,255,255,0.78)",
        borderColor: "rgba(255,255,255,0.16)",
        background: copied ? "rgba(255,255,255,0.12)" : "transparent",
      }}
    >
      <Icon name="share" className="h-4 w-4" />
      {copied ? "Copied" : "Share"}
    </button>
  );
}

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "calendar":
      return (
        <svg {...common}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "print":
      return (
        <svg {...common}>
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6" cy="19" r="3" />
          <circle cx="18" cy="5" r="3" />
          <path d="M12 19h3a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h3" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
  }
}

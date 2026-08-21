"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { searchParks, parseLatLong, type Park } from "@/lib/api";
import type { StopCoord } from "./TripMap";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { SyncNotice } from "@/app/components/ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TripStop {
  id: string;
  parkCode: string;
  parkName: string;
  day: number;
  notes: string;
  lat?: number;
  lng?: number;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  stops: TripStop[];
  notes: string;
  createdAt: string;
  isPublic?: boolean;
}

interface AiItineraryDay {
  day: number;
  label: string;
  parkName: string;
  activities: string[];
  tip: string;
}

interface AiItinerary {
  summary: string;
  days: AiItineraryDay[];
  packingAdditions: string[];
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
const PACKED_STORAGE_KEY = "trailquest_packed_items";
const DAY_MS = 86400000;
const TRIP_STARTERS = [
  {
    name: "Yosemite long weekend",
    label: "3 days",
    detail: "Arrival day, main hike, short route before leaving.",
    notes: "Check parking early, shuttle timing, and a rainy-day backup.",
  },
  {
    name: "Utah parks road trip",
    label: "5 days",
    detail: "Compare drive time, heat, and permit notes.",
    notes: "Keep hikes short in the afternoon and add water stops.",
  },
  {
    name: "Olympic rain backup plan",
    label: "2 days",
    detail: "Forest walk, coast stop, and flexible weather notes.",
    notes: "Pack rain shell, check road status, and save an indoor backup.",
  },
  {
    name: "Family day hike",
    label: "1 day",
    detail: "Easy trail, lunch stop, parking note, and backup viewpoint.",
    notes: "Keep the route short, add restroom stops, and check pets on trails.",
  },
];

const EMPTY_ROUTE_DAYS = [
  ["Day 1", "Add arrival stop", "Add main trail", "Add backup stop"],
  ["Day 2", "Add morning stop", "Add scenic stop", "Add notes"],
];

const TRIP_READY_ITEMS = [
  "Dates set",
  "First stop added",
  "Packing list reviewed",
  "Notes added",
];

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

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function createdSummary(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";
  return `Draft - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}`;
}

function packingCategory(item: string): string {
  const lower = item.toLowerCase();
  if (lower.includes("water") || lower.includes("snack") || lower.includes("food") || lower.includes("stove")) return "Water + food";
  if (lower.includes("boot") || lower.includes("sock") || lower.includes("jacket") || lower.includes("hat") || lower.includes("glove") || lower.includes("layer")) return "Clothing";
  if (lower.includes("map") || lower.includes("navigation") || lower.includes("gps") || lower.includes("charger")) return "Navigation";
  if (lower.includes("first aid") || lower.includes("whistle") || lower.includes("sunscreen") || lower.includes("headlamp") || lower.includes("knife")) return "Safety";
  if (lower.includes("id") || lower.includes("pass") || lower.includes("permit")) return "Park documents";
  return "Camp";
}

function groupPackingItems(items: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const category = packingCategory(item);
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return Array.from(groups.entries());
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

function loadPackedItems(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PACKED_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePackedItems(items: Record<string, string[]>) {
  localStorage.setItem(PACKED_STORAGE_KEY, JSON.stringify(items));
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
    isPublic: (row.is_public as boolean) ?? false,
  };
}

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tripsReady, setTripsReady] = useState(false);
  const [parkSearch, setParkSearch] = useState("");
  const [parkResults, setParkResults] = useState<Park[]>([]);
  const [searching, setSearching] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<"saved" | "error" | null>(null);
  const [packedItemsByTrip, setPackedItemsByTrip] = useState<Record<string, string[]>>(() => loadPackedItems());
  const [mobileTab, setMobileTab] = useState<"trips" | "plan" | "map" | "notes">("trips");
  const [tripSheetOpen, setTripSheetOpen] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiItinerary | null>(null);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      queueMicrotask(() => {
        const loaded = loadTrips();
        setTrips(loaded);
        setActiveId(loaded[0]?.id ?? null);
        setTripsReady(true);
      });
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
        setTripsReady(true);
      });
  }, [user, authLoading]);

  const activeTrip = trips.find((t) => t.id === activeId) ?? null;

  // Auto-switch to editor on mobile when a trip is selected
  useEffect(() => {
    if (!activeId) return;
    const timer = window.setTimeout(() => setMobileTab("plan"), 0);
    return () => window.clearTimeout(timer);
  }, [activeId]);

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
  }, [user]);

  const newTrip = (starter?: { name?: string; notes?: string }) => {
    const trip: Trip = {
      id: createLocalId("trip"),
      name: starter?.name ?? "My Trip",
      startDate: "",
      endDate: "",
      stops: [],
      notes: starter?.notes ?? "",
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
      toast("Failed to save trip", "error");
    } else {
      setSaveMsg("saved");
      toast("Trip saved");
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
    const coords = parseLatLong(park.latLong ?? "");
    const stop: TripStop = {
      id: createLocalId("stop"),
      parkCode: park.parkCode,
      parkName: park.fullName,
      day: (activeTrip.stops[activeTrip.stops.length - 1]?.day ?? 0) + 1,
      notes: "",
      ...(coords ?? {}),
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
  const packedItems = activeTrip ? packedItemsByTrip[activeTrip.id] ?? [] : [];
  const packedCount = packedItems.filter((item) => packingList.includes(item)).length;
  const tripDays = activeTrip ? getTripDays(activeTrip.startDate, activeTrip.endDate) : 0;

  const togglePackedItem = (item: string, checked: boolean) => {
    if (!activeTrip) return;
    setPackedItemsByTrip((prev) => {
      const current = new Set(prev[activeTrip.id] ?? []);
      if (checked) {
        current.add(item);
      } else {
        current.delete(item);
      }
      const next = { ...prev, [activeTrip.id]: Array.from(current) };
      savePackedItems(next);
      return next;
    });
  };

  const generateItinerary = async () => {
    if (!activeTrip || !activeTrip.stops.length) return;
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripName: activeTrip.name,
          startDate: activeTrip.startDate,
          endDate: activeTrip.endDate,
          tripDays,
          stops: activeTrip.stops,
        }),
      });
      const data = await res.json() as AiItinerary & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setAiResult(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyItinerary = () => {
    if (!activeTrip || !aiResult) return;
    const updatedStops = activeTrip.stops.map((stop) => {
      const match = aiResult.days.find(
        (d) => d.parkName.toLowerCase().includes(stop.parkName.split(" ")[0].toLowerCase())
      ) ?? aiResult.days[stop.day - 1] ?? aiResult.days[0];
      if (!match) return stop;
      const notes = match.activities.join(" · ") + (match.tip ? ` — ${match.tip}` : "");
      return { ...stop, day: match.day, notes };
    });
    updateTrip({ ...activeTrip, stops: updatedStops });
    setAiResult(null);
    toast("Itinerary applied to your planner!");
  };

  return (
    <div
      className="min-h-screen pt-[var(--nav-h)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(251,251,248,0.92) 0%, rgba(245,246,243,0.96) 48%, rgba(251,251,248,1) 100%)",
      }}
    >
      {!user && (
        <SyncNotice>Sign in to sync trips across devices.</SyncNotice>
      )}
      <div className="sticky top-[var(--nav-h)] z-30 border-b bg-white/95 px-3 py-2 backdrop-blur lg:hidden" style={{ borderColor: "var(--line)" }}>
        <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as typeof mobileTab)} className="gap-0">
          <TabsList className="grid h-10 w-full grid-cols-4 rounded-lg bg-[var(--surface)] p-1">
            <TabsTrigger value="trips" className="rounded-md text-xs">Trips</TabsTrigger>
            <TabsTrigger value="plan" className="rounded-md text-xs" disabled={!activeTrip}>Plan</TabsTrigger>
            <TabsTrigger value="map" className="rounded-md text-xs" disabled={!activeTrip}>Map</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-md text-xs" disabled={!activeTrip}>Notes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-66px)] w-full max-w-[1760px] gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={`${mobileTab === "trips" ? "block" : "hidden"} lg:block rounded-lg border bg-white/75 p-3.5 lg:sticky lg:top-[82px] lg:h-[calc(100vh-98px)]`}
          style={{ borderColor: "var(--line)", backdropFilter: "blur(18px)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Planner
              </p>
              <h1 className="mt-1 text-xl font-semibold" style={{ color: "var(--ink)" }}>
                Trips
              </h1>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                Draft routes, dates, packing, and notes.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => newTrip()}
              size="icon-lg"
              className="shrink-0 bg-[var(--ink)] text-white shadow-[0_12px_26px_rgba(17,19,21,0.16)] hover:bg-[var(--ink)]/90"
              aria-label="New trip"
              title="New trip"
            >
              <Icon name="plus" />
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border bg-[var(--surface)] px-3 py-2" style={{ borderColor: "var(--line)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              {trips.length} {trips.length === 1 ? "trip" : "trips"} {user ? "synced" : "saved locally"}
            </span>
            <Badge variant="secondary" className="rounded-md bg-[var(--sand)] px-2 py-1 text-[11px] font-semibold text-[var(--ink)]">
              Drafts
            </Badge>
          </div>

          <div className="mt-3 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-250px)]">
            {!tripsReady && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} size="sm" className="border bg-white/75 shadow-none" style={{ borderColor: "var(--line)" }}>
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-md bg-[var(--linen)]" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <Skeleton className="h-3.5 w-3/4 rounded-full bg-[var(--linen)]" />
                        <Skeleton className="h-3 w-1/2 rounded-full bg-[var(--linen)]" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {tripsReady && trips.length === 0 && (
              <div className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.72)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Start with a trip shape</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                  Pick a starter or create a blank route.
                </p>
                <div className="mt-3 grid gap-2">
                  {TRIP_STARTERS.map((starter) => (
                    <button
                      key={starter.name}
                      type="button"
                      onClick={() => newTrip(starter)}
                      className="rounded-lg border bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    >
                      <span className="block text-xs font-semibold">{starter.name}</span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: "var(--muted)" }}>{starter.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => newTrip()}
                    className="rounded-lg border border-dashed bg-white px-3 py-2.5 text-left transition hover:-translate-y-0.5"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                  >
                    <span className="block text-xs font-semibold">Blank trip</span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: "var(--muted)" }}>Start from scratch</span>
                  </button>
                </div>
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
                      <span className="flex items-start justify-between gap-3">
                        <span className="block truncate text-sm font-semibold">{trip.name || "Untitled trip"}</span>
                        <span className="shrink-0 text-[11px] font-semibold opacity-80">Open</span>
                      </span>
                      <span className="mt-1 block truncate text-xs" style={{ color: active ? "rgba(255,255,255,0.68)" : "var(--muted)" }}>
                        {dateSummary(trip)}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: active ? "rgba(255,255,255,0.12)" : "var(--surface-soft)", color: active ? "white" : "var(--muted-strong)" }}>
                          {stopSummary(trip.stops.length)}
                        </span>
                        <span className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: active ? "rgba(255,255,255,0.12)" : "var(--sand)", color: active ? "white" : "var(--ink)" }}>
                          {createdSummary(trip.createdAt)}
                        </span>
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className={`${mobileTab === "trips" ? "hidden" : "block"} lg:block min-w-0`}>
          {!activeTrip ? (
            <div
              className="min-h-[calc(100vh-98px)] rounded-lg border bg-white/80 p-5 sm:p-7"
              style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
            >
              <div className="grid min-h-[calc(100vh-154px)] gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.65fr)] lg:items-center">
                <section>
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <Icon name="map" className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
                    Trip planner
                  </p>
                  <h2 className="mt-2 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
                    Start a trip plan with the first park.
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7" style={{ color: "var(--muted)" }}>
                    Create a trip, add park stops, then keep dates, packing, and notes with the route.
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {TRIP_STARTERS.map((starter) => (
                      <button
                        key={starter.name}
                        type="button"
                        onClick={() => newTrip(starter)}
                        className="rounded-lg border bg-white p-4 text-left transition hover:-translate-y-0.5"
                        style={{ borderColor: "var(--line)", boxShadow: "0 10px 26px rgba(17,19,21,0.05)" }}
                      >
                        <span className="inline-flex rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--sand)", color: "var(--ink)" }}>
                          {starter.label}
                        </span>
                        <span className="mt-3 block text-sm font-semibold" style={{ color: "var(--ink)" }}>{starter.name}</span>
                        <span className="mt-1 block text-xs leading-5" style={{ color: "var(--muted)" }}>{starter.detail}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => newTrip()}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: "var(--ink)" }}
                  >
                    <Icon name="plus" />
                    Create blank trip
                  </button>
                </section>

                <section className="rounded-lg border p-4 sm:p-5" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.76)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                    What the planner tracks
                  </p>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["1", "Add park stops", "Search NPS parks and keep each stop tied to a travel day."],
                      ["2", "Draft the itinerary", "Use the AI draft after stops are added, then edit the notes yourself."],
                      ["3", "Check before you go", "Packing list, route map, saved notes, print, and sharing stay with the trip."],
                    ].map(([step, title, detail]) => (
                      <div key={step} className="flex gap-3 rounded-lg border bg-white p-3" style={{ borderColor: "var(--line)" }}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
                          {step}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</span>
                          <span className="mt-1 block text-xs leading-5" style={{ color: "var(--muted)" }}>{detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <>
              <Card
                className="gap-0 rounded-lg border bg-white py-0"
                style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
              >
                <CardHeader className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      <Sheet open={tripSheetOpen} onOpenChange={setTripSheetOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 bg-white lg:hidden">
                            <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
                            Trips
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-white p-0">
                          <SheetHeader className="border-b" style={{ borderColor: "var(--line)" }}>
                            <SheetTitle>Saved trips</SheetTitle>
                            <SheetDescription>Open a route, dates, packing, and notes.</SheetDescription>
                          </SheetHeader>
                          <div className="flex-1 overflow-y-auto p-3">
                            <Button
                              type="button"
                              onClick={() => {
                                newTrip();
                                setTripSheetOpen(false);
                              }}
                              className="mb-3 w-full bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90"
                            >
                              <Icon name="plus" className="h-4 w-4" />
                              New trip
                            </Button>
                            <div className="space-y-2">
                              {trips.map((trip) => (
                                <button
                                  key={trip.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveId(trip.id);
                                    setMobileTab("plan");
                                    setTripSheetOpen(false);
                                  }}
                                  className="w-full rounded-lg border bg-white p-3 text-left"
                                  style={{ borderColor: activeId === trip.id ? "var(--accent)" : "var(--line)" }}
                                >
                                  <span className="block truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
                                    {trip.name || "Untitled trip"}
                                  </span>
                                  <span className="mt-1 block text-xs" style={{ color: "var(--muted)" }}>
                                    {dateSummary(trip)} · {stopSummary(trip.stops.length)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#e4f1ed] text-lg">
                        🏔️
                      </span>
                      Trip summary
                    </div>
                    <Input
                      type="text"
                      value={activeTrip.name}
                      onChange={(e) => updateTrip({ ...activeTrip, name: e.target.value })}
                      className="mt-2 h-auto w-full border-none bg-transparent p-0 text-3xl font-semibold leading-tight text-[var(--ink)] shadow-none focus-visible:ring-0 md:text-4xl"
                      style={{ background: "transparent", color: "var(--ink)" }}
                      placeholder="Trip name"
                    />
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline" className="h-8 gap-2 rounded-md border-[#d8ddd8] bg-[#fbfbf8] px-3 text-[var(--muted-strong)]">
                        <Icon name="calendar" className="h-4 w-4" />
                        {dateSummary(activeTrip)}
                      </Badge>
                      <Badge variant="outline" className="h-8 gap-2 rounded-md border-[#d7e2dc] bg-[#f1f7f3] px-3 text-[#356b5a]">
                        <Icon name="map" className="h-4 w-4" />
                        {stopSummary(activeTrip.stops.length)}
                      </Badge>
                      <Badge variant="outline" className="h-8 gap-2 rounded-md border-[#d8ddd8] bg-[#fbfbf8] px-3 text-[var(--muted-strong)]">
                        <Icon name="check" className="h-4 w-4" />
                        {packedCount} of {packingList.length} packed
                      </Badge>
                      <Badge variant="secondary" className="h-8 rounded-md bg-[#eee5d6] px-3 text-xs font-semibold text-[var(--ink)]">
                        {user ? "Draft" : "Saved locally"}
                      </Badge>
                    </div>
                  </div>

                  <TooltipProvider>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={saveTrip}
                      disabled={saving}
                      variant="outline"
                      className="h-10 bg-white font-semibold"
                      style={{
                        color: saveMsg === "saved" ? "var(--accent)" : saveMsg === "error" ? "#b42318" : "var(--ink)",
                        borderColor: saveMsg === "saved" ? "rgba(23,109,101,0.24)" : saveMsg === "error" ? "rgba(180,35,24,0.22)" : "var(--line)",
                        background: saveMsg === "saved" ? "var(--accent-soft)" : "white",
                      }}
                    >
                      <Icon name="check" className="h-4 w-4" />
                      {saving ? "Saving…" : saveMsg === "saved" ? "Saved!" : saveMsg === "error" ? "Error" : "Save"}
                    </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save trip changes</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => deleteTrip(activeTrip.id)}
                      variant="outline"
                      className="h-10 bg-white font-semibold text-[#9f241b] hover:bg-red-50 hover:text-[#9f241b]"
                      style={{ borderColor: "rgba(180,35,24,0.18)", color: "#9f241b" }}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete this trip</TooltipContent>
                    </Tooltip>
                  </div>
                  </TooltipProvider>
                </div>
                {saveMsg === "error" && (
                  <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
                    <AlertTitle>Trip was not saved</AlertTitle>
                    <AlertDescription>Try saving again. Your edits are still on this page.</AlertDescription>
                  </Alert>
                )}
                </CardHeader>

                <Separator className="bg-[var(--line)]" />
                <CardContent className="grid max-w-[720px] gap-3 px-4 py-4 sm:px-5 md:grid-cols-2">
                  <TripDatePicker
                    label="Start date"
                    value={activeTrip.startDate}
                    onChange={(value) => updateTrip({ ...activeTrip, startDate: value })}
                  />
                  <TripDatePicker
                    label="End date"
                    value={activeTrip.endDate}
                    onChange={(value) => updateTrip({ ...activeTrip, endDate: value })}
                  />
                </CardContent>
              </Card>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
                <section className="min-w-0 space-y-4">
                  <Card className={`${mobileTab === "plan" ? "block" : "hidden"} gap-0 overflow-visible rounded-lg border bg-white py-0 xl:block`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <CardHeader className="px-4 py-4 sm:px-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                            Itinerary
                          </p>
                          <Badge variant="outline" className="rounded-md border-[#d9d2c3] bg-[#f7f1e7] text-[#6e5b39]">
                            {activeTrip.stops.length} {activeTrip.stops.length === 1 ? "stop" : "stops"}
                          </Badge>
                          {tripDays > 0 && (
                            <Badge variant="outline" className="rounded-md border-[#d7e2dc] bg-[#f1f7f3] text-[#356b5a]">
                              {tripDays} {tripDays === 1 ? "day" : "days"}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="mt-1 text-2xl font-semibold text-[var(--ink)]">
                          Route builder
                        </CardTitle>
                      </div>
                      <Popover open={Boolean(parkSearch.trim())}>
                        <PopoverAnchor asChild>
                          <div className="relative w-full">
                            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                            <Input
                              type="text"
                              placeholder="Add a park stop..."
                              value={parkSearch}
                              onChange={(e) => setParkSearch(e.target.value)}
                              className="h-11 rounded-lg border-[#d8ddd8] bg-[#fbfbf8] pl-10 pr-3 text-sm font-medium text-[var(--ink)]"
                            />
                          </div>
                        </PopoverAnchor>
                        <PopoverContent
                          align="end"
                          onOpenAutoFocus={(event) => event.preventDefault()}
                          className="w-[min(92vw,30rem)] overflow-hidden rounded-lg border bg-white p-0"
                          style={{ borderColor: "var(--line)" }}
                        >
                          <Command shouldFilter={false} className="rounded-lg bg-white">
                            <CommandList>
                              {searching && (
                                <div className="space-y-2 p-3">
                                  {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex items-center gap-3">
                                      <Skeleton className="h-9 w-9 rounded-md bg-[var(--linen)]" />
                                      <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3.5 w-3/4 bg-[var(--linen)]" />
                                        <Skeleton className="h-3 w-1/3 bg-[var(--linen)]" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {!searching && parkResults.length === 0 && <CommandEmpty>No parks found.</CommandEmpty>}
                              <CommandGroup heading="Add a stop">
                                {parkResults.map((park) => (
                                  <CommandItem
                                    key={park.parkCode}
                                    value={park.fullName}
                                    onSelect={() => addStop(park)}
                                    className="cursor-pointer rounded-md px-3 py-3"
                                  >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#edf5ef] text-[#1f7668]">
                                      <Icon name="plus" className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-semibold">{park.fullName}</span>
                                      <span className="mt-0.5 block text-xs text-muted-foreground">
                                        {park.states || "National Park Service"}
                                      </span>
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {aiError && (
                      <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
                        <AlertTitle>Could not draft itinerary</AlertTitle>
                        <AlertDescription>{aiError}</AlertDescription>
                      </Alert>
                    )}
                    </CardHeader>
                    <Separator className="bg-[var(--line)]" />
                    <CardContent className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 rounded-lg border bg-[#fbfaf6] p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--line)" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Draft from your stops</p>
                        <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--muted)" }}>
                          Uses dates, stops, and packing context.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void generateItinerary()}
                        disabled={aiLoading || !activeTrip.stops.length}
                        variant={activeTrip.stops.length ? "default" : "outline"}
                        className={activeTrip.stops.length ? "h-10 bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90" : "h-10 bg-white text-[var(--muted)]"}
                        title={!activeTrip.stops.length ? "Add at least one park stop first" : "Draft itinerary"}
                      >
                        {aiLoading ? (
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M12 3a9 9 0 019 9"/></svg>
                        ) : (
                          <Icon name="route" className="h-4 w-4" />
                        )}
                        {aiLoading ? "Drafting..." : "Draft itinerary"}
                      </Button>
                    </div>

                    {activeTrip.stops.length === 0 ? (
                      <div className="mt-4 rounded-lg border bg-[var(--surface)] p-4" style={{ borderColor: "var(--line)" }}>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.58fr)]">
                          <div>
                            <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                              Start with the first park or stop.
                            </p>
                            <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--muted)" }}>
                              Search for a park, add your first stop, then build the days around drive time, permits, and weather.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={() => setParkSearch("Yosemite")}
                                variant="outline"
                                className="h-10 bg-white"
                              >
                                Search parks
                              </Button>
                              <Button
                                type="button"
                                onClick={() => setParkSearch("Zion")}
                                variant="outline"
                                className="h-10 bg-white"
                              >
                                Try Zion
                              </Button>
                              <Button
                                type="button"
                                disabled
                                variant="outline"
                                className="h-10 bg-white"
                              >
                                Generate with AI
                              </Button>
                              <Button asChild variant="outline" className="h-10 bg-white text-[var(--accent)]">
                                <Link href="/explore">Browse parks</Link>
                              </Button>
                            </div>
                            <div className="mt-5 rounded-lg border bg-white p-3" style={{ borderColor: "var(--line)" }}>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                                Before this trip is ready
                              </p>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {TRIP_READY_ITEMS.map((item) => {
                                  const checked =
                                    item === "Dates set" ? Boolean(activeTrip.startDate && activeTrip.endDate) :
                                      item === "First stop added" ? activeTrip.stops.length > 0 :
                                        item === "Notes added" ? Boolean(activeTrip.notes.trim()) :
                                          false;
                                  return (
                                    <div key={item} className="flex items-center gap-2 text-sm" style={{ color: checked ? "var(--ink)" : "var(--muted)" }}>
                                      <span
                                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                                        style={{ borderColor: checked ? "var(--accent)" : "var(--line)", background: checked ? "var(--accent)" : "white", color: "white" }}
                                      >
                                        {checked && <Icon name="check" className="h-3 w-3" />}
                                      </span>
                                      {item}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="rounded-lg border bg-white p-3" style={{ borderColor: "var(--line)" }}>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                              Route timeline
                            </p>
                            <div className="mt-3 space-y-3">
                              {EMPTY_ROUTE_DAYS.map(([day, ...items]) => (
                                <div key={day} className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.72)" }}>
                                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{day}</p>
                                  <div className="mt-2 space-y-1.5">
                                    {items.map((item) => (
                                      <div key={item} className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--line)" }} />
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative mt-4 space-y-3">
                        <div className="absolute bottom-8 left-[1.25rem] top-8 hidden w-px bg-[#d7d1c4] sm:block" />
                        <TooltipProvider>
                        {activeTrip.stops.map((stop, i) => (
                          <Card key={stop.id} className="relative gap-0 overflow-visible rounded-lg border bg-white py-0" style={{ borderColor: "var(--line)", boxShadow: "0 10px 28px rgba(17,19,21,0.04)" }}>
                            <CardContent className="grid gap-3 p-3 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:p-4">
                            <div
                              className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                              style={{ background: i === 0 ? "var(--accent)" : "#2f3a34" }}
                            >
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 pr-10 sm:pr-0">
                                <Link
                                  href={`/parks/${stop.parkCode}`}
                                  className="min-w-0 truncate text-base font-semibold transition hover:opacity-70"
                                  style={{ color: "var(--ink)" }}
                                >
                                  {stop.parkName}
                                </Link>
                                <Badge variant="outline" className="gap-1 rounded-md border-[#d9d2c3] bg-[#f7f1e7] px-2 py-1 text-xs font-semibold text-[#6e5b39]">
                                  Day
                                  <input
                                    aria-label={`Day for ${stop.parkName}`}
                                    type="number"
                                    min={1}
                                    value={stop.day}
                                    onChange={(e) => updateStop(stop.id, { day: Math.max(1, Number(e.target.value) || 1) })}
                                    className="h-4 w-8 border-none bg-transparent p-0 text-xs font-semibold outline-none"
                                    style={{ color: "var(--ink)" }}
                                  />
                                </Badge>
                                <Badge variant="outline" className="rounded-md border-[#d7e2dc] bg-[#f1f7f3] text-[#356b5a]">
                                  Planned
                                </Badge>
                              </div>
                              <Separator className="mt-3 bg-[var(--line)]" />
                              {editingStopId === stop.id || !stop.notes ? (
                                <Textarea
                                  autoFocus={editingStopId === stop.id}
                                  placeholder="Trail ideas, arrival time, campsite..."
                                  value={stop.notes}
                                  rows={3}
                                  onChange={(e) => updateStop(stop.id, { notes: e.target.value })}
                                  onBlur={() => setEditingStopId(null)}
                                  className="mt-3 min-h-24 w-full resize-none rounded-lg border-[#cfded7] bg-[#fbfbf8] px-3 py-2 text-sm leading-6 text-[var(--ink-soft)]"
                                />
                              ) : (
                                <div className="mt-3 cursor-text rounded-lg border bg-[#fbfbf8] px-3 py-2.5" style={{ borderColor: "var(--line)" }} onClick={() => setEditingStopId(stop.id)}>
                                  {(() => {
                                    const [activitiesPart, tip] = stop.notes.split(" — ");
                                    const activities = activitiesPart.split(" · ").map(s => s.trim()).filter(Boolean);
                                    const hasDots = stop.notes.includes(" · ");
                                    if (!hasDots) {
                                      return <p className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>{stop.notes}</p>;
                                    }
                                    return (
                                      <div className="space-y-2">
                                        <div className="space-y-1.5">
                                          {activities.map((act, ai) => (
                                            <div key={ai} className="flex items-start gap-2">
                                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1f7668]" />
                                              <span className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>{act}</span>
                                            </div>
                                          ))}
                                        </div>
                                        {tip && (
                                          <p className="rounded-md bg-[#eaf3ed] px-3 py-2 text-xs leading-5 text-[#1f7668]">
                                            Tip: {tip}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => removeStop(stop.id)}
                                  variant="ghost"
                                  size="icon-lg"
                                  className="absolute right-3 top-3 h-10 w-10 text-[var(--muted)] hover:bg-red-50 hover:text-red-700 sm:static"
                                  aria-label={`Remove ${stop.parkName}`}
                                >
                                  <Icon name="close" className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove stop</TooltipContent>
                            </Tooltip>
                            </CardContent>
                          </Card>
                        ))}
                        </TooltipProvider>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  {/* Route map — only shown when stops have coordinates */}
                  {(() => {
                    const mapped: StopCoord[] = activeTrip.stops
                      .filter((s): s is TripStop & { lat: number; lng: number } =>
                        typeof s.lat === "number" && typeof s.lng === "number"
                      )
                      .map((s) => ({ id: s.id, parkName: s.parkName, day: s.day, notes: s.notes, lat: s.lat, lng: s.lng }));
                    if (mapped.length === 0) {
                      return (
                        <Card className={`${mobileTab === "map" ? "block" : "hidden"} border bg-white xl:hidden`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                          <CardHeader>
                            <CardTitle className="text-[var(--ink)]">Map appears after you add a park stop</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                              Add a park with location data from the Plan tab to see the route map here.
                            </p>
                          </CardContent>
                          <CardFooter className="bg-[var(--surface)]">
                            <Button type="button" onClick={() => setMobileTab("plan")} className="w-full bg-[var(--ink)] text-white hover:bg-[var(--ink)]/90">
                              Add first stop
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    }
                    return (
                      <section className={`${mobileTab === "map" ? "block" : "hidden"} overflow-hidden rounded-lg border bg-white xl:block`} style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15"/><path d="M15 6v15"/>
                          </svg>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Route Map</p>
                          <span className="ml-auto text-xs font-medium" style={{ color: "var(--muted)" }}>{mapped.length} {mapped.length === 1 ? "stop" : "stops"}</span>
                        </div>
                        <TripMap stops={mapped} />
                      </section>
                    );
                  })()}
                </section>

                <aside className={`${mobileTab === "notes" ? "block" : "hidden"} space-y-4 xl:sticky xl:top-[82px] xl:block xl:self-start`}>
                  <Card className="gap-0 overflow-hidden border bg-white py-0" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <CardHeader className="px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                            <Icon name="check" className="h-4 w-4" />
                            Packing
                          </p>
                          <CardTitle className="mt-1 text-xl text-[var(--ink)]">Review before you leave</CardTitle>
                          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                            {packedCount} of {packingList.length} packed
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-md border-[var(--line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                          {packingList.length} items
                        </Badge>
                      </div>
                    </CardHeader>
                    <Separator className="bg-[var(--line)]" />
                    <CardContent className="max-h-[420px] overflow-y-auto px-4 py-2">
                      <Accordion type="multiple" defaultValue={showChecklist ? groupPackingItems(packingList).map(([category]) => category) : []} onValueChange={(items) => setShowChecklist(items.length > 0)}>
                        {groupPackingItems(packingList).map(([category, items]) => (
                          <AccordionItem key={category} value={category} className="border-[var(--line)]">
                            <AccordionTrigger className="py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] hover:no-underline">
                              {category}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-1 pb-3">
                              {items.map((item) => (
                                <label key={item} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-stone-50">
                                  <Checkbox
                                    checked={packedItems.includes(item)}
                                    onCheckedChange={(checked) => togglePackedItem(item, checked === true)}
                                    className="mt-1 border-[var(--line)] data-checked:border-[var(--accent)] data-checked:bg-[var(--accent)]"
                                  />
                                  <span className="text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                                    {item}
                                  </span>
                                </label>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>

                  <div className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      <Icon name="note" className="h-4 w-4" />
                      Notes
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                      Trip notes
                    </h3>
                    <Textarea
                      value={activeTrip.notes}
                      onChange={(e) => updateTrip({ ...activeTrip, notes: e.target.value })}
                      placeholder="Reservations, permit numbers, route reminders..."
                      rows={8}
                      className="mt-4 min-h-48 w-full resize-none rounded-lg border-[var(--line)] bg-white px-3 py-3 text-sm leading-6 text-[var(--ink)]"
                      style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                    />
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>

      <Dialog open={Boolean(aiResult)} onOpenChange={(open) => !open && setAiResult(null)}>
        {aiResult && (
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden rounded-xl bg-white p-0 sm:max-w-2xl" style={{ boxShadow: "0 32px 80px rgba(17,19,21,0.24)" }}>
            {/* Header */}
            <DialogHeader className="border-b px-6 py-5 pr-14" style={{ borderColor: "var(--line)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>AI Generated</p>
                </div>
                <DialogTitle className="text-xl font-semibold" style={{ color: "var(--ink)" }}>Your Itinerary</DialogTitle>
                <DialogDescription className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{aiResult.summary}</DialogDescription>
              </div>
            </DialogHeader>

            {/* Days */}
            <div className="max-h-[56vh] overflow-y-auto px-6 py-4 space-y-3">
              {aiResult.days.map((day) => (
                <div key={day.day} className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "rgba(251,251,248,0.7)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ background: day.day === 1 ? "var(--accent)" : "var(--ink)" }}
                    >
                      {day.day}
                    </span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{day.label}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{day.parkName}</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mb-3">
                    {day.activities.map((act, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                        {act}
                      </li>
                    ))}
                  </ul>
                  {day.tip && (
                    <p className="rounded-lg px-3 py-2 text-xs leading-5" style={{ background: "rgba(23,109,101,0.07)", color: "var(--accent)" }}>
                      💡 {day.tip}
                    </p>
                  )}
                </div>
              ))}

              {aiResult.packingAdditions?.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: "var(--muted)" }}>Also pack</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.packingAdditions.map((item) => (
                      <span key={item} className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-3 rounded-none border-t bg-white px-6 py-4" style={{ borderColor: "var(--line)" }}>
              <Button
                type="button"
                onClick={() => setAiResult(null)}
                variant="ghost"
                className="text-[var(--muted)]"
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={applyItinerary}
                className="bg-[var(--ink)] text-white shadow-[0_8px_24px_rgba(17,19,21,0.16)] hover:bg-[var(--ink)]/90"
              >
                <Icon name="check" className="h-4 w-4" />
                Apply to planner
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function TripDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseInputDate(value) ?? undefined;

  return (
    <div>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
        <Icon name="calendar" className="h-4 w-4" />
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-10 w-full justify-between rounded-lg border-[#d8ddd8] bg-[#fbfbf8] px-3 text-left text-sm font-semibold text-[var(--ink)] hover:bg-[#f3f8f5]"
          >
            <span>{value ? formatDate(value) : "Select date"}</span>
            <Icon name="calendar" className="h-4 w-4 text-[var(--muted)]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-lg border bg-white p-0" style={{ borderColor: "var(--line)" }}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) onChange(formatInputDate(date));
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
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

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { searchParks, type Park } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { SyncNotice } from "@/app/components/ui";

interface JournalEntry {
  id: string;
  title: string;
  date: string;
  parkCode: string;
  parkName: string;
  rating: number;
  notes: string;
  photos: string[];
  createdAt: string;
}

type IconName =
  | "arrowLeft"
  | "calendar"
  | "camera"
  | "close"
  | "image"
  | "journal"
  | "map"
  | "plus"
  | "search"
  | "spark"
  | "star"
  | "trash";

const STORAGE_KEY = "trailquest_journal";
const QUICK_CAPTURE_TYPES = ["Trail note", "Parking", "Weather", "Campsite", "Photo"];
const FIELD_NOTE_PROMPTS = [
  "What trail did you take?",
  "Was parking full?",
  "What changed with weather?",
  "What would you do differently?",
  "Best view or stop?",
  "Any permit or shuttle note?",
];
const JOURNAL_TAGS = ["Hiking", "Parking", "Campsite", "Wildlife", "Weather", "Permit"];
const RATING_LABELS = ["Poor", "Fair", "Good", "Great", "Worth returning"];

function loadEntries(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function rowToEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    parkCode: row.park_code as string,
    parkName: row.park_name as string,
    rating: row.rating as number,
    notes: (row.notes as string) ?? "",
    photos: (row.photos as string[]) ?? [],
    createdAt: row.created_at as string,
  };
}

function todayInputValue(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(value: string): string {
  if (!value) return "Date not set";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function averageRating(entries: JournalEntry[]): string {
  if (!entries.length) return "0.0";
  return (entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length).toFixed(1);
}

function entryTags(entry: JournalEntry): string[] {
  const text = `${entry.title} ${entry.notes}`.toLowerCase();
  const tags = [];
  if (text.includes("trail") || text.includes("hike")) tags.push("Trail");
  if (text.includes("parking")) tags.push("Parking");
  if (text.includes("camp")) tags.push("Campsite");
  if (text.includes("weather") || text.includes("rain") || text.includes("snow")) tags.push("Weather");
  if (entry.photos.length) tags.push(`${entry.photos.length} photo${entry.photos.length === 1 ? "" : "s"}`);
  return tags.length ? tags.slice(0, 3) : ["Field note"];
}

function JournalContent() {
  const { user } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const prefillParkCode = searchParams.get("parkCode") ?? "";
  const prefillParkName = searchParams.get("parkName") ?? "";
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get("action") === "new");
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [query, setQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<"entries" | "browse">("browse");

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        const loaded = loadEntries();
        setEntries(loaded);
        setLoadingEntries(false);
        const id = searchParams.get("id");
        if (id) {
          const entry = loaded.find((e) => e.id === id);
          if (entry) setViewEntry(entry);
        }
      });
      return;
    }
    queueMicrotask(() => setLoadingEntries(true));
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoadingEntries(false); return; }
        const loaded = data.map((r) => rowToEntry(r as Record<string, unknown>));
        setEntries(loaded);
        setLoadingEntries(false);
        const id = searchParams.get("id");
        if (id) {
          const entry = loaded.find((e) => e.id === id);
          if (entry) setViewEntry(entry);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      [entry.title, entry.parkName, entry.notes, entry.date].some((value) => value.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  const photoCount = entries.reduce((sum, entry) => sum + entry.photos.length, 0);

  const addEntry = (entry: JournalEntry) => {
    const next = [entry, ...entries];
    setEntries(next);
    setShowForm(false);
    if (user) {
      supabase.from("journal_entries").insert({
        id: entry.id,
        user_id: user.id,
        title: entry.title,
        date: entry.date,
        park_code: entry.parkCode,
        park_name: entry.parkName,
        rating: entry.rating,
        notes: entry.notes,
        photos: entry.photos,
        created_at: entry.createdAt,
      }).then(({ error }) => {
        if (error) { console.error("[journal] insert error:", error); toast("Failed to save entry", "error"); }
        else toast("Entry saved");
      });
    } else {
      saveEntries(next);
    }
  };

  const deleteEntry = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    setViewEntry(null);
    if (user) {
      // Remove any photos stored in Supabase Storage
      if (entry?.photos.length) {
        const paths = entry.photos
          .map((url) => { const m = url.match(/journal-photos\/(.+?)(\?|$)/); return m?.[1] ?? null; })
          .filter((p): p is string => p !== null);
        if (paths.length) void supabase.storage.from("journal-photos").remove(paths);
      }
      supabase.from("journal_entries").delete().eq("id", id).eq("user_id", user.id)
        .then(({ error }) => { if (error) toast("Failed to delete entry", "error"); else toast("Entry deleted"); });
    } else {
      saveEntries(next);
    }
  };

  if (viewEntry) {
    return <EntryDetail entry={viewEntry} onBack={() => setViewEntry(null)} onDelete={() => deleteEntry(viewEntry.id)} />;
  }

  if (showForm) {
    return (
      <NewEntryForm
        prefillParkCode={prefillParkCode}
        prefillParkName={prefillParkName}
        onSave={addEntry}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      {!user && (
        <SyncNotice>Sign in to sync journal entries across devices.</SyncNotice>
      )}
      {/* Mobile tab toggle */}
      <div className="flex lg:hidden border-b" style={{ background: "white", borderColor: "var(--line)" }}>
        {(["browse", "entries"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className="flex-1 py-3.5 text-sm font-semibold relative transition-colors"
            style={{ color: mobileTab === tab ? "var(--ink)" : "var(--muted)" }}
          >
            {tab === "browse" ? "Browse" : `Entries (${entries.length})`}
            {mobileTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: "var(--accent)" }} />
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={`${mobileTab === "browse" ? "hidden" : "block"} lg:block rounded-lg border bg-white/70 p-3.5 lg:sticky lg:top-[82px] lg:h-[calc(100vh-98px)]`}
          style={{ borderColor: "var(--line)", backdropFilter: "blur(18px)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Field notes
              </p>
              <h1 className="mt-1 text-xl font-semibold" style={{ color: "var(--ink)" }}>
                Trail archive
              </h1>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                Search notes from each park visit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: "var(--ink)", boxShadow: "0 12px 26px rgba(17,19,21,0.16)" }}
              aria-label="New journal entry"
              title="New entry"
            >
              <Icon name="plus" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {[
              { label: "Entries", value: entries.length.toString() },
              { label: "Photos", value: photoCount.toString() },
              { label: "Avg rating", value: averageRating(entries) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border bg-white px-2.5 py-2" style={{ borderColor: "var(--line)" }}>
                <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                  {value}
                </p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-4">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entries"
              className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm font-medium outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
            />
          </div>

          <div className="mt-3 rounded-lg border bg-[var(--surface)] p-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
              Quick capture
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_CAPTURE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="min-h-8 rounded-md border bg-white px-2.5 text-left text-xs font-semibold transition hover:-translate-y-0.5 hover:bg-stone-50"
                  style={{ borderColor: "var(--line)", color: "var(--muted-strong)" }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-360px)]">
            {loadingEntries ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "white" }}>
                    <div className="h-3.5 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                    <div className="mt-2 h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-lg border border-dashed px-3.5 py-4" style={{ borderColor: "var(--line)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No entries yet</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
                  Start with the detail you&apos;ll want before going back.
                </p>
              </div>
            ) : (
              filteredEntries.slice(0, 12).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setViewEntry(entry)}
                  className="w-full rounded-lg border bg-white p-3 text-left transition hover:-translate-y-0.5"
                  style={{ borderColor: "var(--line)" }}
                >
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {entry.title}
                  </p>
                  <p className="mt-1 truncate text-xs" style={{ color: "var(--muted)" }}>
                    {entry.parkName} - {formatDate(entry.date)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className={`${mobileTab === "entries" ? "hidden" : "block"} lg:block min-w-0`}>
          <section
            className="rounded-lg border bg-white p-4"
            style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold leading-tight md:text-3xl" style={{ color: "var(--ink)" }}>
                  Field notes
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Save trail conditions, parking, weather, photos, and next-time notes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center rounded-lg border bg-white px-3.5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                  style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                >
                  Browse parks
                </Link>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: "var(--ink)" }}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  New entry
                </button>
              </div>
            </div>
          </section>

          {entries.length === 0 ? (
            <section className="mt-4 overflow-hidden rounded-lg border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--line)" }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                        Journal starter
                      </p>
                      <h3 className="mt-2 text-xl font-semibold sm:text-2xl" style={{ color: "var(--ink)" }}>
                        Start with one detail from the visit.
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--muted)" }}>
                        A useful note can be simple: parking, trail conditions, weather, or what you would change next time.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                      style={{ background: "var(--ink)" }}
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      Write entry
                    </button>
                  </div>

                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {FIELD_NOTE_PROMPTS.map((prompt, index) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="animate-journal-card group min-h-[74px] rounded-lg border bg-[var(--surface)] p-3 text-left transition duration-300 hover:-translate-y-1 hover:bg-white"
                        style={{ borderColor: "var(--line)", animationDelay: `${index * 70}ms` }}
                      >
                        <span className="flex items-start justify-between gap-3 text-sm font-semibold leading-6" style={{ color: "var(--ink)" }}>
                          {prompt}
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition group-hover:bg-[var(--accent-soft)]" style={{ color: "var(--accent)" }}>
                            <Icon name="plus" className="h-3.5 w-3.5" />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <aside className="animate-journal-card border-t bg-[var(--surface)] p-4 lg:border-l lg:border-t-0" style={{ borderColor: "var(--line)", animationDelay: "360ms" }}>
                  <div className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)" }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                      Your first note can include
                    </p>
                    <div className="mt-4 grid gap-2.5">
                      {[
                        "Park",
                        "Visit date",
                        "Rating",
                        "Trail condition",
                        "Parking note",
                        "Weather / gear",
                        "Photos",
                        "Next-time reminder",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-strong)" }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      Save the details you&apos;ll check before going back.
                    </p>
                    <p className="mt-2 text-xs leading-5" style={{ color: "var(--muted)" }}>
                      Parking, weather, trail condition, and next-time notes stay attached to the visit.
                    </p>
                    <Link
                      href="/explore"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                    >
                      Browse parks
                    </Link>
                  </div>
                </aside>
              </div>
            </section>
          ) : filteredEntries.length === 0 ? (
            <section className="mt-4 rounded-lg border bg-white px-6 py-14 text-center" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                No matching entries
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Try a park name, date, or phrase from your notes.
              </p>
            </section>
          ) : (
            <section className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setViewEntry(entry)}
                  className={`${index === 0 ? "md:col-span-2 2xl:col-span-1" : ""} group overflow-hidden rounded-lg border bg-white text-left transition duration-300 hover:-translate-y-1`}
                  style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden" style={{ background: "var(--surface-soft)" }}>
                    {entry.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.photos[0]} alt="Journal entry photo" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={{ color: "var(--accent)" }}>
                        <Icon name="image" className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02)_0%,rgba(0,0,0,0.16)_52%,rgba(0,0,0,0.68)_100%)]" />
                    <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                      <span className="rounded-md border border-white/18 bg-black/28 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
                        {formatDate(entry.date)}
                      </span>
                      <RatingStars rating={entry.rating} compact />
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="line-clamp-2 text-2xl font-semibold leading-tight text-white">{entry.title}</p>
                      <p className="mt-2 line-clamp-1 text-sm text-white/72">{entry.parkName}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {entryTags(entry).map((tag) => (
                        <span key={tag} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: tag.includes("photo") ? "var(--sand)" : "var(--accent-soft)", color: tag.includes("photo") ? "var(--ink)" : "var(--accent)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="line-clamp-3 text-sm leading-7" style={{ color: "var(--muted)" }}>
                      {entry.notes || "No notes written yet."}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-semibold" style={{ borderColor: "var(--line)", color: "var(--accent)" }}>
                      <span>{formatDate(entry.date)}</span>
                      <span>View note</span>
                    </div>
                  </div>
                </button>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="min-h-screen pt-[var(--nav-h)] animate-pulse" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-white/80 p-4" style={{ borderColor: "var(--line)" }}>
          <div className="h-4 w-20 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-7 w-36 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-3 w-48 rounded-full mb-5" style={{ background: "var(--linen)" }} />
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
                <div className="h-6 w-8 rounded-full mb-1" style={{ background: "var(--linen)" }} />
                <div className="h-2.5 w-12 rounded-full" style={{ background: "var(--linen)" }} />
              </div>
            ))}
          </div>
          <div className="h-10 w-full rounded-lg mb-5" style={{ background: "var(--linen)" }} />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "white" }}>
                <div className="h-3.5 w-3/4 rounded-full mb-2" style={{ background: "var(--linen)" }} />
                <div className="h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
              </div>
            ))}
          </div>
        </aside>
        <main className="min-w-0 space-y-4">
          <div className="rounded-lg border p-5 h-40" style={{ background: "rgba(17,19,21,0.9)", borderColor: "rgba(255,255,255,0.14)" }}>
            <div className="h-3 w-24 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="h-10 w-2/3 rounded-xl mb-3" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-3 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${i === 0 ? "md:col-span-2 2xl:col-span-1" : ""} rounded-lg border bg-white overflow-hidden`} style={{ borderColor: "var(--line)" }}>
                <div className="h-44" style={{ background: "var(--linen)" }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                  <div className="h-3 w-full rounded-full" style={{ background: "var(--linen)" }} />
                  <div className="h-3 w-2/3 rounded-full" style={{ background: "var(--linen)" }} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<JournalSkeleton />}>
      <JournalContent />
    </Suspense>
  );
}

function EntryDetail({
  entry,
  onBack,
  onDelete,
}: {
  entry: JournalEntry;
  onBack: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            Journal
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold transition hover:bg-red-50"
            style={{ borderColor: "rgba(220,38,38,0.18)", color: "#dc2626" }}
          >
            <Icon name="trash" className="h-4 w-4" />
            Delete
          </button>
        </div>

        <article className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
          {entry.photos.length > 0 && (
            <div className="grid max-h-[560px] gap-1 overflow-hidden md:grid-cols-2">
              {entry.photos.slice(0, 4).map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt={`Journal photo ${index + 1}`}
                  className={`${index > 1 ? "hidden md:block" : ""} h-72 w-full object-cover md:h-[420px]`}
                />
              ))}
            </div>
          )}

          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Journal entry
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl" style={{ color: "var(--ink)" }}>
                {entry.title}
              </h1>
              <p className="mt-4 text-sm leading-7" style={{ color: "var(--muted)" }}>
                {entry.parkName} - {formatDate(entry.date)}
              </p>

              <div className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                <p className="whitespace-pre-wrap text-base leading-8" style={{ color: "var(--ink-soft)" }}>
                  {entry.notes || <span style={{ color: "var(--muted)", fontStyle: "italic" }}>No notes written.</span>}
                </p>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Rating
                </p>
                <div className="mt-3">
                  <RatingStars rating={entry.rating} />
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Photos
                </p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                  {entry.photos.length}
                </p>
              </div>
            </aside>
          </div>
        </article>
      </div>
    </div>
  );
}

function NewEntryForm({
  onSave,
  onCancel,
  prefillParkCode = "",
  prefillParkName = "",
}: {
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
  prefillParkCode?: string;
  prefillParkName?: string;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => todayInputValue());
  const [parkName, setParkName] = useState(prefillParkName);
  const [parkCode, setParkCode] = useState(prefillParkCode);
  const [rating, setRating] = useState(5);
  const [trailConditions, setTrailConditions] = useState("");
  const [parkingNotes, setParkingNotes] = useState("");
  const [weatherGear, setWeatherGear] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [parkSearch, setParkSearch] = useState("");
  const [parkResults, setParkResults] = useState<Park[]>([]);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Stable entry ID so storage paths are consistent even if component re-renders
  const [entryId] = useState(() => createLocalId("entry"));

  useEffect(() => {
    const trimmed = parkSearch.trim();
    const timer = window.setTimeout(async () => {
      if (!trimmed) {
        setParkResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const data = await searchParks(trimmed, "", 0, 6);
        setParkResults(data.parks);
      } catch {
        setParkResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [parkSearch]);

  const handlePhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        if (readerEvent.target?.result) {
          setPhotos((current) => [...current, readerEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);

    let finalPhotos = photos;
    if (user && photos.some((p) => p.startsWith("data:"))) {
      const results = await Promise.all(
        photos.map(async (photo, i) => {
          if (!photo.startsWith("data:")) return photo;
          try {
            const blob = await fetch(photo).then((r) => r.blob());
            const ext = blob.type.split("/")[1] ?? "jpg";
            const path = `${user.id}/${entryId}/${i}.${ext}`;
            const { error } = await supabase.storage.from("journal-photos").upload(path, blob, { upsert: true });
            if (error) return photo;
            const { data: { publicUrl } } = supabase.storage.from("journal-photos").getPublicUrl(path);
            return publicUrl;
          } catch {
            return photo;
          }
        })
      );
      finalPhotos = results;
    }

    const finalNotes = [
      selectedTags.length ? `Tags: ${selectedTags.join(", ")}` : "",
      trailConditions.trim() ? `Trail conditions:\n${trailConditions.trim()}` : "",
      parkingNotes.trim() ? `Parking notes:\n${parkingNotes.trim()}` : "",
      weatherGear.trim() ? `Weather / gear:\n${weatherGear.trim()}` : "",
      nextTime.trim() ? `Next time:\n${nextTime.trim()}` : "",
    ].filter(Boolean).join("\n\n");

    onSave({
      id: entryId,
      title: title.trim(),
      date,
      parkCode,
      parkName: parkName || "Unknown Park",
      rating,
      notes: finalNotes,
      photos: finalPhotos,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const notesStarted = Boolean(trailConditions.trim() || parkingNotes.trim() || weatherGear.trim() || nextTime.trim());

  return (
    <div className="min-h-screen pt-[var(--nav-h)]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-4">
          <section
            className="rounded-lg border bg-white p-4 sm:p-5"
            style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <Icon name="journal" className="h-4 w-4" />
                  </span>
                  New field note
                </div>
                <h1 className="mt-3 text-2xl font-semibold leading-tight md:text-3xl" style={{ color: "var(--ink)" }}>
                  Add the details you will check next time.
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Park, date, rating, photos, and field notes from the visit.
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold transition hover:bg-stone-50"
                style={{ borderColor: "var(--line)", color: "var(--muted-strong)" }}
              >
                <Icon name="close" className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </section>

          {/* Mobile save/cancel row — visible before fields so user doesn't scroll to bottom */}
          <div className="flex gap-3 xl:hidden">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border bg-white py-3 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!title.trim() || saving}
              className="flex-1 rounded-lg py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
              style={{ background: "var(--ink)" }}
            >
              {saving ? "Saving…" : "Save entry"}
            </button>
          </div>

          <section className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--line)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                Visit basics
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Title is required
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Note title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Mist Trail before the crowds"
                  className="mt-2 w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                />
              </label>

              <label>
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  <Icon name="calendar" className="h-4 w-4" />
                  Visit date
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-2 w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  <Icon name="map" className="h-4 w-4" />
                  Park visited
                </span>
                {parkCode ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-3 text-sm" style={{ borderColor: "var(--line)" }}>
                    <span className="truncate font-semibold" style={{ color: "var(--ink)" }}>
                      {parkName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setParkCode("");
                        setParkName("");
                      }}
                      className="rounded-md px-2 py-1 text-xs font-semibold transition hover:bg-stone-100"
                      style={{ color: "var(--muted)" }}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mt-2">
                      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                      <input
                        type="text"
                        value={parkSearch}
                        onChange={(event) => {
                          setParkSearch(event.target.value);
                          setParkName(event.target.value);
                        }}
                        placeholder="Search for a park"
                        className="w-full rounded-lg border py-3 pl-10 pr-3 text-sm font-semibold outline-none"
                        style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                      />
                    </div>
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
                            onClick={() => {
                              setParkCode(park.parkCode);
                              setParkName(park.fullName);
                              setParkSearch("");
                              setParkResults([]);
                            }}
                            className="flex w-full items-center justify-between gap-4 border-t px-4 py-3 text-left text-sm transition hover:bg-stone-50"
                            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                          >
                            <span className="truncate font-semibold">{park.fullName}</span>
                            <span className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>
                              {park.states}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  <Icon name="star" className="h-4 w-4" />
                  Rating
                </span>
                <div className="mt-2 flex min-h-[46px] items-center rounded-lg border bg-white px-3" style={{ borderColor: "var(--line)" }}>
                  <RatingStars rating={rating} interactive onChange={setRating} />
                </div>
                <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
                  {rating} {RATING_LABELS[rating - 1]}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between" style={{ borderColor: "var(--line)" }}>
              <div>
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                  <Icon name="journal" className="h-4 w-4" />
                  Field notes
                </span>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  Write it while the visit is still fresh.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {JOURNAL_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="min-h-8 rounded-full border px-3 text-xs font-semibold transition"
                      style={{
                        background: active ? "var(--accent)" : "white",
                        borderColor: active ? "var(--accent)" : "var(--line)",
                        color: active ? "white" : "var(--muted-strong)",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FieldNoteTextarea
                label="Trail conditions"
                value={trailConditions}
                onChange={setTrailConditions}
                placeholder="Mist Trail steps were wet near Vernal Fall. Crowded after 9 AM."
              />
              <FieldNoteTextarea
                label="Parking notes"
                value={parkingNotes}
                onChange={setParkingNotes}
                placeholder="Curry Village lot was full by 8:15 AM. Shuttle wait was 20 minutes."
              />
              <FieldNoteTextarea
                label="Weather / gear"
                value={weatherGear}
                onChange={setWeatherGear}
                placeholder="Cool morning, hot by noon. Rain shell stayed packed."
              />
              <FieldNoteTextarea
                label="Next time"
                value={nextTime}
                onChange={setNextTime}
                placeholder="Start before 7:30 AM. Bring extra socks. Skip the overlook if crowded."
              />
            </div>
          </section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-[82px] xl:self-start">
          <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
              <Icon name="journal" className="h-4 w-4" />
              Entry checklist
            </p>
            <div className="mt-3 grid gap-2">
              {[
                ["Park selected", Boolean(parkName)],
                ["Date set", Boolean(date)],
                ["Rating added", rating > 0],
                ["Notes started", notesStarted],
                ["Photos added", photos.length > 0],
              ].map(([label, done]) => (
                <div key={label as string} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                  <span style={{ color: "var(--muted-strong)" }}>{label as string}</span>
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded border text-[10px]"
                    style={{
                      background: done ? "var(--accent)" : "white",
                      borderColor: done ? "var(--accent)" : "var(--line)",
                      color: "white",
                    }}
                  >
                    {done ? "✓" : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
              <Icon name="camera" className="h-4 w-4" />
              Photos
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
              Add trail signs, views, campsites, or parking references.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-2">
              {photos.map((src, index) => (
                <div key={`${src}-${index}`} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Journal photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-white opacity-0 transition group-hover:opacity-100"
                    style={{ background: "#dc2626" }}
                    aria-label="Remove photo"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs font-semibold transition hover:bg-stone-50"
                style={{ borderColor: "rgba(17,19,21,0.18)", color: "var(--muted)" }}
              >
                <Icon name="plus" className="h-5 w-5" />
                Photo
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </section>

          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-3" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border bg-white py-3 text-sm font-semibold transition hover:bg-stone-50"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!title.trim() || saving}
              className="rounded-lg py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--ink)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldNoteTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full resize-none rounded-lg border px-3 py-3 text-sm leading-6 outline-none"
        style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
      />
    </label>
  );
}

function RatingStars({
  rating,
  interactive = false,
  onChange,
  compact = false,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={interactive ? () => onChange?.(star) : undefined}
          className={`${interactive ? "cursor-pointer transition hover:scale-110" : "cursor-default"} flex items-center justify-center`}
          aria-label={interactive ? `${star} star rating` : undefined}
          disabled={!interactive}
          style={{ color: star <= rating ? "#c8860a" : "rgba(17,19,21,0.18)" }}
        >
          <Icon name="star" className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </button>
      ))}
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
    case "arrowLeft":
      return (
        <svg {...common}>
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
        </svg>
      );
    case "journal":
      return (
        <svg {...common}>
          <path d="M6 4h11a2 2 0 0 1 2 2v14H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
          <path d="M7 4v16" />
          <path d="M10 8h5" />
          <path d="M10 12h5" />
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
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3 9.4 8.8 4 11.4l5.4 2.4L12 21l2.6-7.2L20 11.4l-5.4-2.6L12 3Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} fill="currentColor" strokeWidth={1.5}>
          <path d="m12 2 2.9 6.2 6.8.8-5 4.7 1.3 6.7-6-3.4-6 3.4 1.3-6.7-5-4.7 6.8-.8L12 2Z" />
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

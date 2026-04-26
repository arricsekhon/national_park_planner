"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { searchParks, type Park } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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

function JournalContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const prefillParkCode = searchParams.get("parkCode") ?? "";
  const prefillParkName = searchParams.get("parkName") ?? "";
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(searchParams.get("action") === "new");
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) {
      const loaded = loadEntries();
      setEntries(loaded);
      const id = searchParams.get("id");
      if (id) {
        const entry = loaded.find((e) => e.id === id);
        if (entry) setViewEntry(entry);
      }
      return;
    }
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const loaded = data.map((r) => rowToEntry(r as Record<string, unknown>));
        setEntries(loaded);
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
        if (error) console.error("[journal] insert error:", error);
      });
    } else {
      saveEntries(next);
    }
  };

  const deleteEntry = (id: string) => {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    setViewEntry(null);
    if (user) {
      void supabase.from("journal_entries").delete().eq("id", id).eq("user_id", user.id);
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
    <div className="min-h-screen pt-[66px]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          className="rounded-lg border bg-white/80 p-4 lg:sticky lg:top-[82px] lg:h-[calc(100vh-98px)]"
          style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)", backdropFilter: "blur(18px)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Field notes
              </p>
              <h1 className="mt-1 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
                Trail Archive
              </h1>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--muted)" }}>
                Notes, ratings, and photos from every park visit.
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

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { label: "Entries", value: entries.length.toString() },
              { label: "Photos", value: photoCount.toString() },
              { label: "Avg", value: averageRating(entries) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border bg-white p-3" style={{ borderColor: "var(--line)" }}>
                <p className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
                  {value}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-5">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entries"
              className="w-full rounded-lg border py-3 pl-10 pr-3 text-sm font-medium outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
            />
          </div>

          <div className="mt-5 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-330px)]">
            {entries.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center" style={{ borderColor: "var(--line)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  No memories yet
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--muted)" }}>
                  Write your first entry to start the archive.
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

        <main className="min-w-0">
          <section
            className="overflow-hidden rounded-lg border p-5 text-white sm:p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(17,19,21,0.98) 0%, rgba(32,57,57,0.96) 58%, rgba(132,92,42,0.9) 100%)",
              borderColor: "rgba(255,255,255,0.14)",
              boxShadow: "0 22px 70px rgba(17,19,21,0.16)",
            }}
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
                    <Icon name="journal" className="h-4 w-4" />
                  </span>
                  Journal
                </div>
                <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
                  Capture the part a map cannot.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68">
                  Keep the route, weather, favorite views, campsite notes, and photos together while the details are still fresh.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                <Icon name="plus" className="h-4 w-4" />
                New entry
              </button>
            </div>
          </section>

          {entries.length === 0 ? (
            <section className="mt-4 rounded-lg border bg-white px-6 py-16 text-center" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
              <span
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <Icon name="spark" className="h-6 w-6" />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Empty archive
              </p>
              <h3 className="mt-2 text-3xl font-semibold" style={{ color: "var(--ink)" }}>
                Write the first page.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7" style={{ color: "var(--muted)" }}>
                Add a park, rating, photos, and the trail details you want later.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-7 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                style={{ background: "var(--ink)" }}
              >
                <Icon name="plus" className="h-4 w-4" />
                Write first entry
              </button>
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
                    <p className="line-clamp-3 text-sm leading-7" style={{ color: "var(--muted)" }}>
                      {entry.notes || "No notes written yet."}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs font-semibold" style={{ color: "var(--accent)" }}>
                      <span>{entry.photos.length} photo{entry.photos.length === 1 ? "" : "s"}</span>
                      <span>Open</span>
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

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pt-[66px]" style={{ color: "var(--muted)" }}>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      }
    >
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
    <div className="min-h-screen pt-[66px]" style={{ background: "var(--surface)" }}>
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
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [parkName, setParkName] = useState(prefillParkName);
  const [parkCode, setParkCode] = useState(prefillParkCode);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [parkSearch, setParkSearch] = useState("");
  const [parkResults, setParkResults] = useState<Park[]>([]);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDate(todayInputValue());
  }, []);

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

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: createLocalId("entry"),
      title: title.trim(),
      date,
      parkCode,
      parkName: parkName || "Unknown Park",
      rating,
      notes,
      photos,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen pt-[66px]" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_370px]">
        <main className="min-w-0 space-y-4">
          <section
            className="overflow-hidden rounded-lg border p-5 text-white sm:p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(17,19,21,0.98) 0%, rgba(32,57,57,0.96) 58%, rgba(132,92,42,0.9) 100%)",
              borderColor: "rgba(255,255,255,0.14)",
              boxShadow: "0 22px 70px rgba(17,19,21,0.16)",
            }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
                    <Icon name="journal" className="h-4 w-4" />
                  </span>
                  New memory
                </div>
                <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Write an entry.</h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-white/68">
                  Save the park, conditions, favorite view, photos, and the details you will want later.
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/16 px-3 py-2 text-sm font-semibold text-white/78 transition hover:bg-white/10"
              >
                <Icon name="close" className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  Entry title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Dawn hike above the valley"
                  className="mt-2 w-full rounded-lg border px-3 py-3 text-sm font-semibold outline-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
                />
              </label>

              <label>
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
                  <Icon name="calendar" className="h-4 w-4" />
                  Date
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
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <label>
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
                <Icon name="journal" className="h-4 w-4" />
                Notes & memories
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Trail conditions, weather, favorite view, campsite, permits, or what you would do differently next time..."
                rows={11}
                className="mt-3 w-full resize-none rounded-lg border px-3 py-3 text-sm leading-7 outline-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "white" }}
              />
            </label>
          </section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-[82px] xl:self-start">
          <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
              <Icon name="camera" className="h-4 w-4" />
              Photos
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-2">
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
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs font-semibold transition hover:bg-stone-50"
                style={{ borderColor: "rgba(17,19,21,0.18)", color: "var(--muted)" }}
              >
                <Icon name="plus" className="h-5 w-5" />
                Photo
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </section>

          <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-sm)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
              Review
            </p>
            <h2 className="mt-2 text-2xl font-semibold" style={{ color: "var(--ink)" }}>
              {title || "Untitled entry"}
            </h2>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
              {parkName || "No park selected"} - {formatDate(date)}
            </p>
            <div className="mt-4">
              <RatingStars rating={rating} compact />
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border bg-white py-3 text-sm font-semibold transition hover:-translate-y-0.5"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="rounded-lg py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
              style={{ background: "var(--ink)" }}
            >
              Save
            </button>
          </div>
        </aside>
      </div>
    </div>
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

"use client";

import { useState } from "react";
import type { ThingToDo } from "@/lib/api";

type Difficulty = { label: "Easy" | "Moderate" | "Hard"; color: string; bg: string };

function parseTrailDistance(text: string): string | null {
  if (!text) return null;
  const m = text.match(/(\d+\.?\d*)\s*(?:to\s*\d+\.?\d*)?\s*-?\s*(miles?|mi\b|km\b|kilometers?)/i);
  if (!m) return null;
  const unit = /km|kilo/i.test(m[2]) ? "km" : "mi";
  return `${parseFloat(m[1]).toFixed(1)} ${unit}`;
}

function inferDifficulty(item: { title: string; shortDescription: string; longDescription: string; tags?: string[]; duration?: string }): Difficulty {
  const haystack = [item.title, item.shortDescription, item.longDescription, ...(item.tags ?? [])].join(" ").toLowerCase();
  if (/strenuous|difficult|\bhard\b|challenging|steep|scramble|technical|exposed|summit|peak/.test(haystack))
    return { label: "Hard", color: "#b91c1c", bg: "#fef2f2" };
  if (/\beasy\b|gentle|flat|paved|boardwalk|wheelchair|accessible|short walk|nature walk|beginner/.test(haystack))
    return { label: "Easy", color: "#15803d", bg: "#f0fdf4" };
  if (/moderate|rolling|some elevation|varied terrain|moderately/.test(haystack))
    return { label: "Moderate", color: "#b45309", bg: "#fffbeb" };
  const dur = (item.duration ?? "").toLowerCase();
  if (/less than|30 min|^0|^1\s*-\s*1 hour/.test(dur)) return { label: "Easy", color: "#15803d", bg: "#f0fdf4" };
  if (/full day|all day|\b[5-9]\b|\b[1-9]\d\b/.test(dur)) return { label: "Hard", color: "#b91c1c", bg: "#fef2f2" };
  return { label: "Moderate", color: "#b45309", bg: "#fffbeb" };
}

export default function TrailFilter({ thingsToDo }: { thingsToDo: ThingToDo[] }) {
  const [trailDifficulty, setTrailDifficulty] = useState<"" | "Easy" | "Moderate" | "Hard">("");

  const filtered = thingsToDo
    .slice(0, 20)
    .filter((item) => !trailDifficulty || inferDifficulty(item).label === trailDifficulty);

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          Trails &amp; Things To Do
        </h2>
        <div className="flex items-center gap-1.5" role="group" aria-label="Filter by difficulty">
          {(["", "Easy", "Moderate", "Hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setTrailDifficulty(d)}
              aria-pressed={trailDifficulty === d}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: trailDifficulty === d
                  ? d === "Easy" ? "#15803d" : d === "Moderate" ? "#b45309" : d === "Hard" ? "#b91c1c" : "var(--ink)"
                  : "white",
                color: trailDifficulty === d ? "white" : "var(--muted-strong)",
                border: `1px solid ${trailDifficulty === d ? "transparent" : "var(--line)"}`,
              }}
            >
              {d === "" ? "All" : d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const diff = inferDifficulty(item);
          const dist = parseTrailDistance(item.longDescription + " " + item.shortDescription);
          return (
            <a
              key={item.id}
              href={item.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="park-card block rounded-2xl overflow-hidden"
              style={{ background: "white", boxShadow: "var(--shadow-card)" }}
            >
              {item.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.images[0].url}
                  alt={item.images[0].altText}
                  className="w-full object-cover"
                  style={{ height: 160 }}
                />
              )}
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {item.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--accent-soft)", color: "#1a4a2a" }}
                    >
                      {tag}
                    </span>
                  ))}
                  {item.duration && (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: "var(--surface-soft)", color: "var(--muted-strong)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                      </svg>
                      {item.duration}
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm mb-1 line-clamp-1" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                  {item.title}
                </p>
                <p className="text-xs line-clamp-2 leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
                  {item.shortDescription}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: diff.bg, color: diff.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: diff.color }} aria-hidden="true" />
                    {diff.label}
                  </span>
                  {dist && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "var(--surface-soft)", color: "var(--muted-strong)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M3 12h18M3 6l6 6-6 6"/>
                      </svg>
                      {dist}
                    </span>
                  )}
                  {item.doFeesApply === "1" && (
                    <span className="text-[11px] font-semibold" style={{ color: "var(--amber)" }}>Fees apply</span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {thingsToDo.length > 20 && (
        <p className="text-xs text-center mt-4" style={{ color: "var(--muted)" }}>
          Showing 20 of {thingsToDo.length} activities
        </p>
      )}
    </section>
  );
}

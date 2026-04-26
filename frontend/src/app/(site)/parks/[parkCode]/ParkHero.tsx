"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParkData } from "@/lib/park-data";

interface Photo {
  url: string;
  altText: string;
}

interface Props {
  photos: Photo[];
  parkCode: string;
  parkName: string;
  parkStates: string;
  location: string;
}

export default function ParkHero({ photos, parkCode, parkName, parkStates, location }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const router = useRouter();
  const { toggleFavorite, isFavorite, getVisitStatus, setVisitStatus, toggleCompare, inCompare } = useParkData();

  const isFav = isFavorite(parkCode);
  const status = getVisitStatus(parkCode);
  const comparing = inCompare(parkCode);

  const addToPlanner = () => {
    const trips = JSON.parse(localStorage.getItem("trailquest_trips") ?? "[]");
    const draft = trips.find((t: { id: string }) => t.id === "_draft");
    const stop = { id: Date.now().toString(), parkCode, parkName, day: 1, notes: "" };
    if (draft) {
      draft.stops = [...(draft.stops ?? []), stop];
    } else {
      trips.push({ id: "_draft", name: "My Trip", startDate: "", endDate: "", stops: [stop], notes: "", createdAt: new Date().toISOString() });
    }
    localStorage.setItem("trailquest_trips", JSON.stringify(trips));
    router.push("/planner");
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: "clamp(340px, 52vh, 520px)", background: "#121819" }}
    >
      {photos.length > 0 && (
        <Image
          src={photos[photoIdx].url}
          alt={photos[photoIdx].altText}
          fill
          className="object-cover transition-opacity duration-500"
          sizes="100vw"
          priority
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(5,15,8,0.95) 0%, rgba(5,15,8,0.45) 45%, rgba(5,15,8,0.15) 100%)" }}
      />

      {photos.length > 1 && (
        <div className="absolute top-20 right-4 flex flex-col gap-1.5">
          {photos.slice(0, 5).map((photo, i) => (
            <button
              key={i}
              onClick={() => setPhotoIdx(i)}
              aria-label={`View photo ${i + 1}`}
              className="overflow-hidden rounded-lg transition-all duration-200"
              style={{
                width: 40,
                height: 40,
                border: `2px solid ${i === photoIdx ? "white" : "rgba(255,255,255,0.25)"}`,
                opacity: i === photoIdx ? 1 : 0.6,
                position: "relative",
              }}
            >
              <Image src={photo.url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-6 py-6 max-w-7xl mx-auto">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-3 transition-opacity hover:opacity-75 uppercase tracking-wider"
          style={{ color: "rgba(200,134,10,0.9)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          All Parks
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1
              className="font-bold text-white leading-tight"
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              }}
            >
              {parkName}
            </h1>
            <p className="text-sm mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
              {location || parkStates}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            <div
              className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
              role="group"
              aria-label="Park actions"
            >
              <button
                onClick={() => toggleFavorite({ code: parkCode, name: parkName, states: parkStates, imageUrl: photos[0]?.url })}
                aria-label={isFav ? "Remove from saved parks" : "Save this park"}
                aria-pressed={isFav}
                data-tip={isFav ? "Saved" : "Save park"}
                className="icon-btn-tooltip p-3 min-w-[44px] min-h-[44px] rounded-xl transition-all hover:bg-white/10 active:scale-90 flex items-center justify-center"
                style={{ color: isFav ? "#f87171" : "rgba(255,255,255,0.65)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </button>

              <span className="w-px h-5 mx-0.5" style={{ background: "rgba(255,255,255,0.18)" }} aria-hidden="true" />

              <button
                onClick={() => setVisitStatus(parkCode, status === "none" ? "want" : status === "want" ? "been" : "none")}
                aria-label={status === "been" ? "Marked as visited — click to change" : status === "want" ? "Marked as want to go — click to change" : "Set visit status"}
                aria-pressed={status !== "none"}
                data-tip={status === "been" ? "Been here" : status === "want" ? "Want to go" : "Mark visited"}
                className="icon-btn-tooltip p-3 min-w-[44px] min-h-[44px] rounded-xl transition-all hover:bg-white/10 active:scale-90 flex items-center justify-center"
                style={{ color: status === "been" ? "#86efac" : status === "want" ? "#fcd34d" : "rgba(255,255,255,0.65)" }}
              >
                {status === "been" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                ) : status === "want" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                )}
              </button>

              <span className="w-px h-5 mx-0.5" style={{ background: "rgba(255,255,255,0.18)" }} aria-hidden="true" />

              <button
                onClick={() => toggleCompare({ code: parkCode, name: parkName })}
                aria-label={comparing ? "Remove from comparison" : "Add to comparison"}
                aria-pressed={comparing}
                data-tip={comparing ? "Remove from compare" : "Add to compare"}
                className="icon-btn-tooltip p-3 min-w-[44px] min-h-[44px] rounded-xl transition-all hover:bg-white/10 active:scale-90 flex items-center justify-center"
                style={{ color: comparing ? "#fcd34d" : "rgba(255,255,255,0.65)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </button>

              <span className="w-px h-5 mx-0.5" style={{ background: "rgba(255,255,255,0.18)" }} aria-hidden="true" />

              <Link
                href={`/journal?action=new&parkCode=${parkCode}&parkName=${encodeURIComponent(parkName)}`}
                aria-label="Write a journal entry for this park"
                data-tip="Write journal"
                className="icon-btn-tooltip p-3 min-w-[44px] min-h-[44px] rounded-xl transition-all hover:bg-white/10 active:scale-90 flex items-center justify-center"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
              </Link>
            </div>

            <button
              onClick={addToPlanner}
              className="flex-1 sm:flex-none px-5 py-3 min-h-[44px] rounded-2xl text-sm font-bold text-white transition-all active:scale-95 hover:opacity-90"
              style={{ background: "var(--amber)", boxShadow: "0 4px 20px rgba(200,134,10,0.45)" }}
            >
              + Add to Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

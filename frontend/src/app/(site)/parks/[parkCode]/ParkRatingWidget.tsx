"use client";

import { useState } from "react";
import { useParkData } from "@/lib/park-data";

export default function ParkRatingWidget({ parkCode }: { parkCode: string }) {
  const { getRating, setRating, getVisitStatus } = useParkData();
  const status = getVisitStatus(parkCode);
  const existing = getRating(parkCode);
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [review, setReview] = useState(existing?.review ?? "");
  const [hovered, setHovered] = useState(0);
  const [saved, setSaved] = useState(!!existing);

  if (status !== "been") return null;

  const handleSave = () => {
    if (stars === 0) return;
    setRating(parkCode, { stars, review, date: new Date().toISOString().split("T")[0] });
    setSaved(true);
  };

  return (
    <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
      <p className="text-[11px] tracking-[0.15em] font-semibold uppercase mb-4" style={{ color: "var(--muted)" }}>
        Your Rating
      </p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setStars(s); setSaved(false); }}
            aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`}
            className="text-2xl transition-transform hover:scale-110 active:scale-95"
            style={{ color: s <= (hovered || stars) ? "#c8860a" : "#d9d0c4" }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => { setReview(e.target.value); setSaved(false); }}
        placeholder="Write a short review…"
        rows={2}
        aria-label="Write a review"
        className="w-full text-xs resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 leading-relaxed"
        style={{ borderColor: "var(--line)", color: "var(--ink)" }}
      />
      <button
        onClick={handleSave}
        disabled={stars === 0 || saved}
        className="mt-2.5 w-full py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
        style={{ background: saved ? "var(--accent)" : "var(--accent)" }}
      >
        {saved ? "✓ Saved" : "Save Rating"}
      </button>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { haversineDistance, parseLatLong, searchParks, type Park } from "@/lib/api";

export default function NearbySection() {
  const [nearbyParks, setNearbyParks] = useState<{ park: Park; dist: number }[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyDone, setNearbyDone] = useState(false);
  const [error, setError] = useState("");

  const handleNearMe = async () => {
    if (!navigator.geolocation || nearbyDone) return;
    setNearbyLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const data = await searchParks("", "", 0, 500);
          const sorted = data.parks
            .map((park) => {
              const coords = parseLatLong(park.latLong);
              return coords ? { park, dist: haversineDistance(lat, lng, coords.lat, coords.lng) } : null;
            })
            .filter((value): value is { park: Park; dist: number } => value !== null)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 6);
          setNearbyParks(sorted);
          setNearbyDone(true);
        } catch {
          setError("Could not load nearby parks. Check that the backend is running.");
        } finally {
          setNearbyLoading(false);
        }
      },
      () => {
        setNearbyLoading(false);
        setError("Location access was denied. Search by state or park name instead.");
      }
    );
  };

  return (
    <section className="premium-shell pb-24">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Nearby
          </p>
          <h2 className="text-4xl font-semibold sm:text-6xl" style={{ color: "var(--ink)" }}>
            Start close to home.
          </h2>
        </div>
        {!nearbyDone && (
          <button
            type="button"
            onClick={handleNearMe}
            disabled={nearbyLoading}
            className="inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--ink)", color: "white" }}
          >
            {nearbyLoading ? "Locating..." : "Use my location"}
          </button>
        )}
      </div>

      {nearbyParks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {nearbyParks.map(({ park, dist }) => (
            <Link
              key={park.parkCode}
              href={`/parks/${park.parkCode}`}
              className="group overflow-hidden rounded-xl border bg-white/70 p-3 transition-all hover:-translate-y-1"
              style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="h-48 overflow-hidden rounded-lg relative" style={{ background: "var(--surface-soft)" }}>
                {park.images?.[0] && (
                  <Image
                    src={park.images[0].url}
                    alt={park.images[0].altText}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                )}
              </div>
              <div className="px-2 pb-3 pt-5">
                <p className="text-lg font-semibold leading-tight" style={{ color: "var(--ink)" }}>
                  {park.fullName}
                </p>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  {park.states} · {dist < 10 ? dist.toFixed(1) : Math.round(dist)} mi away
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : !nearbyLoading ? (
        <div className="rounded-xl border px-8 py-14 text-center" style={{ background: "rgba(255,255,255,0.58)", borderColor: "var(--line)" }}>
          <p className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
            See the closest park sites in one step.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7" style={{ color: "var(--muted)" }}>
            Location stays in your browser. It is only used to sort nearby parks for this view.
          </p>
          {error && (
            <p role="alert" className="mx-auto mt-4 max-w-md text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}


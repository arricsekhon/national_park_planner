"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { haversineDistance, parseLatLong, searchParks, type Park } from "@/lib/api";

const NEARBY_PREVIEW = [
  { label: "Sort nearby park units by distance" },
  { label: "Keep fees, activities, and trail notes visible" },
  { label: "Use the result only for this view" },
];

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
    <section className="premium-shell pb-20">
      {nearbyParks.length > 0 ? (
        <>
        <div className="mb-6 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Nearby
          </p>
          <h2 className="text-4xl font-semibold sm:text-5xl" style={{ color: "var(--ink)" }}>
            Start close to home.
          </h2>
        </div>
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
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
          <div className="max-w-sm pt-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
              Nearby
            </p>
            <h2 className="text-3xl font-semibold leading-tight sm:text-[2.65rem]" style={{ color: "var(--ink)" }}>
              Find parks near where you are.
            </h2>
            <p className="mt-4 text-sm leading-7" style={{ color: "var(--muted)" }}>
              Sort by distance without saving your location to your account.
            </p>
          </div>

          <Card className="ml-auto w-full max-w-xl rounded-lg border-[var(--line)] bg-white p-0 shadow-[0_6px_20px_rgba(17,19,21,0.035)]">
            <CardHeader className="border-b border-[var(--line)] px-5 py-4">
              <CardTitle className="text-lg font-semibold text-[var(--ink)]">
                Use location for nearby results
              </CardTitle>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Your browser asks first. TrailQuest only uses the answer to sort this list.
              </p>
            </CardHeader>

            <CardContent className="px-5 py-4">
              <div className="grid gap-2.5">
                {NEARBY_PREVIEW.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-sm text-[var(--ink-soft)]">
                    <Check className="size-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-[var(--line)] bg-[#f7f8f5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Nothing is stored after sorting.
              </div>
              <Button
                type="button"
                onClick={handleNearMe}
                disabled={nearbyLoading}
                className="h-10 rounded-lg bg-[var(--ink)] px-4 text-sm text-white shadow-none hover:bg-[#252a2d]"
              >
                {nearbyLoading ? "Locating..." : "Use my location"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Park } from "@/lib/api";

export default function FeaturedImageSwipe({ parks }: { parks: Park[] }) {
  const [active, setActive] = useState(0);

  if (parks.length === 0) {
    return (
      <div className="rounded-xl border px-8 py-16 text-center" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.58)" }}>
        <p className="text-xl font-semibold" style={{ color: "var(--ink)" }}>No featured parks loaded.</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6" style={{ color: "var(--muted)" }}>
          Check that the backend API is running, then refresh this page.
        </p>
      </div>
    );
  }

  const current = parks[active % parks.length];
  const currentFee = current.entranceFees?.[0];
  const currentActivities = current.activities?.slice(0, 3).map((activity) => activity.name).join(" · ");
  const goNext = () => setActive((index) => (index + 1) % parks.length);
  const goPrev = () => setActive((index) => (index - 1 + parks.length) % parks.length);

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.72)", background: "var(--surface-soft)", boxShadow: "0 36px 110px rgba(17,19,21,0.16)" }}>
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {parks.map((park, index) => {
            const image = park.images?.[0];
            const fee = park.entranceFees?.[0];
            return (
              <Link
                key={park.parkCode}
                href={`/parks/${park.parkCode}`}
                className="relative h-[560px] min-w-full overflow-hidden sm:h-[680px]"
                aria-label={`View ${park.fullName}`}
              >
                {image && (
                  <Image
                    src={image.url}
                    alt={image.altText}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority={index === 0}
                  />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.22)_48%,rgba(0,0,0,0.08)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.18)_46%,rgba(0,0,0,0.82)_100%)]" />

                <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
                  <span className="rounded-lg border border-white/20 bg-black/24 px-4 py-2 text-xs font-semibold text-white/82 backdrop-blur-xl">
                    {park.states}
                  </span>
                  {fee && (
                    <span className="rounded-lg border border-white/20 bg-white/16 px-4 py-2 text-xs font-semibold text-white backdrop-blur-xl">
                      {parseFloat(fee.cost) === 0 ? "Free entry" : `$${fee.cost} entry`}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7 text-white sm:p-10">
                  <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/62">
                    View {index + 1} of {parks.length}
                  </p>
                  <h3 className="max-w-4xl text-4xl font-semibold leading-[0.96] sm:text-7xl">
                    {park.fullName}
                  </h3>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
                    {park.description}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/72">
                    <span>{park.activities?.slice(0, 2).map((activity) => activity.name).join(" · ") || "Park details"}</span>
                    <span className="font-semibold text-white">View details</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="absolute bottom-6 right-6 z-20 flex gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous destination image"
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/22 bg-white/16 text-xl font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/24 active:scale-95 sm:h-14 sm:w-14"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next destination image"
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-xl font-semibold text-[var(--ink)] backdrop-blur-xl transition-all hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {current.fullName}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {current.states}{currentActivities ? ` · ${currentActivities}` : ""}{currentFee ? ` · ${parseFloat(currentFee.cost) === 0 ? "Free entry" : `$${currentFee.cost} entry`}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {parks.map((park, index) => (
            <button
              key={park.parkCode}
              type="button"
              onClick={() => setActive(index)}
              className="h-2.5 shrink-0 rounded-full transition-all"
              style={{
                background: index === active % parks.length ? "var(--accent)" : "rgba(17,19,21,0.14)",
                width: index === active % parks.length ? 54 : 30,
              }}
              aria-label={`Show ${park.fullName}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

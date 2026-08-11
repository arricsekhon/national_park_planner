"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import type { Park } from "@/lib/api";

export default function FeaturedImageSwipe({ parks }: { parks: Park[] }) {
  const [active, setActive] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const didDragRef = useRef(false);

  const goNext = () => setActive((index) => (index + 1) % parks.length);
  const goPrev = () => setActive((index) => (index - 1 + parks.length) % parks.length);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goNext();
      else goPrev();
    }
    setTouchStartX(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseStartX(e.clientX);
    setDragging(false);
    didDragRef.current = false;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX === null) return;
    if (Math.abs(e.clientX - mouseStartX) > 6) setDragging(true);
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX === null) return;
    const delta = mouseStartX - e.clientX;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goNext();
      else goPrev();
      didDragRef.current = true;
    }
    setMouseStartX(null);
    setDragging(false);
  };
  const handleClickCapture = (e: React.MouseEvent) => {
    if (didDragRef.current) { e.preventDefault(); e.stopPropagation(); didDragRef.current = false; }
  };

  if (parks.length === 0) {
    return (
      <div className="rounded-lg border px-8 py-16 text-center" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.58)" }}>
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
  const currentAddress = current.addresses?.find((address) => address.type === "Physical") ?? current.addresses?.[0];

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-lg border select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ borderColor: "var(--line)", background: "var(--surface-soft)", boxShadow: "var(--shadow-sm)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setMouseStartX(null); setDragging(false); }}
        onClickCapture={handleClickCapture}
      >
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
                className="relative h-[430px] min-w-full overflow-hidden sm:h-[520px]"
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
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.52)_0%,rgba(0,0,0,0.18)_52%,rgba(0,0,0,0.08)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.20)_48%,rgba(0,0,0,0.78)_100%)]" />

                <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                  <span className="rounded-md border border-white/20 bg-black/52 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
                    {park.states}
                  </span>
                  {fee && (
                    <span className="rounded-md border border-white/20 bg-black/52 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
                      {parseFloat(fee.cost) === 0 ? "Free entry" : `$${fee.cost} entry`}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/62">
                    Park {index + 1} of {parks.length}
                  </p>
                  <h3 className="max-w-4xl text-3xl font-semibold leading-tight sm:text-5xl">
                    {park.fullName}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72 line-clamp-2">
                    {park.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-white/78">
                    <span>{park.activities?.slice(0, 2).map((activity) => activity.name).join(" · ") || "Park details"}</span>
                    <span className="rounded-md bg-white/14 px-2.5 py-1 font-semibold text-white">View details</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

      </div>

      <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {current.fullName}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {currentAddress?.city ? `${currentAddress.city}, ` : ""}{current.states}{currentActivities ? ` · ${currentActivities}` : ""}{currentFee ? ` · ${parseFloat(currentFee.cost) === 0 ? "Free entry" : `$${parseFloat(currentFee.cost).toFixed(0)} entry`}` : ""}
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

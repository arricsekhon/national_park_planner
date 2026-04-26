"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useParkData } from "@/lib/park-data";

export default function UserCollection() {
  const { user } = useAuth();
  const { favorites } = useParkData();

  if (!user || favorites.length === 0) return null;

  return (
    <section className="premium-shell pb-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
            Your collection
          </p>
          <h2 className="text-4xl font-semibold" style={{ color: "var(--ink)" }}>
            Saved for later.
          </h2>
        </div>
        <Link href="/profile" className="text-sm font-semibold underline-offset-4 transition hover:underline" style={{ color: "var(--ink)" }}>
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {favorites.slice(0, 6).map((favorite) => (
          <Link key={favorite.code} href={`/parks/${favorite.code}`} className="group">
            <div className="aspect-[4/5] overflow-hidden rounded-lg relative" style={{ background: "var(--surface-soft)", boxShadow: "var(--shadow-card)" }}>
              {favorite.imageUrl && (
                <Image
                  src={favorite.imageUrl}
                  alt={favorite.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                />
              )}
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>
              {favorite.name}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{favorite.states}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}


"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useParkData } from "@/lib/park-data";

const SEARCH_CHIPS = ["National parks", "California", "Utah", "Colorado", "Montana", "Wyoming", "Alaska"];

export function HeroSearchAndStats({ parkCount }: { parkCount?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const { favorites, visitStatus } = useParkData();
  const [searchQuery, setSearchQuery] = useState("");

  const beenCount = Object.values(visitStatus).filter((value) => value === "been").length;
  const wantCount = Object.values(visitStatus).filter((value) => value === "want").length;

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const next = searchQuery.trim();
    router.push(next ? `/explore?q=${encodeURIComponent(next)}` : "/explore");
  };

  return (
    <>
      <form
        onSubmit={handleSearch}
        className="animate-hero-3 glass-panel mx-auto mt-10 flex w-full max-w-2xl flex-col gap-3 rounded-xl p-2 sm:flex-row sm:items-center lg:mx-0"
        style={{ background: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.32)" }}
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search parks, states, trails, activities..."
          className="min-h-12 flex-1 rounded-lg border-0 bg-white px-5 text-[15px] text-[var(--ink)] shadow-none placeholder:text-black/38 focus:outline-none"
          aria-label="Search parks"
        />
        <button
          type="submit"
          className="min-h-12 rounded-lg px-7 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-95"
          style={{ background: "white", color: "var(--ink)" }}
        >
          Explore parks
        </button>
      </form>

      <div
        className="animate-hero-4 mt-5"
        style={{ WebkitMaskImage: "linear-gradient(to right, black 82%, transparent 100%)", maskImage: "linear-gradient(to right, black 82%, transparent 100%)" }}
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {SEARCH_CHIPS.map((chip) => (
            <Link
              key={chip}
              href={`/explore?q=${encodeURIComponent(chip)}`}
              className="shrink-0 snap-start rounded-lg border border-white/16 bg-white/10 px-4 py-2 text-xs font-medium text-white/72 backdrop-blur transition-all hover:bg-white/18 hover:text-white"
            >
              {chip}
            </Link>
          ))}
        </div>
      </div>

      <div className="animate-hero-4 mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:items-start">
        <Link
          href="/planner"
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-[var(--ink)] transition-all hover:scale-[1.01] active:scale-95 sm:w-auto"
        >
          Build a trip
        </Link>
        <Link
          href="/explore?q=hiking"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white/82 backdrop-blur-xl transition-all hover:bg-white/16 sm:w-auto"
        >
          Browse hikes
        </Link>
      </div>

      <div className="animate-hero-4 mt-12 grid gap-3 rounded-xl border border-white/14 bg-white/10 p-3 backdrop-blur-2xl sm:grid-cols-4 lg:col-span-2">
        <div className="rounded-lg bg-white/[0.08] px-5 py-4 text-center">
          <p className="text-3xl font-semibold">{parkCount ? parkCount.toLocaleString() : "474"}</p>
          <p className="mt-1 text-xs font-medium text-white/58">Park sites</p>
        </div>
        {user ? (
          <>
            {[
              { num: favorites.length, label: "Saved by you" },
              { num: beenCount, label: "Visited" },
              { num: wantCount, label: "Want to go" },
            ].map(({ num, label }) => (
              <div key={label} className="rounded-lg bg-white/[0.08] px-5 py-4 text-center">
                <p className="text-3xl font-semibold">{num}</p>
                <p className="mt-1 text-xs font-medium text-white/58">{label}</p>
              </div>
            ))}
          </>
        ) : (
          <div className="sm:col-span-3 flex items-center justify-center rounded-lg bg-white/[0.08] px-5 py-4">
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-white/62 transition-colors hover:text-white"
            >
              Sign in to track your visits →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}


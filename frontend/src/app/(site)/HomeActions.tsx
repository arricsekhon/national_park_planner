"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SEARCH_CHIPS = ["National parks", "California", "Utah", "Colorado", "Montana", "Wyoming", "Alaska"];

export function HeroSearchAndStats({ parkCount: _ }: { parkCount?: number }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

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

    </>
  );
}


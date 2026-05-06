"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SEARCH_CHIPS = ["National parks", "California", "Utah", "Colorado", "Montana", "Wyoming", "Alaska"];

export function HeroSearchAndStats() {
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
        className="animate-hero-3 mx-auto mt-8 flex w-full max-w-2xl items-center gap-2 rounded-2xl p-1.5 lg:mx-0"
        style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(16px)" }}
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search parks, states, activities..."
          className="min-h-11 flex-1 rounded-xl border-0 bg-white/90 px-4 text-[15px] text-[var(--ink)] shadow-none placeholder:text-black/35 focus:outline-none"
          aria-label="Search parks"
        />
        <button
          type="submit"
          className="shrink-0 min-h-11 rounded-xl px-5 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--ink)", color: "white" }}
        >
          Search
        </button>
      </form>

      <div
        className="animate-hero-4 mt-4"
        style={{ WebkitMaskImage: "linear-gradient(to right, black 82%, transparent 100%)", maskImage: "linear-gradient(to right, black 82%, transparent 100%)" }}
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {SEARCH_CHIPS.map((chip) => (
            <Link
              key={chip}
              href={`/explore?q=${encodeURIComponent(chip)}`}
              className="shrink-0 snap-start rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/75 transition-all hover:bg-white/18 hover:text-white active:scale-95"
            >
              {chip}
            </Link>
          ))}
        </div>
      </div>

    </>
  );
}

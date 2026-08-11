"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SEARCH_CHIPS = ["Yosemite", "easy hikes", "camping", "no entry fee"];

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
        className="animate-hero-3 mt-6 flex w-full max-w-full min-w-0 flex-col gap-1.5 rounded-lg p-1.5 sm:max-w-lg sm:flex-row sm:items-center"
        style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(255,255,255,0.24)", boxShadow: "0 14px 38px rgba(0,0,0,0.16)" }}
      >
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search park, state, activity"
          className="min-h-10 w-full min-w-0 rounded-md border-0 bg-transparent px-3 text-sm text-[var(--ink)] shadow-none placeholder:text-black/38 focus:outline-none sm:flex-1"
          aria-label="Search parks"
        />
        <button
          type="submit"
          className="min-h-10 w-full shrink-0 rounded-md px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-95 sm:w-auto"
          style={{ background: "var(--ink)", color: "white" }}
        >
          Search
        </button>
      </form>

      <div
        className="animate-hero-4 mt-3"
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {SEARCH_CHIPS.map((chip) => (
            <Link
              key={chip}
              href={`/explore?q=${encodeURIComponent(chip)}`}
              className="shrink-0 snap-start rounded-md border border-white/18 bg-black/24 px-3 py-1.5 text-xs font-medium text-white/76 transition-all hover:bg-black/34 hover:text-white active:scale-95"
            >
              {chip}
            </Link>
          ))}
        </div>
      </div>

    </>
  );
}

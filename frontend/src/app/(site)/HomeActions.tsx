"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center">
      <form
        onSubmit={handleSearch}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-black/24 px-2.5 py-1.5 shadow-[0_16px_38px_rgba(0,0,0,0.18)] ring-1 ring-white/18 backdrop-blur-md"
      >
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-5 -translate-y-1/2 text-white/65" aria-hidden="true" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search park, state, activity"
            className="h-10 rounded-lg border-0 !bg-transparent pl-10 text-base text-white shadow-none placeholder:text-white/55 focus-visible:border-0 focus-visible:ring-0 md:text-base"
            aria-label="Search parks"
          />
        </div>
        <Button
          type="submit"
          className="h-10 rounded-lg bg-white px-5 text-base text-[var(--ink)] hover:bg-white/90"
        >
          Search
        </Button>
      </form>

      <div className="mt-3 flex w-full justify-center">
        <div className="flex max-w-full justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SEARCH_CHIPS.map((chip) => (
            <Link
              key={chip}
              href={`/explore?q=${encodeURIComponent(chip)}`}
              className="shrink-0 rounded-md border border-white/18 bg-black/26 px-3 py-1.5 text-xs font-medium text-white/78 transition hover:bg-black/36 hover:text-white"
            >
              {chip}
            </Link>
          ))}
        </div>
      </div>

      <Link
        href="/explore"
        className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white/82 transition hover:text-white"
      >
        <MapPin className="size-4" aria-hidden="true" />
        Browse all national park units
      </Link>
    </div>
  );
}

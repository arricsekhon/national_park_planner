"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useParkData } from "@/lib/park-data";
import { supabase } from "@/lib/supabase";

export default function PersonalizedDashboard() {
  const { user } = useAuth();
  const { favorites, visitStatus } = useParkData();
  const [journalCount, setJournalCount] = useState(0);
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => { if (count !== null) setJournalCount(count); });
    supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => { if (count !== null) setTripCount(count); });
  }, [user]);

  if (!user) return null;

  const beenCount = Object.values(visitStatus).filter((v) => v === "been").length;
  const firstName = user.name.split(" ")[0];

  return (
    <section className="premium-shell pt-20 pb-4">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #071510 0%, #0f2518 55%, #1a3a2a 100%)", boxShadow: "var(--shadow-card)" }}
      >
        <div className="relative p-8 sm:p-10">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(45,90,61,0.3) 0%, transparent 65%)" }} />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(200,134,10,0.9)" }}>
              Welcome back
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-8 leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              {firstName}&apos;s adventure log.
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { num: favorites.length, label: "Saved Parks", href: "/profile?tab=saved" },
                { num: beenCount, label: "Been Here", href: "/explore" },
                { num: journalCount, label: "Journal Entries", href: "/journal" },
                { num: tripCount, label: "Trips Planned", href: "/planner" },
              ].map(({ num, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="p-4 rounded-xl text-center transition-all hover:bg-white/10 group"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-2xl font-bold text-white mb-0.5 group-hover:text-[#8ee3d5] transition-colors" style={{ fontFamily: "var(--font-playfair)" }}>
                    {num}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-85"
                style={{ background: "var(--accent)" }}
              >
                Discover Parks
              </Link>
              <Link
                href="/journal?action=new"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.14)" }}
              >
                + New Journal Entry
              </Link>
              <Link
                href="/planner"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.14)" }}
              >
                Plan a Trip
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

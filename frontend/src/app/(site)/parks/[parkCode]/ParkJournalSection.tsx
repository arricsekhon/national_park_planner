"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface Entry {
  id: string;
  title: string;
  date: string;
  rating: number;
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "#c8860a", fontSize: 12 }}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

export default function ParkJournalSection({
  parkCode,
  parkName,
}: {
  parkCode: string;
  parkName: string;
}) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("journal_entries")
      .select("id,title,date,rating")
      .eq("user_id", user.id)
      .eq("park_name", parkName)
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data as Entry[]);
        setLoading(false);
      });
  }, [user, parkName]);

  if (!user) {
    return (
      <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
        <p className="text-[11px] tracking-[0.15em] font-semibold uppercase mb-3" style={{ color: "var(--muted)" }}>
          Your Journal
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
          Sign in to log your visit and keep notes.
        </p>
        <Link
          href="/auth/signin"
          className="block text-center py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "var(--accent)" }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] tracking-[0.15em] font-semibold uppercase" style={{ color: "var(--muted)" }}>
          Your Journal
        </p>
        <Link
          href={`/journal?action=new&parkCode=${parkCode}&parkName=${encodeURIComponent(parkName)}`}
          className="text-[11px] font-semibold hover:opacity-70 transition-opacity"
          style={{ color: "var(--accent)" }}
        >
          + New Entry
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg" style={{ background: "var(--linen)" }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            No entries for this park yet.
          </p>
          <Link
            href={`/journal?action=new&parkCode=${parkCode}&parkName=${encodeURIComponent(parkName)}`}
            className="inline-block px-4 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)" }}
          >
            Log Your Visit
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Link
              key={e.id}
              href={`/journal?id=${e.id}`}
              className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-stone-50"
              style={{ border: "1px solid var(--line)" }}
            >
              <div className="min-w-0 mr-2">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--ink)", fontFamily: "var(--font-playfair)" }}>
                  {e.title}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>{e.date}</p>
              </div>
              <Stars n={e.rating} />
            </Link>
          ))}
          <Link
            href="/journal"
            className="block text-center text-[11px] font-semibold mt-1 hover:opacity-70 transition-opacity"
            style={{ color: "var(--muted)" }}
          >
            View all entries →
          </Link>
        </div>
      )}
    </div>
  );
}

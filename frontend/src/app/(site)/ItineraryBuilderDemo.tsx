"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Copy, Eye, PencilLine, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Eye, label: "Checked trail difficulty" },
  { icon: PencilLine, label: "Added parking and backup notes" },
];

export default function ItineraryBuilderDemo() {
  const [phase, setPhase] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const timers: number[] = [];
    const runSequence = () => {
      setPhase(0);
      [
        [1, 100],
        [2, 420],
        [3, 1900],
        [4, 2280],
        [5, 2640],
        [6, 2940],
      ].forEach(([nextPhase, delay]) => {
        timers.push(window.setTimeout(() => setPhase(nextPhase), delay));
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timers.forEach(window.clearTimeout);
          runSequence();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <Card ref={cardRef} className="mx-auto max-w-xl rounded-[22px] border-[var(--line)] bg-[#fbfbf8] p-0 shadow-[0_14px_44px_rgba(17,19,21,0.08)]">
      <div className="p-5 sm:p-6">
        <div className={cn("ml-auto max-w-[76%] rounded-[18px] bg-[var(--surface-soft)] px-4 py-3 text-[var(--ink)]", phase >= 1 ? "animate-demo-in" : "opacity-0")}>
          <p className="text-base leading-7">
            Plan 3 days in Yosemite for a moderate pace. Avoid hard trails.
          </p>
        </div>

        <div className="mt-5">
          <p className={cn("max-w-md text-lg leading-8 text-[var(--ink)]", phase >= 2 ? "animate-demo-in" : "opacity-0")}>
            I&apos;ll build a route around shorter hikes, early parking, and a backup plan.
          </p>

          <div className={cn("mt-4 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 transition-opacity duration-300", phase >= 2 && phase < 3 ? "animate-demo-in" : "hidden opacity-0")}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[var(--muted-strong)]">
                Checking fees, parking, and trail difficulty
              </p>
              <span className="flex items-center gap-1" aria-label="Processing">
                <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)] [animation-delay:160ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-[var(--accent)] [animation-delay:320ms]" />
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--linen)]">
              <div className="itinerary-processing-bar h-full rounded-full bg-[var(--accent)]" />
            </div>
          </div>

          <div className="mt-4 grid gap-2.5">
            {STEPS.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className={cn("flex items-center gap-3 text-[var(--muted-strong)]", phase >= 3 ? "animate-demo-in" : "hidden opacity-0")}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>

          <p className={cn("mt-5 max-w-xl text-lg leading-8 text-[var(--ink)]", phase >= 4 ? "animate-demo-in" : "hidden opacity-0")}>
            I found a three-day draft with a waterfall route, a low-effort final morning, and a weather-safe backup.
          </p>
        </div>

        <div className={cn("mt-5 rounded-[18px] border border-[var(--line)] bg-white p-4", phase >= 5 ? "animate-demo-in" : "hidden opacity-0")}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-[var(--ink)]">
                Yosemite long weekend
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Editable itinerary ready
              </p>
            </div>
            <Button asChild className="h-10 rounded-lg bg-[var(--ink)] px-4 text-sm text-white hover:bg-[#252a2d]">
              <Link href="/planner">Open planner</Link>
            </Button>
          </div>

          <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3 text-sm sm:grid-cols-3">
            <MiniPlan label="Day 1" value="Valley arrival" />
            <MiniPlan label="Day 2" value="Mist Trail" />
            <MiniPlan label="Day 3" value="Easy overlook" />
          </div>
        </div>

        <div className={cn("mt-5 flex items-center gap-4 text-[var(--ink)]", phase >= 6 ? "animate-demo-in" : "hidden opacity-0")}>
          <button type="button" aria-label="Like itinerary" className="transition hover:text-[var(--accent)]">
            <ThumbsUp className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Dislike itinerary" className="transition hover:text-[var(--accent)]">
            <ThumbsDown className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Regenerate itinerary" className="transition hover:text-[var(--accent)]">
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Copy itinerary" className="transition hover:text-[var(--accent)]">
            <Copy className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function MiniPlan({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--ink)]">{value}</p>
    </div>
  );
}

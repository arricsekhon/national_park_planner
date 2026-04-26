"use client";

import { useRouter } from "next/navigation";
import { useParkData } from "@/lib/park-data";
import { Button } from "./ui";

export default function CompareBar() {
  const { compareList, toggleCompare, clearCompare } = useParkData();
  const router = useRouter();

  if (compareList.length === 0) return null;

  const handleCompare = () => {
    const codes = compareList.map((p) => p.code).join(",");
    router.push(`/compare?parks=${codes}`);
  };

  return (
    <>
      <div aria-hidden="true" className="h-28 sm:h-20" />
      <aside
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-3 sm:px-6"
        style={{
          background: "rgba(17,19,21,0.96)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.35)",
        }}
        aria-label="Park comparison tray"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p
              className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: "rgba(143,208,197,0.92)" }}
            >
              Compare
            </p>
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
              {compareList.map((park) => (
                <div
                  key={park.code}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.09)", color: "white" }}
                >
                  <span className="max-w-[180px] truncate text-xs font-medium">{park.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleCompare(park)}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-xs leading-none text-white/55 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Remove ${park.name} from comparison`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {compareList.length < 3 && (
                <div
                  className="flex shrink-0 items-center rounded-lg border border-dashed px-3 py-1.5 text-xs"
                  style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.42)" }}
                >
                  Add park
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              onClick={clearCompare}
              tone="ghost"
              className="min-h-10 px-3 text-xs text-white/58 hover:text-white"
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handleCompare}
              disabled={compareList.length < 2}
              className="min-h-10 flex-1 px-5 sm:flex-none"
              style={{ background: "var(--accent)" }}
            >
              Compare {compareList.length} parks
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

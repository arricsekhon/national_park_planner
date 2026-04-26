export default function ParkLoading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: "var(--surface)" }}>
      {/* Hero skeleton */}
      <div
        className="relative overflow-hidden"
        style={{ height: "clamp(340px, 52vh, 520px)", background: "#121819" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,15,8,0.85)_0%,rgba(5,15,8,0.3)_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 px-6 py-6 max-w-7xl mx-auto">
          <div className="h-3 w-20 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="h-10 w-2/3 rounded-xl mb-3" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="h-4 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Description card */}
          <div className="p-7 rounded-2xl space-y-3" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <div className="h-3.5 rounded-full w-full" style={{ background: "var(--linen)" }} />
            <div className="h-3.5 rounded-full w-5/6" style={{ background: "var(--linen)" }} />
            <div className="h-3.5 rounded-full w-4/5" style={{ background: "var(--linen)" }} />
            <div className="h-3.5 rounded-full w-2/3" style={{ background: "var(--linen)" }} />
          </div>

          {/* Activities card */}
          <div className="p-7 rounded-2xl" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <div className="h-5 w-28 rounded-full mb-5" style={{ background: "var(--linen)" }} />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-7 rounded-full" style={{ background: "var(--linen)", width: `${60 + (i % 3) * 24}px` }} />
              ))}
            </div>
          </div>

          {/* Trail cards */}
          <div>
            <div className="h-6 w-48 rounded-full mb-5" style={{ background: "var(--linen)" }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
                  <div className="h-40" style={{ background: "var(--linen)" }} />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                    <div className="h-3 w-full rounded-full" style={{ background: "var(--linen)" }} />
                    <div className="h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-5">
          {/* Map */}
          <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="h-[220px]" style={{ background: "var(--linen)" }} />
            <div className="px-4 py-3 h-10" style={{ background: "white", borderTop: "1px solid var(--line)" }} />
          </div>
          {/* Weather */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <div className="h-3 w-28 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="flex gap-3 mt-2">
              <div className="h-12 w-12 rounded-xl" style={{ background: "var(--linen)" }} />
              <div className="space-y-2">
                <div className="h-7 w-20 rounded-full" style={{ background: "var(--linen)" }} />
                <div className="h-3 w-28 rounded-full" style={{ background: "var(--linen)" }} />
              </div>
            </div>
          </div>
          {/* Fees */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: "white", boxShadow: "var(--shadow-card)" }}>
            <div className="h-3 w-24 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-4 w-full rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-4 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

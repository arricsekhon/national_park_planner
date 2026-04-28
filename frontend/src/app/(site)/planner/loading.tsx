export default function PlannerLoading() {
  return (
    <div className="min-h-screen pt-[var(--nav-h)] animate-pulse" style={{ background: "linear-gradient(180deg, rgba(251,251,248,0.92) 0%, rgba(245,246,243,0.96) 100%)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="rounded-lg border bg-white/80 p-4" style={{ borderColor: "rgba(17,19,21,0.08)" }}>
          <div className="h-4 w-16 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-7 w-32 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-3 w-28 rounded-full mb-5" style={{ background: "var(--linen)" }} />
          <div className="space-y-2 mt-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.72)" }}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md shrink-0" style={{ background: "var(--linen)" }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                    <div className="h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 space-y-4">
          <div className="rounded-lg border p-5 h-44" style={{ background: "rgba(17,19,21,0.95)", borderColor: "rgba(255,255,255,0.14)" }}>
            <div className="h-3 w-28 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-10 w-1/2 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="flex gap-2">
              {[80, 96, 72].map((w) => (
                <div key={w} className="h-8 rounded-lg" style={{ width: w, background: "rgba(255,255,255,0.07)" }} />
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-4 h-24" style={{ borderColor: "var(--line)" }}>
              <div className="h-3 w-20 rounded-full mb-3" style={{ background: "var(--linen)" }} />
              <div className="h-10 w-full rounded-lg" style={{ background: "var(--linen)" }} />
            </div>
            <div className="rounded-lg border bg-white p-4 h-24" style={{ borderColor: "var(--line)" }}>
              <div className="h-3 w-20 rounded-full mb-3" style={{ background: "var(--linen)" }} />
              <div className="h-10 w-full rounded-lg" style={{ background: "var(--linen)" }} />
            </div>
          </div>
          <div className="rounded-lg border bg-white p-5" style={{ borderColor: "var(--line)" }}>
            <div className="h-5 w-36 rounded-full mb-5" style={{ background: "var(--linen)" }} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-md shrink-0" style={{ background: "var(--linen)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
                  <div className="h-10 w-full rounded-lg" style={{ background: "var(--linen)" }} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function JournalLoading() {
  return (
    <div className="min-h-screen pt-[66px] animate-pulse" style={{ background: "var(--surface)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1540px] gap-4 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Sidebar skeleton */}
        <aside className="rounded-lg border bg-white/80 p-4" style={{ borderColor: "var(--line)" }}>
          <div className="h-4 w-20 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-7 w-36 rounded-full mb-2" style={{ background: "var(--linen)" }} />
          <div className="h-3 w-48 rounded-full mb-5" style={{ background: "var(--linen)" }} />
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
                <div className="h-6 w-8 rounded-full mb-1" style={{ background: "var(--linen)" }} />
                <div className="h-2.5 w-12 rounded-full" style={{ background: "var(--linen)" }} />
              </div>
            ))}
          </div>
          <div className="h-10 w-full rounded-lg mb-5" style={{ background: "var(--linen)" }} />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line)", background: "white" }}>
                <div className="h-3.5 w-3/4 rounded-full mb-2" style={{ background: "var(--linen)" }} />
                <div className="h-3 w-1/2 rounded-full" style={{ background: "var(--linen)" }} />
              </div>
            ))}
          </div>
        </aside>

        {/* Main skeleton */}
        <main className="min-w-0 space-y-4">
          <div className="rounded-lg border p-5 h-40" style={{ background: "rgba(17,19,21,0.9)", borderColor: "rgba(255,255,255,0.14)" }}>
            <div className="h-3 w-24 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="h-10 w-2/3 rounded-xl mb-3" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-3 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${i === 0 ? "md:col-span-2 2xl:col-span-1" : ""} rounded-lg border bg-white overflow-hidden`} style={{ borderColor: "var(--line)" }}>
                <div className="h-44" style={{ background: "var(--linen)" }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                  <div className="h-3 w-full rounded-full" style={{ background: "var(--linen)" }} />
                  <div className="h-3 w-2/3 rounded-full" style={{ background: "var(--linen)" }} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

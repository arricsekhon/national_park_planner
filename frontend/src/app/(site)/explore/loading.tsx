export default function ExploreLoading() {
  return (
    <div className="min-h-screen pt-[var(--nav-h)] animate-pulse" style={{ background: "var(--surface)" }}>
      <div className="mx-auto flex min-h-[calc(100vh-66px)] max-w-[1680px] flex-col px-4 py-4 sm:px-6">
        <section
          className="relative mb-4 overflow-hidden rounded-[2.2rem] border p-4 sm:p-5"
          style={{ background: "rgba(255,255,255,0.72)", borderColor: "rgba(255,255,255,0.78)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="h-6 w-20 rounded-full mb-4" style={{ background: "var(--linen)" }} />
          <div className="h-12 w-2/3 rounded-full mb-3" style={{ background: "var(--linen)" }} />
          <div className="h-4 w-1/2 rounded-full mb-6" style={{ background: "var(--linen)" }} />
          <div className="flex gap-3">
            <div className="h-14 flex-1 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-14 w-40 rounded-full" style={{ background: "var(--linen)" }} />
            <div className="h-14 w-24 rounded-full" style={{ background: "var(--linen)" }} />
          </div>
        </section>

        <section className="flex-1">
          <div
            className="min-h-[580px] rounded-[2rem] border p-4"
            style={{ background: "rgba(255,255,255,0.68)", borderColor: "rgba(255,255,255,0.76)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-[1.6rem] border p-3" style={{ background: "rgba(255,255,255,0.72)", borderColor: "var(--line)" }}>
                  <div className="h-44 rounded-[1.25rem]" style={{ background: "var(--linen)" }} />
                  <div className="mt-4 space-y-2 px-2">
                    <div className="h-4 w-3/4 rounded-full" style={{ background: "var(--linen)" }} />
                    <div className="h-3 w-full rounded-full" style={{ background: "var(--linen)" }} />
                    <div className="h-3 w-2/3 rounded-full" style={{ background: "var(--linen)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

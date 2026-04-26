export default function SiteLoading() {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
        <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    </div>
  );
}

import { AuthIcon, type AuthIconName } from "./AuthIcon";

export type AuthVisualVariant = "returning" | "starting";

export const VISUAL_STYLES: Record<
  AuthVisualVariant,
  {
    panel: string;
    overlay: string;
    mark: AuthIconName;
    markBackground: string;
    statBackground: string;
    statBorder: string;
    statLabel: string;
  }
> = {
  returning: {
    panel: "linear-gradient(135deg, #111315 0%, #203438 46%, #176d65 100%)",
    overlay:
      "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
    mark: "route",
    markBackground: "rgba(255,255,255,0.14)",
    statBackground: "rgba(255,255,255,0.12)",
    statBorder: "rgba(255,255,255,0.16)",
    statLabel: "rgba(255,255,255,0.58)",
  },
  starting: {
    panel: "linear-gradient(135deg, #142327 0%, #23534f 42%, #a96f2d 100%)",
    overlay:
      "linear-gradient(120deg, rgba(255,255,255,0.1) 0 2px, transparent 2px 28px), linear-gradient(30deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 34px)",
    mark: "compass",
    markBackground: "rgba(255,255,255,0.16)",
    statBackground: "rgba(255,255,255,0.13)",
    statBorder: "rgba(255,255,255,0.18)",
    statLabel: "rgba(255,255,255,0.6)",
  },
};

export function AuthVisualPanel({ variant }: { variant: AuthVisualVariant }) {
  return variant === "returning" ? <ReturningVisual /> : <StartingVisual />;
}

export function MobileAuthAccent({
  eyebrow,
  title,
  visual,
}: {
  eyebrow: string;
  title: string;
  visual: (typeof VISUAL_STYLES)[AuthVisualVariant];
}) {
  return (
    <section
      className="mb-4 overflow-hidden rounded-lg border p-4 text-white lg:hidden"
      style={{ background: visual.panel, borderColor: "rgba(17,19,21,0.1)", boxShadow: "var(--shadow-sm)" }}
      aria-label={eyebrow}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/16"
          style={{ background: visual.markBackground }}
        >
          <AuthIcon name={visual.mark} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">{eyebrow}</p>
          <p className="mt-1 text-lg font-semibold leading-snug">{title}</p>
        </div>
      </div>
    </section>
  );
}

function ReturningVisual() {
  return (
    <div className="w-full max-w-[620px] rounded-lg border border-white/16 bg-white/10 p-5 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Saved route</p>
          <p className="mt-1 text-lg font-semibold text-white">Alpine loop</p>
        </div>
        <span className="rounded-md border border-white/14 bg-white/12 px-3 py-1 text-xs font-semibold text-white/70">Day 2</span>
      </div>

      <div className="relative h-44 overflow-hidden rounded-lg border border-white/14 bg-[rgba(255,255,255,0.08)]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.11)_1px,transparent_1px)] [background-size:36px_36px]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 480 176" fill="none" aria-hidden="true">
          <path
            d="M36 128 C98 72 148 160 205 98 C258 40 302 106 344 74 C381 46 415 55 445 32"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M36 128 C98 72 148 160 205 98 C258 40 302 106 344 74 C381 46 415 55 445 32"
            stroke="#f6f0dc"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="10 12"
          />
          <circle cx="36" cy="128" r="8" fill="#f6f0dc" />
          <circle cx="205" cy="98" r="8" fill="#8fd0c5" />
          <circle cx="445" cy="32" r="8" fill="#f6f0dc" />
        </svg>
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
          {[
            ["06:30", "Start"],
            ["8.4 mi", "Trail"],
            ["Clear", "Weather"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-md border border-white/14 bg-black/16 px-3 py-2">
              <p className="text-sm font-semibold text-white">{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StartingVisual() {
  return (
    <div className="w-full max-w-[620px] rounded-lg border border-white/18 bg-white/10 p-5 backdrop-blur-xl">
      <div className="grid grid-cols-[1fr_0.75fr] gap-3">
        <div className="rounded-lg border border-white/16 bg-white/14 p-4">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/52">Trip board</p>
            <AuthIcon name="calendar" className="h-5 w-5 text-white/68" />
          </div>
          <div className="space-y-3">
            {[
              ["Choose parks", "bg-[#f6f0dc]"],
              ["Compare weather", "bg-[#8fd0c5]"],
              ["Pack notes", "bg-white/70"],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-3 rounded-md border border-white/14 bg-black/12 p-3">
                <span className={`h-3 w-3 rounded-full ${color}`} />
                <span className="text-sm font-semibold text-white/84">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-white/16 bg-white/14 p-4">
            <AuthIcon name="map" className="mb-4 h-5 w-5 text-white/68" />
            <p className="text-3xl font-semibold text-white">12</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/52">Saved ideas</p>
          </div>
          <div className="rounded-lg border border-white/16 bg-white/14 p-4">
            <AuthIcon name="clock" className="mb-4 h-5 w-5 text-white/68" />
            <p className="text-3xl font-semibold text-white">4d</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/52">Sample trip</p>
          </div>
        </div>
      </div>
    </div>
  );
}

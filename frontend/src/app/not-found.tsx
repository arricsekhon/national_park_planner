import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#fbfbf8]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="w-20 h-20 mb-6 text-[#111315] opacity-20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 52 L20 24 L32 38 L44 18 L60 52 Z" />
        <circle cx="44" cy="16" r="3" fill="currentColor" stroke="none" />
      </svg>

      <p className="text-sm font-medium tracking-widest uppercase text-[#888] mb-3">
        404
      </p>
      <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#111315] mb-4">
        Trail not found.
      </h1>
      <p className="text-[#555] text-base max-w-xs mb-10">
        This path does not lead anywhere. The park you are looking for may have
        moved or never existed.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-6 py-3 rounded-full bg-[#111315] text-white text-sm font-medium hover:bg-[#2a2d2f] transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/explore"
          className="px-6 py-3 rounded-full border border-[#ddd] text-sm font-medium text-[#111315] hover:bg-[#f0efec] transition-colors"
        >
          Explore parks
        </Link>
      </div>
    </div>
  );
}

import Image from "next/image";

type BrandLogoProps = {
  variant?: "compact" | "full";
  className?: string;
  textColor?: string;
  tone?: "dark" | "light";
};

const logoSource = "/trailquest-logo.png?v=2";
const logoWidth = 1188;
const logoHeight = 555;

export default function BrandLogo({
  variant = "compact",
  className = "",
  textColor = "currentColor",
  tone = "dark",
}: BrandLogoProps) {
  const imageToneClass = tone === "light" ? "brightness-0 invert" : "";

  if (variant === "full") {
    return (
      <span className={`inline-flex items-center gap-3 ${className}`}>
        <span className="relative h-12 w-[104px] shrink-0" aria-hidden="true">
          <Image
            src={logoSource}
            alt=""
            width={logoWidth}
            height={logoHeight}
            unoptimized
            className={`h-full w-full object-contain ${imageToneClass}`}
          />
        </span>
        <span className="grid gap-0.5 leading-none" style={{ color: textColor }}>
          <span className="text-lg font-bold uppercase">TrailQuest</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">National Park Planner</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative h-9 w-[76px] shrink-0 rounded-md bg-[#f7f6f0] p-1.5" aria-hidden="true">
        <Image
          src={logoSource}
          alt=""
          width={logoWidth}
          height={logoHeight}
          unoptimized
          className={`h-full w-full object-contain ${imageToneClass}`}
        />
      </span>
      <span className="text-[15px] font-semibold" style={{ color: textColor }}>
        TrailQuest
      </span>
    </span>
  );
}

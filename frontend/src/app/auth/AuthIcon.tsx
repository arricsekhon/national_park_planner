export type AuthIconName =
  | "arrowRight"
  | "calendar"
  | "check"
  | "clock"
  | "compass"
  | "eye"
  | "eyeOff"
  | "google"
  | "lock"
  | "mail"
  | "map"
  | "mountain"
  | "route"
  | "shield"
  | "user";

export function AuthIcon({ name, className = "h-5 w-5" }: { name: AuthIconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "arrowRight":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "compass":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m16 8-2.3 5.7L8 16l2.3-5.7L16 8Z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg {...common}>
          <path d="m3 3 18 18" />
          <path d="M10.7 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.3 4.4" />
          <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.3-.9" />
          <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
        </svg>
      );
    case "google":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.8 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.5a4.7 4.7 0 0 1-2 3.1V20h3.2c1.9-1.8 3.1-4.4 3.1-7.8Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2 1-3.5 1-2.7 0-4.9-1.8-5.7-4.2H3v2.7A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.3 13.8A6 6 0 0 1 6 12c0-.6.1-1.2.3-1.8V7.5H3A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.5l3.3-2.7Z"
          />
          <path
            fill="#EA4335"
            d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.5l3.3 2.7C7.1 7.8 9.3 6 12 6Z"
          />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      );
    case "mountain":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M2 21 8.2 7.6l4.5 7.9 3.2-5.4L22 21H2Z" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6" cy="19" r="3" />
          <circle cx="18" cy="5" r="3" />
          <path d="M12 19h3a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}

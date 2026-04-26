"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/planner", label: "Plan a Trip" },
  { href: "/journal", label: "My Journal" },
];

const USER_MENU_LINKS = [
  {
    href: "/profile", label: "My Profile",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    href: "/planner", label: "My Trips",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
  },
  {
    href: "/journal", label: "My Journal",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  },
  {
    href: "/explore", label: "Explore Parks",
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 21L8 8l4.5 8L16 10l6 11H2z"/></svg>,
  },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const isHome = pathname === "/";
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = "primary-mobile-navigation";
  const userMenuId = "user-account-menu";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMenuOpen(false);
      setUserMenuOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const transparent = isHome && !scrolled;
  const onHero = transparent;

  const handleSignOut = () => {
    signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  const TAB_ITEMS = [
    {
      href: "/explore",
      label: "Explore",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M2 21L8 8l4.5 8L16 10l6 11H2z"/>
        </svg>
      ),
    },
    {
      href: "/planner",
      label: "Plan",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11l19-9-9 19-2-8-8-2z"/>
        </svg>
      ),
    },
    {
      href: "/journal",
      label: "Journal",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
      ),
    },
  ];

  return (
    <>
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: transparent ? "linear-gradient(to bottom, rgba(0,0,0,0.28), transparent)" : "rgba(251,251,248,0.78)",
        backdropFilter: transparent ? "none" : "blur(24px) saturate(160%)",
        borderBottom: transparent ? "1px solid transparent" : "1px solid rgba(17,19,21,0.08)",
        boxShadow: transparent ? "none" : "0 10px 40px rgba(17,19,21,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[66px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            style={{
              background: onHero ? "rgba(255,255,255,0.16)" : "rgba(17,19,21,0.06)",
              border: onHero ? "1px solid rgba(255,255,255,0.24)" : "1px solid rgba(17,19,21,0.08)",
              color: onHero ? "white" : "var(--ink)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21L8 8l4.5 8L16 10l6 11H2z" />
            </svg>
          </div>
          <span
            className="font-semibold text-[15px]"
            style={{ color: onHero ? "white" : "var(--ink)" }}
          >
            TrailQuest
          </span>
        </Link>

        {/* Desktop nav */}
        <div
          className="hidden md:flex items-center gap-1 rounded-full px-1.5 py-1.5"
          style={{
            background: onHero ? "rgba(255,255,255,0.1)" : "rgba(17,19,21,0.04)",
            border: onHero ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(17,19,21,0.06)",
          }}
        >
          {LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200"
                style={{
                  color: active ? (onHero ? "var(--ink)" : "white") : (onHero ? "rgba(255,255,255,0.76)" : "rgba(17,19,21,0.64)"),
                  background: active ? (onHero ? "rgba(255,255,255,0.86)" : "var(--ink)") : "transparent",
                }}
              >
                {label}
              </Link>
            );
          })}

          {/* Auth area */}
          {!loading && (
            <div className="ml-3 flex items-center gap-2">
              {user ? (
                /* User menu */
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all hover:bg-white/10"
                    style={{ color: onHero ? "white" : "var(--ink)" }}
                    aria-expanded={userMenuOpen}
                    aria-controls={userMenuId}
                    aria-label="Open account menu"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "var(--accent)" }}
                    >
                      {initials(user.name)}
                    </div>
                    <span className="text-sm font-medium max-w-[100px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ transform: userMenuOpen ? "rotate(180deg)" : "", transition: "transform 200ms" }}
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div
                      id={userMenuId}
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden py-1"
                      style={{
                        background: "white",
                        boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {/* User info */}
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
                        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{user.name}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{user.email}</p>
                      </div>

                      {USER_MENU_LINKS.map(({ href, label, icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-stone-50"
                          style={{ color: "var(--ink)" }}
                        >
                          <span style={{ color: "var(--muted)" }}>{icon}</span>
                          {label}
                        </Link>
                      ))}

                      <div style={{ borderTop: "1px solid var(--line)" }} className="mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-50 text-left"
                          style={{ color: "#dc2626" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Sign in / Sign up */
                <>
                  <Link
                    href="/auth/signin"
                    className="px-4 py-2 text-sm font-medium transition-colors rounded-full hover:bg-white/10"
                    style={{ color: onHero ? "rgba(255,255,255,0.82)" : "rgba(17,19,21,0.68)" }}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${onHero ? "" : "btn-ink"}`}
                    style={onHero ? { background: "white", color: "var(--ink)" } : undefined}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px]"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls={mobileMenuId}
        >
          <span className="block w-5 h-[1.5px] bg-white/80 transition-all duration-300 origin-center"
            style={{ transform: menuOpen ? "rotate(45deg) translateY(6.5px)" : "", background: onHero ? "rgba(255,255,255,0.82)" : "rgba(17,19,21,0.72)" }} />
          <span className="block w-5 h-[1.5px] bg-white/80 transition-all duration-300"
            style={{ opacity: menuOpen ? 0 : 1, background: onHero ? "rgba(255,255,255,0.82)" : "rgba(17,19,21,0.72)" }} />
          <span className="block w-5 h-[1.5px] bg-white/80 transition-all duration-300 origin-center"
            style={{ transform: menuOpen ? "rotate(-45deg) translateY(-6.5px)" : "", background: onHero ? "rgba(255,255,255,0.82)" : "rgba(17,19,21,0.72)" }} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id={mobileMenuId}
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: menuOpen ? 400 : 0,
          background: "rgba(251,251,248,0.96)",
          borderTop: menuOpen ? "1px solid rgba(17,19,21,0.08)" : "none",
          backdropFilter: "blur(24px)",
        }}
      >
        <div className="px-6 py-5 flex flex-col gap-1">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="py-2.5 text-sm font-medium transition-colors"
              style={{ color: pathname.startsWith(href) ? "var(--ink)" : "var(--muted)" }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}

          <div className="pt-4 mt-2 border-t flex flex-col gap-2.5" style={{ borderColor: "var(--line)" }}>
            {user ? (
              <>
                <div className="flex items-center gap-2.5 py-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "var(--accent)" }}
                  >
                    {initials(user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{user.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  className="text-left text-sm font-medium py-2"
                  style={{ color: "#f87171" }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium py-2"
                  style={{ color: "var(--muted)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-ink inline-block px-4 py-2.5 rounded-full text-sm font-semibold text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Create account →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>

    {/* Sticky bottom tab bar — mobile only, hidden on auth pages */}
    {!pathname.startsWith("/auth") && (
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: "rgba(251,251,248,0.96)",
          backdropFilter: "blur(24px) saturate(160%)",
          borderTop: "1px solid rgba(17,19,21,0.08)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {TAB_ITEMS.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors"
              style={{ color: active ? "var(--accent)" : "rgba(17,19,21,0.45)" }}
            >
              {icon}
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    )}
    </>
  );
}

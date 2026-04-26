"use client";

import Image from "next/image";
import { useState, useSyncExternalStore, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const ONBOARD_KEY = "trailquest_onboarded";
const ONBOARD_EVENT = "trailquest-onboarded";

const INTERESTS = [
  { id: "hiking", label: "Hiking & Trails", emoji: "🥾" },
  { id: "camping", label: "Camping", emoji: "⛺" },
  { id: "wildlife", label: "Wildlife Watching", emoji: "🦌" },
  { id: "climbing", label: "Rock Climbing", emoji: "🧗" },
  { id: "kayaking", label: "Kayaking & Water", emoji: "🛶" },
  { id: "photography", label: "Photography", emoji: "📷" },
  { id: "history", label: "History & Culture", emoji: "🏛️" },
  { id: "cycling", label: "Cycling", emoji: "🚵" },
];

const PARK_PICKS: Record<string, { name: string; states: string; img: string; code: string }[]> = {
  hiking: [
    { name: "Zion National Park", states: "UT", img: "https://www.nps.gov/common/uploads/structured_data/3C7C3E40-1DD8-B71B-0BDDB8A17D2C9ECB.jpg", code: "zion" },
    { name: "Yosemite National Park", states: "CA", img: "https://www.nps.gov/common/uploads/structured_data/3C7B45AE-1DD8-B71B-0B2CF9C0B36B8BD4.jpg", code: "yose" },
    { name: "Grand Canyon National Park", states: "AZ", img: "https://www.nps.gov/common/uploads/structured_data/3C7D830C-1DD8-B71B-0B0D6DCA1D900B72.jpg", code: "grca" },
  ],
  camping: [
    { name: "Rocky Mountain National Park", states: "CO", img: "https://www.nps.gov/common/uploads/structured_data/3C7ECB6E-1DD8-B71B-0B91A5B89F9E0F25.jpg", code: "romo" },
    { name: "Olympic National Park", states: "WA", img: "https://www.nps.gov/common/uploads/structured_data/3C7B2C0B-1DD8-B71B-0B3AE9B6E41DEBE4.jpg", code: "olym" },
    { name: "Yosemite National Park", states: "CA", img: "https://www.nps.gov/common/uploads/structured_data/3C7B45AE-1DD8-B71B-0B2CF9C0B36B8BD4.jpg", code: "yose" },
  ],
  wildlife: [
    { name: "Everglades National Park", states: "FL", img: "https://www.nps.gov/common/uploads/structured_data/3C85140A-1DD8-B71B-0BC63B8D23E4DCEE.jpg", code: "ever" },
    { name: "Denali National Park", states: "AK", img: "https://www.nps.gov/common/uploads/structured_data/3C7B2B53-1DD8-B71B-0B7AB9B94FA73B3B.jpg", code: "dena" },
    { name: "Grand Canyon National Park", states: "AZ", img: "https://www.nps.gov/common/uploads/structured_data/3C7D830C-1DD8-B71B-0B0D6DCA1D900B72.jpg", code: "grca" },
  ],
  climbing: [
    { name: "Yosemite National Park", states: "CA", img: "https://www.nps.gov/common/uploads/structured_data/3C7B45AE-1DD8-B71B-0B2CF9C0B36B8BD4.jpg", code: "yose" },
    { name: "Joshua Tree National Park", states: "CA", img: "https://www.nps.gov/common/uploads/structured_data/3C84BEC5-1DD8-B71B-0BE7AAE9EBEEC1C2.jpg", code: "jotr" },
    { name: "Zion National Park", states: "UT", img: "https://www.nps.gov/common/uploads/structured_data/3C7C3E40-1DD8-B71B-0BDDB8A17D2C9ECB.jpg", code: "zion" },
  ],
};

function getRecommended(interests: string[]) {
  const seen = new Set<string>();
  const result: { name: string; states: string; img: string; code: string }[] = [];
  for (const id of interests) {
    for (const park of (PARK_PICKS[id] ?? [])) {
      if (!seen.has(park.code) && result.length < 3) {
        seen.add(park.code);
        result.push(park);
      }
    }
  }
  if (result.length === 0) return PARK_PICKS.hiking;
  return result;
}

function subscribeToOnboarding(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === ONBOARD_KEY) callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(ONBOARD_EVENT, callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ONBOARD_EVENT, callback);
  };
}

function getOnboardingSnapshot() {
  if (typeof window === "undefined") return "1";
  return localStorage.getItem(ONBOARD_KEY);
}

export default function OnboardingModal() {
  const { user } = useAuth();
  const dismissed = Boolean(useSyncExternalStore(subscribeToOnboarding, getOnboardingSnapshot, () => "1"));
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const visible = !dismissed && !user;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const dismiss = () => {
    localStorage.setItem(ONBOARD_KEY, "1");
    window.dispatchEvent(new Event(ONBOARD_EVENT));
    previousFocusRef.current?.focus();
  };

  // Store the element that had focus before the modal opened, then focus the modal
  useEffect(() => {
    if (!visible) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [visible]);

  // Escape key to dismiss
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Focus trap — keep Tab/Shift+Tab inside the dialog
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible]);

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  if (!visible) return null;

  const recommended = getRecommended(interests.length ? interests : ["hiking"]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(5,15,8,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "var(--surface)", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}
      >
        {/* Header stripe */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ background: "linear-gradient(135deg, #071510 0%, #1a3a2a 100%)" }}
        >
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/90 transition-colors text-sm"
            aria-label="Close onboarding"
          >
            ✕
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2d5a3d, #4a7c59)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2 21L8 8l4.5 8L16 10l6 11H2z"/></svg>
            </div>
            <span className="font-bold text-white text-base" style={{ fontFamily: "var(--font-playfair)" }}>
              Trail<span style={{ color: "#c8860a" }}>Quest</span>
            </span>
          </div>
          <h2 id="onboarding-title" className="font-bold text-white text-2xl leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
            {step === 0 ? "Welcome to TrailQuest" : step === 1 ? "Parks you'll love" : "Ready to explore?"}
          </h2>
          <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {step === 0 ? "Pick what you love to do outdoors" : step === 1 ? "Based on your interests" : "Create a free account to save parks and plan trips"}
          </p>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{ width: i === step ? 24 : 8, background: i <= step ? "#c8860a" : "rgba(255,255,255,0.2)" }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {step === 0 && (
            <>
              <p className="text-xs mb-4 font-medium" style={{ color: "var(--muted)" }}>
                Pick up to 4 activities (optional)
              </p>
              <div className="grid grid-cols-4 gap-2">
                {INTERESTS.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => toggleInterest(id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-center transition-all"
                    style={{
                      background: interests.includes(id) ? "var(--accent-soft)" : "white",
                      border: `1.5px solid ${interests.includes(id) ? "rgba(45,90,61,0.4)" : "rgba(26,58,42,0.1)"}`,
                      boxShadow: interests.includes(id) ? "0 2px 8px rgba(45,90,61,0.12)" : "none",
                    }}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-[10px] font-semibold leading-tight" style={{ color: "var(--ink)" }}>{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {recommended.map((park) => (
                <div
                  key={park.code}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "white", border: "1px solid rgba(26,58,42,0.08)" }}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative" style={{ background: "var(--linen)" }}>
                    <Image src={park.img} alt={park.name} fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-1" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>{park.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{park.states}</p>
                  </div>
                  <Link
                    href={`/parks/${park.code}`}
                    onClick={dismiss}
                    className="text-xs font-semibold shrink-0 px-3 py-1.5 rounded-lg transition-colors hover:bg-stone-50"
                    style={{ color: "var(--accent)", border: "1px solid rgba(45,90,61,0.2)" }}
                  >
                    Explore →
                  </Link>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {[
                { icon: "❤️", text: "Save parks you love or want to visit" },
                { icon: "🗓️", text: "Build multi-stop trip itineraries" },
                { icon: "📔", text: "Journal your hikes with photos" },
                { icon: "🆚", text: "Compare parks side by side" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{icon}</span>
                  <p className="text-sm" style={{ color: "var(--ink)" }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex gap-3">
          {step < 2 ? (
            <>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{ background: "var(--accent)" }}
              >
                {step === 0 ? (interests.length ? "See recommendations →" : "Skip →") : "Continue →"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signup"
                onClick={dismiss}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold text-center transition-all hover:opacity-90"
                style={{ background: "#c8860a" }}
              >
                Create free account →
              </Link>
              <button
                onClick={dismiss}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-stone-100"
                style={{ color: "var(--muted)" }}
              >
                Skip
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { createContext, useContext, useCallback, useMemo, useSyncExternalStore } from "react";

const FAV_KEY = "trailquest_favorites";
const VISIT_KEY = "trailquest_visit_status";
const COMPARE_KEY = "trailquest_compare";
const RATINGS_KEY = "trailquest_ratings";
const EMPTY_FAVORITES: FavoritePark[] = [];
const EMPTY_VISIT_STATUS: Record<string, "want" | "been"> = {};
const EMPTY_COMPARE_LIST: ComparePark[] = [];
const EMPTY_RATINGS: Record<string, ParkRating> = {};

export interface FavoritePark {
  code: string;
  name: string;
  states: string;
  imageUrl?: string;
}

export interface ComparePark {
  code: string;
  name: string;
}

export interface ParkRating {
  stars: number;
  review: string;
  date: string;
}

interface ParkDataCtx {
  favorites: FavoritePark[];
  toggleFavorite: (park: FavoritePark) => void;
  isFavorite: (code: string) => boolean;
  visitStatus: Record<string, "want" | "been">;
  setVisitStatus: (code: string, status: "none" | "want" | "been") => void;
  getVisitStatus: (code: string) => "none" | "want" | "been";
  compareList: ComparePark[];
  toggleCompare: (park: ComparePark) => void;
  inCompare: (code: string) => boolean;
  clearCompare: () => void;
  ratings: Record<string, ParkRating>;
  setRating: (code: string, rating: ParkRating | null) => void;
  getRating: (code: string) => ParkRating | null;
}

const ParkDataContext = createContext<ParkDataCtx | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

function subscribeToStorage(key: string, callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const localEvent = `trailquest-storage:${key}`;
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(localEvent, callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(localEvent, callback);
  };
}

function getStoredRaw(key: string) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function notifyStorageChange(key: string) {
  window.dispatchEvent(new Event(`trailquest-storage:${key}`));
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  notifyStorageChange(key);
}

function remove(key: string) {
  localStorage.removeItem(key);
  notifyStorageChange(key);
}

function useStoredJson<T>(key: string, fallback: T): T {
  const raw = useSyncExternalStore(
    (callback) => subscribeToStorage(key, callback),
    () => getStoredRaw(key),
    () => null
  );

  return useMemo(() => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) ?? fallback;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);
}

export function ParkDataProvider({ children }: { children: React.ReactNode }) {
  const favorites = useStoredJson<FavoritePark[]>(FAV_KEY, EMPTY_FAVORITES);
  const visitStatus = useStoredJson<Record<string, "want" | "been">>(VISIT_KEY, EMPTY_VISIT_STATUS);
  const compareList = useStoredJson<ComparePark[]>(COMPARE_KEY, EMPTY_COMPARE_LIST);
  const ratings = useStoredJson<Record<string, ParkRating>>(RATINGS_KEY, EMPTY_RATINGS);

  const toggleFavorite = useCallback((park: FavoritePark) => {
    const current = load<FavoritePark[]>(FAV_KEY, []);
    const exists = current.some((f) => f.code === park.code);
    const next = exists ? current.filter((f) => f.code !== park.code) : [...current, park];
    save(FAV_KEY, next);
  }, []);

  const isFavorite = useCallback((code: string) => favorites.some((f) => f.code === code), [favorites]);

  const setVisitStatus = useCallback((code: string, status: "none" | "want" | "been") => {
    const next = { ...load<Record<string, "want" | "been">>(VISIT_KEY, {}) };
    if (status === "none") delete next[code];
    else next[code] = status;
    save(VISIT_KEY, next);
  }, []);

  const getVisitStatus = useCallback((code: string): "none" | "want" | "been" => visitStatus[code] ?? "none", [visitStatus]);

  const toggleCompare = useCallback((park: ComparePark) => {
    const current = load<ComparePark[]>(COMPARE_KEY, []);
    const exists = current.some((p) => p.code === park.code);
    let next: ComparePark[];
    if (exists) {
      next = current.filter((p) => p.code !== park.code);
    } else if (current.length >= 3) {
      return;
    } else {
      next = [...current, park];
    }
    save(COMPARE_KEY, next);
  }, []);

  const inCompare = useCallback((code: string) => compareList.some((p) => p.code === code), [compareList]);

  const clearCompare = useCallback(() => {
    remove(COMPARE_KEY);
  }, []);

  const setRating = useCallback((code: string, rating: ParkRating | null) => {
    const next = { ...load<Record<string, ParkRating>>(RATINGS_KEY, {}) };
    if (rating === null) delete next[code];
    else next[code] = rating;
    save(RATINGS_KEY, next);
  }, []);

  const getRating = useCallback((code: string): ParkRating | null => ratings[code] ?? null, [ratings]);

  const value = useMemo(
    () => ({
      favorites, toggleFavorite, isFavorite,
      visitStatus, setVisitStatus, getVisitStatus,
      compareList, toggleCompare, inCompare, clearCompare,
      ratings, setRating, getRating,
    }),
    [
      favorites,
      toggleFavorite,
      isFavorite,
      visitStatus,
      setVisitStatus,
      getVisitStatus,
      compareList,
      toggleCompare,
      inCompare,
      clearCompare,
      ratings,
      setRating,
      getRating,
    ]
  );

  return (
    <ParkDataContext.Provider value={value}>
      {children}
    </ParkDataContext.Provider>
  );
}

export function useParkData() {
  const ctx = useContext(ParkDataContext);
  if (!ctx) throw new Error("useParkData must be used inside ParkDataProvider");
  return ctx;
}

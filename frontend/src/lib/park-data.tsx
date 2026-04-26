"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const COMPARE_KEY = "trailquest_compare";
const FAV_LS = "trailquest_favorites";
const VISIT_LS = "trailquest_visit_status";
const RATINGS_LS = "trailquest_ratings";

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

function lsLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

function lsSave<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function ParkDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePark[]>([]);
  const [visitStatus, setVisitStatusMap] = useState<Record<string, "want" | "been">>({});
  const [compareList, setCompareList] = useState<ComparePark[]>([]);
  const [ratings, setRatingsMap] = useState<Record<string, ParkRating>>({});

  useEffect(() => {
    setCompareList(lsLoad<ComparePark[]>(COMPARE_KEY, []));
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setFavorites(lsLoad<FavoritePark[]>(FAV_LS, []));
      setVisitStatusMap(lsLoad<Record<string, "want" | "been">>(VISIT_LS, {}));
      setRatingsMap(lsLoad<Record<string, ParkRating>>(RATINGS_LS, {}));
      return;
    }

    void Promise.all([
      supabase.from("favorites").select("park_code,park_name,park_states,image_url").eq("user_id", user.id),
      supabase.from("visit_status").select("park_code,status").eq("user_id", user.id),
      supabase.from("park_ratings").select("park_code,stars,review,date").eq("user_id", user.id),
    ]).then(([{ data: favs }, { data: visits }, { data: rats }]) => {
      if (favs) {
        setFavorites(favs.map((f) => ({
          code: f.park_code as string,
          name: f.park_name as string,
          states: (f.park_states as string) ?? "",
          imageUrl: (f.image_url as string | null) ?? undefined,
        })));
      }
      if (visits) {
        const m: Record<string, "want" | "been"> = {};
        visits.forEach((v) => { m[v.park_code as string] = v.status as "want" | "been"; });
        setVisitStatusMap(m);
      }
      if (rats) {
        const m: Record<string, ParkRating> = {};
        rats.forEach((r) => {
          m[r.park_code as string] = {
            stars: r.stars as number,
            review: (r.review as string) ?? "",
            date: (r.date as string) ?? "",
          };
        });
        setRatingsMap(m);
      }
    });
  }, [user, authLoading]);

  const toggleFavorite = useCallback((park: FavoritePark) => {
    const exists = favorites.some((f) => f.code === park.code);
    const next = exists ? favorites.filter((f) => f.code !== park.code) : [...favorites, park];
    setFavorites(next);

    if (!user) { lsSave(FAV_LS, next); return; }
    if (exists) {
      void supabase.from("favorites").delete().eq("user_id", user.id).eq("park_code", park.code);
    } else {
      void supabase.from("favorites").insert({
        user_id: user.id,
        park_code: park.code,
        park_name: park.name,
        park_states: park.states,
        image_url: park.imageUrl ?? null,
      });
    }
  }, [favorites, user]);

  const isFavorite = useCallback((code: string) => favorites.some((f) => f.code === code), [favorites]);

  const setVisitStatus = useCallback((code: string, status: "none" | "want" | "been") => {
    const next = { ...visitStatus };
    if (status === "none") delete next[code];
    else next[code] = status;
    setVisitStatusMap(next);

    if (!user) { lsSave(VISIT_LS, next); return; }
    if (status === "none") {
      void supabase.from("visit_status").delete().eq("user_id", user.id).eq("park_code", code);
    } else {
      void supabase.from("visit_status").upsert(
        { user_id: user.id, park_code: code, status },
        { onConflict: "user_id,park_code" }
      );
    }
  }, [visitStatus, user]);

  const getVisitStatus = useCallback((code: string): "none" | "want" | "been" => visitStatus[code] ?? "none", [visitStatus]);

  const toggleCompare = useCallback((park: ComparePark) => {
    const exists = compareList.some((p) => p.code === park.code);
    let next: ComparePark[];
    if (exists) {
      next = compareList.filter((p) => p.code !== park.code);
    } else if (compareList.length >= 3) {
      return;
    } else {
      next = [...compareList, park];
    }
    setCompareList(next);
    lsSave(COMPARE_KEY, next);
  }, [compareList]);

  const inCompare = useCallback((code: string) => compareList.some((p) => p.code === code), [compareList]);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    lsSave(COMPARE_KEY, []);
  }, []);

  const setRating = useCallback((code: string, rating: ParkRating | null) => {
    const next = { ...ratings };
    if (rating === null) delete next[code];
    else next[code] = rating;
    setRatingsMap(next);

    if (!user) { lsSave(RATINGS_LS, next); return; }
    if (rating === null) {
      void supabase.from("park_ratings").delete().eq("user_id", user.id).eq("park_code", code);
    } else {
      void supabase.from("park_ratings").upsert(
        { user_id: user.id, park_code: code, stars: rating.stars, review: rating.review, date: rating.date },
        { onConflict: "user_id,park_code" }
      );
    }
  }, [ratings, user]);

  const getRating = useCallback((code: string): ParkRating | null => ratings[code] ?? null, [ratings]);

  const value = useMemo(
    () => ({
      favorites, toggleFavorite, isFavorite,
      visitStatus, setVisitStatus, getVisitStatus,
      compareList, toggleCompare, inCompare, clearCompare,
      ratings, setRating, getRating,
    }),
    [
      favorites, toggleFavorite, isFavorite,
      visitStatus, setVisitStatus, getVisitStatus,
      compareList, toggleCompare, inCompare, clearCompare,
      ratings, setRating, getRating,
    ]
  );

  return <ParkDataContext.Provider value={value}>{children}</ParkDataContext.Provider>;
}

export function useParkData() {
  const ctx = useContext(ParkDataContext);
  if (!ctx) throw new Error("useParkData must be used inside ParkDataProvider");
  return ctx;
}

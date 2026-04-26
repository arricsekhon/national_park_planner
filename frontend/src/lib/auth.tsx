"use client";

import { createContext, useContext, useCallback, useMemo, useSyncExternalStore } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

// Demo-only browser auth. This keeps the prototype self-contained; replace it
// with server-issued sessions before handling real users or real passwords.
const USERS_KEY = "trailquest_users";
const SESSION_KEY = "trailquest_session";

function getUsers(): Record<string, { id: string; name: string; email: string; passwordHash: string }> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(USERS_KEY) ?? "{}"); }
  catch { return {}; }
}

function subscribeToSession(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("trailquest-session", callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("trailquest-session", callback);
  };
}

function getSessionRaw() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

function notifySessionChange() {
  window.dispatchEvent(new Event("trailquest-session"));
}

async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createUserId() {
  return crypto.randomUUID();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionRaw = useSyncExternalStore(subscribeToSession, getSessionRaw, () => null);
  const user = useMemo<User | null>(() => {
    try {
      return sessionRaw ? JSON.parse(sessionRaw) : null;
    } catch {
      return null;
    }
  }, [sessionRaw]);
  const loading = false;

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const users = getUsers();
    const key = email.trim().toLowerCase();
    if (users[key]) throw new Error("An account with this email already exists.");
    const newUser = { id: createUserId(), name, email: key, passwordHash: await hashPassword(password) };
    users[key] = newUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const session: User = { id: newUser.id, name: newUser.name, email: newUser.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    notifySessionChange();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const users = getUsers();
    const key = email.trim().toLowerCase();
    const found = users[key];
    if (!found || found.passwordHash !== await hashPassword(password)) {
      throw new Error("Incorrect email or password.");
    }
    const session: User = { id: found.id, name: found.name, email: found.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    notifySessionChange();
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    notifySessionChange();
  }, []);

  const value = useMemo(
    () => ({ user, loading, signUp, signIn, signOut }),
    [user, loading, signUp, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

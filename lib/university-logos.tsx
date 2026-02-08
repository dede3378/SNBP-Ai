import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { getApiUrl } from "@/lib/query-client";

interface LogoContextValue {
  logos: Record<string, string | null>;
  fetchLogos: (names: string[]) => void;
  getLogoUrl: (name: string) => string | null | undefined;
}

const LogoContext = createContext<LogoContextValue | null>(null);

export function UniversityLogoProvider({ children }: { children: ReactNode }) {
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [fetching, setFetching] = useState<Set<string>>(new Set());

  const fetchLogos = useCallback(async (names: string[]) => {
    const toFetch = names.filter(n => !(n in logos) && !fetching.has(n));
    if (toFetch.length === 0) return;

    setFetching(prev => {
      const next = new Set(prev);
      toFetch.forEach(n => next.add(n));
      return next;
    });

    try {
      const apiUrl = getApiUrl();
      const url = new URL("/api/university-logos", apiUrl);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: toFetch }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.logos) {
          setLogos(prev => ({ ...prev, ...data.logos }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch logos:", err);
    } finally {
      setFetching(prev => {
        const next = new Set(prev);
        toFetch.forEach(n => next.delete(n));
        return next;
      });
    }
  }, [logos, fetching]);

  const getLogoUrl = useCallback((name: string): string | null | undefined => {
    return logos[name];
  }, [logos]);

  const value = useMemo(() => ({ logos, fetchLogos, getLogoUrl }), [logos, fetchLogos, getLogoUrl]);

  return (
    <LogoContext.Provider value={value}>
      {children}
    </LogoContext.Provider>
  );
}

export function useUniversityLogos() {
  const ctx = useContext(LogoContext);
  if (!ctx) throw new Error("useUniversityLogos must be used within UniversityLogoProvider");
  return ctx;
}

import React, { createContext, useContext, useMemo, ReactNode } from "react";

const LOGO_MAP: Record<string, string> = {};

const LOGO_MAP_LOWER: Record<string, string> = {};
Object.entries(LOGO_MAP).forEach(([key, value]) => {
  LOGO_MAP_LOWER[key.toLowerCase()] = value;
});

interface LogoContextValue {
  logos: Record<string, string | null>;
  fetchLogos: (names: string[]) => void;
  getLogoUrl: (name: string) => string | null;
}

const LogoContext = createContext<LogoContextValue | null>(null);

function findLogo(name: string): string | null {
  if (LOGO_MAP[name]) return LOGO_MAP[name];
  const lower = name.toLowerCase();
  if (LOGO_MAP_LOWER[lower]) return LOGO_MAP_LOWER[lower];
  for (const [key, url] of Object.entries(LOGO_MAP_LOWER)) {
    if (key.includes(lower) || lower.includes(key)) return url;
  }
  return null;
}

export function UniversityLogoProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({
    logos: LOGO_MAP,
    fetchLogos: (_names: string[]) => {},
    getLogoUrl: (name: string): string | null => findLogo(name),
  }), []);

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

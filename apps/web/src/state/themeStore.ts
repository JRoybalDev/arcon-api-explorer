import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const storageKey = "arcon-api-explorer-theme";
const themeChangeEvent = "arcon-api-explorer-theme-change";

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const saved = window.localStorage.getItem(storageKey);
    return isThemeMode(saved) ? saved : "dark";
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());
  const resolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemTheme(media.matches ? "dark" : "light");

    updateSystemTheme();
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    const updateSavedTheme = () => {
      const saved = window.localStorage.getItem(storageKey);
      setModeState(isThemeMode(saved) ? saved : "dark");
    };

    window.addEventListener("storage", updateSavedTheme);
    window.addEventListener(themeChangeEvent, updateSavedTheme);
    return () => {
      window.removeEventListener("storage", updateSavedTheme);
      window.removeEventListener(themeChangeEvent, updateSavedTheme);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setMode = useMemo(
    () => (nextMode: ThemeMode) => {
      window.localStorage.setItem(storageKey, nextMode);
      window.dispatchEvent(new Event(themeChangeEvent));
      setModeState(nextMode);
    },
    []
  );

  return { mode, resolvedTheme, setMode };
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FiGrid, FiHome, FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { siteConfig } from "../shared/siteConfig";
import { type ThemeMode, useThemeMode } from "../state/themeStore";

const themeOptions: Array<{ mode: ThemeMode; label: string; icon: typeof FiSun }> = [
  { mode: "light", label: "Light theme", icon: FiSun },
  { mode: "dark", label: "Dark theme", icon: FiMoon },
  { mode: "system", label: "Use system theme", icon: FiMonitor }
];

export function App() {
  const { mode, resolvedTheme, setMode } = useThemeMode();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const [isTopbarScrolled, setIsTopbarScrolled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const topbarControls = useAnimationControls();
  const wasTopbarScrolled = useRef(false);
  const mainClassName = isDashboard ? "app-main app-main--dashboard" : "app-main page-grid site-template-body";
  const shellClassName = isDashboard
    ? "app-shell"
    : `app-shell site-template-shell site-template-shell--asides-${siteConfig.frontendAsideMode}${isTopbarScrolled ? " site-template-shell--scrolled" : ""}`;

  useEffect(() => {
    if (isDashboard) {
      setIsTopbarScrolled(false);
      topbarControls.set({ boxShadow: "none", y: 0 });
      return;
    }

    function updateTopbarState() {
      setIsTopbarScrolled(window.scrollY > 8);
    }

    updateTopbarState();
    window.addEventListener("scroll", updateTopbarState, { passive: true });
    return () => window.removeEventListener("scroll", updateTopbarState);
  }, [isDashboard, topbarControls]);

  useEffect(() => {
    if (isDashboard) {
      return;
    }

    const shell = document.querySelector(".site-template-shell");
    const headerOffset = shell ? Number.parseFloat(getComputedStyle(shell).getPropertyValue("--template-header-offset")) || 16 : 16;

    if (prefersReducedMotion) {
      topbarControls.set({ y: 0 });
      wasTopbarScrolled.current = isTopbarScrolled;
      return;
    }

    if (isTopbarScrolled && !wasTopbarScrolled.current) {
      void topbarControls.start({
        y: [headerOffset, 0],
        transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
      });
    } else {
      void topbarControls.start({
        y: 0,
        transition: { duration: 0.18, ease: "easeOut" }
      });
    }

    wasTopbarScrolled.current = isTopbarScrolled;
  }, [isDashboard, isTopbarScrolled, prefersReducedMotion, topbarControls]);

  return (
    <div className={shellClassName}>
      {!isDashboard ? (
        <motion.header animate={topbarControls} className={isTopbarScrolled ? "topbar grid-area-header" : "topbar grid-area-header"}>
          <a className="brand" href="/">
            Fullstack Template
          </a>
          <div className="topbar-actions">
            <nav className="nav-links" aria-label="Primary">
              <NavLink to="/">
                <FiHome aria-hidden /> Public
              </NavLink>
              <NavLink to="/dashboard">
                <FiGrid aria-hidden /> Dashboard
              </NavLink>
            </nav>
            <div className="theme-switcher" aria-label={`Theme selector, currently ${resolvedTheme}`}>
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    aria-label={option.label}
                    aria-pressed={mode === option.mode}
                    className={mode === option.mode ? "active" : ""}
                    key={option.mode}
                    onClick={() => setMode(option.mode)}
                    title={option.label}
                    type="button"
                  >
                    <Icon aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>
        </motion.header>
      ) : null}
      {isDashboard ? (
        <main className={mainClassName}>
          <Outlet />
        </main>
      ) : (
        <AnimatePresence mode="wait">
          <motion.main
            animate={{ opacity: 1, y: 0 }}
            className={mainClassName}
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 10 }}
            key={location.pathname}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      )}
    </div>
  );
}

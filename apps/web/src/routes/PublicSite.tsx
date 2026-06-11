import { type Site, type SiteBranding } from "@fullstack-template/schema";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { type CSSProperties, useEffect } from "react";
import { FiExternalLink } from "react-icons/fi";
import { apiClient } from "../shared/apiClient";
import { LoadingScreen } from "../shared/Loading";
import { setDocumentTitle, setSiteFavicon, siteConfig } from "../shared/siteConfig";
import { useThemeMode } from "../state/themeStore";

const sectionMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 }
};

export function PublicSite() {
  const { resolvedTheme } = useThemeMode();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sites"],
    queryFn: () => apiClient.sites.listPublic()
  });

  const publishedSites = data?.filter((site) => site.published) ?? [];
  const featured = publishedSites[0];
  const frontendAsideMode = featured?.metadata.frontendAsideMode ?? siteConfig.frontendAsideMode;

  useEffect(() => {
    if (!featured) {
      setDocumentTitle();
      setSiteFavicon();
      setPublicTemplateColors();
      return;
    }

    const pageName = featured.metadata.seoTitle || featured.title;
    const description = featured.metadata.seoDescription || featured.description;
    setDocumentTitle(pageName);
    setSiteFavicon();
    setMetaTag("description", description);
    setMetaProperty("og:title", pageName);
    setMetaProperty("og:description", description);
    if (featured.metadata.ogImageUrl) {
      setMetaProperty("og:image", featured.metadata.ogImageUrl);
    }
    setPublicTemplateColors(getThemeColors(featured.branding, resolvedTheme));
    return () => setPublicTemplateColors();
  }, [featured, resolvedTheme]);

  if (isLoading) {
    return <LoadingScreen label="Loading public site..." />;
  }

  if (error) {
    return <div className="public-empty">API unavailable. Check the Bun server and API health endpoint.</div>;
  }

  return (
    <section
      className={`public-page page-full frontend-template-grid--asides-${frontendAsideMode}`}
      style={featured ? getPublicBrandingStyle(featured, resolvedTheme) : undefined}
    >
      <div className="frontend-template-grid">
        <motion.aside
          animate="visible"
          className="template-section template-aside grid-area-aside-left"
          initial="hidden"
          transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          variants={sectionMotion}
        >
          <div className="template-section__label">Endpoints</div>
          <h2>Public reads</h2>
          <p>Published collection metadata stays open for consumers while every write remains protected by the admin key.</p>
          <div className="template-placeholder-list">
            <span>GET /api/sites</span>
            <span>GET /api/sites/:slug</span>
            <span>GET /uploads/*</span>
          </div>
        </motion.aside>

        <motion.section
          animate="visible"
          aria-label="Main content"
          className="template-section grid-area-main"
          initial="hidden"
          transition={{ delay: 0.1, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          variants={sectionMotion}
        >
          <div className="template-section__label">Explorer</div>
          <div className="public-hero">
            <div className="public-hero-copy">
              <span className="eyebrow">Self-hosted media CDN</span>
              <h1>{featured?.title ?? "ARCON API Explorer"}</h1>
              <p>
                {featured?.description ||
                  "Serve images and media from your own server with protected uploads, generated WebP thumbnails, and predictable JSON responses for client apps."}
              </p>
              <div className="hero-actions">
                <a href="/dashboard" className="btn btn-primary">
                  Open control room
                </a>
                <a href="/health" className="btn btn-secondary">
                  API health <FiExternalLink aria-hidden />
                </a>
              </div>
            </div>
            {featured?.heroImageUrl ? <img src={featured.heroImageUrl} alt="" className="hero-image" /> : null}
          </div>
          <div className="site-grid">
            {publishedSites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
            {publishedSites.length === 0 ? (
              <div className="public-empty">No published collections yet. Create one in the control room.</div>
            ) : null}
          </div>
        </motion.section>

        <motion.aside
          animate="visible"
          className="template-section template-aside grid-area-aside-right"
          initial="hidden"
          transition={{ delay: 0.16, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          variants={sectionMotion}
        >
          <div className="template-section__label">Status</div>
          <h2>CDN snapshot</h2>
          <p>Use the dashboard to publish collections, upload media, copy URLs, and keep storage cleanup in sync.</p>
          <div className="aside-stat-grid">
            <div>
              <strong>{publishedSites.length}</strong>
              <span>Collections</span>
            </div>
            <div>
              <strong>{featured?.links.length ?? 0}</strong>
              <span>Quick links</span>
            </div>
          </div>
        </motion.aside>
      </div>

      <motion.footer
        animate="visible"
        className="template-section public-layout-footer"
        initial="hidden"
        transition={{ delay: 0.22, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        variants={sectionMotion}
      >
        <div className="template-section__label">Contract</div>
        <p>All API responses include a request ID for log correlation and structured JSON envelopes for client integrations.</p>
      </motion.footer>
    </section>
  );
}

type PublicThemeColors = {
  accent: string;
  accentStrong: string;
  accentText: string;
  background: string;
  border: string;
  borderAccent: string;
  borderDanger: string;
  borderStrong: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryBorder: string;
  buttonSecondaryText: string;
  danger: string;
  heading: string;
  muted: string;
  nav: string;
  navActive: string;
  surface: string;
  surfaceAccent: string;
  surfaceDanger: string;
  surfaceMuted: string;
  text: string;
  topbar: string;
};

function getThemeColors(branding: SiteBranding, resolvedTheme: "light" | "dark"): PublicThemeColors {
  if (resolvedTheme === "dark") {
    return {
      accent: branding.darkAccentColor || branding.accentColor,
      accentStrong: branding.darkAccentStrongColor || branding.accentColor,
      accentText: branding.darkAccentTextColor || "#d6fbef",
      background: branding.darkBackgroundColor || branding.backgroundColor,
      border: branding.darkBorderColor || "#2c3440",
      borderAccent: branding.darkBorderAccentColor || "#2b6871",
      borderDanger: branding.darkBorderDangerColor || "#6f3535",
      borderStrong: branding.darkBorderStrongColor || "#435061",
      buttonPrimary: branding.darkButtonPrimaryColor || branding.darkAccentColor || branding.accentColor,
      buttonPrimaryText: branding.darkButtonPrimaryTextColor || "#ffffff",
      buttonSecondary: branding.darkButtonSecondaryColor || branding.darkSurfaceMutedColor || branding.surfaceColor,
      buttonSecondaryBorder: branding.darkButtonSecondaryBorderColor || branding.darkBorderStrongColor || "#435061",
      buttonSecondaryText: branding.darkButtonSecondaryTextColor || branding.darkAccentStrongColor || branding.accentColor,
      danger: branding.darkDangerColor || "#ff9b8f",
      heading: branding.darkHeadingColor || branding.headingColor,
      muted: branding.darkMutedColor || branding.textColor,
      nav: branding.darkNavColor || branding.textColor,
      navActive: branding.darkNavActiveColor || branding.surfaceColor,
      surface: branding.darkSurfaceColor || branding.surfaceColor,
      surfaceAccent: branding.darkSurfaceAccentColor || branding.surfaceColor,
      surfaceDanger: branding.darkSurfaceDangerColor || "#3a2020",
      surfaceMuted: branding.darkSurfaceMutedColor || branding.surfaceColor,
      text: branding.darkTextColor || branding.textColor,
      topbar: branding.darkTopbarColor || branding.darkBackgroundColor || branding.backgroundColor
    };
  }

  return {
    accent: branding.lightAccentColor || branding.accentColor,
    accentStrong: branding.lightAccentStrongColor || branding.accentColor,
    accentText: branding.lightAccentTextColor || "#193926",
    background: branding.lightBackgroundColor || branding.backgroundColor,
    border: branding.lightBorderColor || "#deded2",
    borderAccent: branding.lightBorderAccentColor || "#c7dde0",
    borderDanger: branding.lightBorderDangerColor || "#f1c5c5",
    borderStrong: branding.lightBorderStrongColor || "#c9c9bd",
    buttonPrimary: branding.lightButtonPrimaryColor || branding.lightAccentColor || branding.accentColor,
    buttonPrimaryText: branding.lightButtonPrimaryTextColor || "#ffffff",
    buttonSecondary: branding.lightButtonSecondaryColor || branding.lightSurfaceAccentColor || branding.surfaceColor,
    buttonSecondaryBorder: branding.lightButtonSecondaryBorderColor || branding.lightBorderAccentColor || "#c7dde0",
    buttonSecondaryText: branding.lightButtonSecondaryTextColor || branding.lightAccentStrongColor || branding.accentColor,
    danger: branding.lightDangerColor || "#b42318",
    heading: branding.lightHeadingColor || branding.headingColor,
    muted: branding.lightMutedColor || branding.textColor,
    nav: branding.lightNavColor || branding.textColor,
    navActive: branding.lightNavActiveColor || branding.surfaceColor,
    surface: branding.lightSurfaceColor || branding.surfaceColor,
    surfaceAccent: branding.lightSurfaceAccentColor || branding.surfaceColor,
    surfaceDanger: branding.lightSurfaceDangerColor || "#fff1f1",
    surfaceMuted: branding.lightSurfaceMutedColor || branding.surfaceColor,
    text: branding.lightTextColor || branding.textColor,
    topbar: branding.lightTopbarColor || branding.lightBackgroundColor || branding.backgroundColor
  };
}

function getPublicBrandingStyle(site: Site, resolvedTheme: "light" | "dark"): CSSProperties {
  const colors = getThemeColors(site.branding, resolvedTheme);

  return {
    "--app-accent": colors.accent,
    "--app-accent-strong": colors.accentStrong,
    "--app-accent-text": colors.accentText,
    "--app-bg": colors.background,
    "--app-border": colors.border,
    "--app-border-accent": colors.borderAccent,
    "--app-border-danger": colors.borderDanger,
    "--app-border-strong": colors.borderStrong,
    "--app-button-primary": colors.buttonPrimary,
    "--app-button-primary-text": colors.buttonPrimaryText,
    "--app-button-secondary": colors.buttonSecondary,
    "--app-button-secondary-border": colors.buttonSecondaryBorder,
    "--app-button-secondary-text": colors.buttonSecondaryText,
    "--app-danger": colors.danger,
    "--app-heading": colors.heading,
    "--app-muted": colors.muted,
    "--app-nav": colors.nav,
    "--app-nav-active": colors.navActive,
    "--app-surface": colors.surface,
    "--app-surface-accent": colors.surfaceAccent,
    "--app-surface-danger": colors.surfaceDanger,
    "--app-surface-muted": colors.surfaceMuted,
    "--app-text": colors.text,
    "--app-topbar": colors.topbar,
    background: colors.background,
    color: colors.text
  } as CSSProperties;
}

function setMetaTag(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.append(element);
  }
  element.content = content;
}

function setMetaProperty(property: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.append(element);
  }
  element.content = content;
}

const publicTemplateVariableNames = [
  "--app-accent",
  "--app-accent-strong",
  "--app-accent-text",
  "--app-bg",
  "--app-border",
  "--app-border-accent",
  "--app-border-danger",
  "--app-border-strong",
  "--app-button-primary",
  "--app-button-primary-text",
  "--app-button-secondary",
  "--app-button-secondary-border",
  "--app-button-secondary-text",
  "--app-danger",
  "--app-heading",
  "--app-muted",
  "--app-nav",
  "--app-nav-active",
  "--app-surface",
  "--app-surface-accent",
  "--app-surface-danger",
  "--app-surface-muted",
  "--app-text",
  "--app-topbar",
  "--public-template-bg"
] as const;

function setPublicTemplateColors(colors?: PublicThemeColors) {
  if (colors) {
    document.documentElement.style.setProperty("--app-accent", colors.accent);
    document.documentElement.style.setProperty("--app-accent-strong", colors.accentStrong);
    document.documentElement.style.setProperty("--app-accent-text", colors.accentText);
    document.documentElement.style.setProperty("--app-bg", colors.background);
    document.documentElement.style.setProperty("--app-border", colors.border);
    document.documentElement.style.setProperty("--app-border-accent", colors.borderAccent);
    document.documentElement.style.setProperty("--app-border-danger", colors.borderDanger);
    document.documentElement.style.setProperty("--app-border-strong", colors.borderStrong);
    document.documentElement.style.setProperty("--app-button-primary", colors.buttonPrimary);
    document.documentElement.style.setProperty("--app-button-primary-text", colors.buttonPrimaryText);
    document.documentElement.style.setProperty("--app-button-secondary", colors.buttonSecondary);
    document.documentElement.style.setProperty("--app-button-secondary-border", colors.buttonSecondaryBorder);
    document.documentElement.style.setProperty("--app-button-secondary-text", colors.buttonSecondaryText);
    document.documentElement.style.setProperty("--app-danger", colors.danger);
    document.documentElement.style.setProperty("--app-heading", colors.heading);
    document.documentElement.style.setProperty("--app-muted", colors.muted);
    document.documentElement.style.setProperty("--app-nav", colors.nav);
    document.documentElement.style.setProperty("--app-nav-active", colors.navActive);
    document.documentElement.style.setProperty("--app-surface", colors.surface);
    document.documentElement.style.setProperty("--app-surface-accent", colors.surfaceAccent);
    document.documentElement.style.setProperty("--app-surface-danger", colors.surfaceDanger);
    document.documentElement.style.setProperty("--app-surface-muted", colors.surfaceMuted);
    document.documentElement.style.setProperty("--app-text", colors.text);
    document.documentElement.style.setProperty("--app-topbar", colors.topbar);
    document.documentElement.style.setProperty("--public-template-bg", colors.background);
    return;
  }

  publicTemplateVariableNames.forEach((name) => document.documentElement.style.removeProperty(name));
}

function SiteCard({ site }: { site: Site }) {
  return (
    <motion.article className="site-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <p className="site-slug">/{site.slug}</p>
        <h2>{site.title}</h2>
        <p>{site.description}</p>
      </div>
      <div className="site-links">
        {site.links.map((link) => (
          <a key={`${site.id}-${link.href}`} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </motion.article>
  );
}

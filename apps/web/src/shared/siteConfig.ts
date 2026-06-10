export const siteConfig = {
  siteName: "Fullstack Template",
  defaultPageName: "Home",
  dashboardPageName: "Dashboard",
  faviconHref: "/favicon.svg",
  frontendAsideMode: "static" as "scroll" | "static"
};

export function formatPageTitle(pageName = siteConfig.defaultPageName) {
  return `${siteConfig.siteName} | ${pageName}`;
}

export function setDocumentTitle(pageName?: string) {
  document.title = formatPageTitle(pageName);
}

export function setSiteFavicon(href = siteConfig.faviconHref) {
  let element = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "icon";
    document.head.append(element);
  }
  element.href = href;
}

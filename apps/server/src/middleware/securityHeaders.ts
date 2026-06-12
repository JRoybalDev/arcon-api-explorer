import type { MiddlewareHandler } from "hono";
import { env } from "../env";

function originsFromEnv() {
  const origins: string[] = [];

  try {
    if (env.cdnBaseUrl) {
      const u = new URL(env.cdnBaseUrl);
      origins.push(u.origin);
    }
  } catch (e) {
    // ignore
  }

  try {
    if (env.publicApiUrl) {
      const u = new URL(env.publicApiUrl);
      origins.push(u.origin);
    }
  } catch (e) {
    // ignore
  }

  return Array.from(new Set(origins));
}

const extraOrigins = originsFromEnv();
const extraOriginsStr = extraOrigins.length > 0 ? ` ${extraOrigins.join(" ")}` : "";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `img-src 'self' data: blob: https:${extraOriginsStr}`,
  `media-src 'self' blob: https:${extraOriginsStr}`,
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "connect-src 'self' https:"
].join("; ");

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  if (!env.securityHeadersEnabled) {
    await next();
    return;
  }

  c.header("Content-Security-Policy", csp);
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  const path = c.req.path || "";
  const crossOriginPaths = ["/content/", "/content-thumbnails/", "/content-thumb/", "/uploads/"];
  const isCrossOriginResource = crossOriginPaths.some((p) => path.startsWith(p));
  c.header("Cross-Origin-Resource-Policy", isCrossOriginResource ? "cross-origin" : "same-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-Permitted-Cross-Domain-Policies", "none");

  if (env.securityHstsEnabled) {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  await next();
};

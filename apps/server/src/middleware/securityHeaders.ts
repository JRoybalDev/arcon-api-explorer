import type { MiddlewareHandler } from "hono";
import { env } from "../env";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
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
  c.header("Cross-Origin-Resource-Policy", c.req.path.startsWith("/content/") ? "cross-origin" : "same-origin");
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

import { loadRootEnv } from "./loadEnv";

loadRootEnv();

const splitList = (value: string | undefined, fallback: string[] = []) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? fallback;

const passwordResetEmailMode: "console" | "provider" = process.env.PASSWORD_RESET_EMAIL_MODE === "provider" ? "provider" : "console";
const storageDriver: "local" | "cloudinary" = process.env.STORAGE_DRIVER === "cloudinary" ? "cloudinary" : "local";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  authMode: process.env.AUTH_MODE === "better-auth" ? "better-auth" : "admin-key",
  betterAuthSignupMode: process.env.BETTER_AUTH_SIGNUP_MODE === "public" ? "public" : "private",
  adminRoles: splitList(process.env.BETTER_AUTH_ADMIN_ROLES, ["admin"]),
  adminKey: process.env.ADMIN_KEY,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  betterAuthTrustedOrigins: splitList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  betterAuthBootstrapAdminEmail: process.env.BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL,
  betterAuthBootstrapAdminPassword: process.env.BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD,
  betterAuthBootstrapAdminName: process.env.BETTER_AUTH_BOOTSTRAP_ADMIN_NAME ?? "ARCON Admin",
  passwordResetEmailMode,
  passwordResetFromEmail: process.env.PASSWORD_RESET_FROM_EMAIL ?? "noreply@example.com",
  resendApiKey: process.env.RESEND_API_KEY,
  resendAudienceOverride: process.env.RESEND_AUDIENCE_OVERRIDE,
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN,
  authCookieCrossSubdomain: process.env.AUTH_COOKIE_CROSS_SUBDOMAIN === "true",
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === "true",
  authRateLimitEnabled: process.env.AUTH_RATE_LIMIT_ENABLED !== "false",
  authRateLimitWindow: Number(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS ?? 60),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS ?? 20),
  adminRateLimitWindow: Number(process.env.ADMIN_RATE_LIMIT_WINDOW_SECONDS ?? 60),
  adminRateLimitMax: Number(process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS ?? 120),
  uploadRateLimitWindow: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS ?? 60),
  uploadRateLimitMax: Number(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS ?? 20),
  securityHeadersEnabled: process.env.SECURITY_HEADERS_ENABLED !== "false",
  securityHstsEnabled: process.env.SECURITY_HSTS_ENABLED === "true",
  storageDriver,
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  contentRoot: process.env.CONTENT_ROOT ?? "/AMP/bun-app-runner/app/media",
  cdnBaseUrl: (process.env.CDN_BASE_URL ?? process.env.PUBLIC_API_URL ?? "https://arcon-api.duckdns.org:7777").replace(/\/+$/, ""),
  autoPopulateExplorer: process.env.AUTO_POPULATE_EXPLORER !== "false",
  populateExplorerIntervalMs: Number(process.env.POPULATE_EXPLORER_INTERVAL_MS ?? 60 * 60 * 1000),
  populateExplorerOnStartup: process.env.POPULATE_EXPLORER_ON_STARTUP !== "false",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER ?? "arcon",
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://localhost:3001",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  corsOrigins: splitList(process.env.CORS_ORIGINS, [
    process.env.WEB_ORIGIN ?? "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.PUBLIC_API_URL ?? "https://arcon-api.duckdns.org:7777"
  ])
};

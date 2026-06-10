import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { Hono } from "hono";
import { auth } from "./auth";
import { seedBootstrapAdmin } from "./bootstrapAdmin";
import { env } from "./env";
import { fail, ok } from "./http/response";
import { logger } from "./logger";
import { requestContext } from "./middleware/requestContext";
import { securityHeaders } from "./middleware/securityHeaders";
import { openApiHtml, openApiSpec } from "./openapi";
import { adminRoute } from "./routes/admin";
import { sitesRoute } from "./routes/sites";
import { uploadsRoute } from "./routes/uploads";
import { createRateLimit } from "./middleware/rateLimit";
import type { AppVariables } from "./types";

const app = new Hono<{ Variables: AppVariables }>();
const adminRateLimit = createRateLimit({ name: "admin", windowSeconds: env.adminRateLimitWindow, max: env.adminRateLimitMax });
const uploadRateLimit = createRateLimit({ name: "uploads", windowSeconds: env.uploadRateLimitWindow, max: env.uploadRateLimitMax });

void seedBootstrapAdmin().catch((error) => {
  logger.error("bootstrap_admin.failed", {
    error
  });
});

app.use("*", requestContext);
app.use("*", securityHeaders);

app.use(
  "*",
  cors({
    origin: env.corsOrigins,
    allowHeaders: ["Content-Type", "X-Admin-Key"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true
  })
);

app.get("/health", (c) =>
  ok(c, {
    ok: true,
    service: "fullstack-template-api"
  })
);

app.get("/openapi.json", (c) => c.json(openApiSpec));

app.get("/docs", (c) => c.html(openApiHtml()));

app.get("/", (c) =>
  ok(c, {
    ok: true,
    service: "fullstack-template-api",
    routes: {
      health: "/health",
      publicSites: "/api/sites",
      adminSession: "/api/admin/session",
      adminSites: "/api/admin/sites",
      uploads: "/api/uploads",
      openapi: "/openapi.json",
      docs: "/docs"
    }
  })
);

app.get("/api/auth/config", (c) =>
  ok(c, {
    authMode: env.authMode,
    signupMode: env.betterAuthSignupMode
  })
);

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api/sites", sitesRoute);
app.use("/api/admin/*", adminRateLimit);
app.route("/api/admin", adminRoute);
app.use("/api/uploads/*", uploadRateLimit);
app.route("/api/uploads", uploadsRoute);
app.use("/uploads/*", serveStatic({ root: "./" }));

app.notFound((c) => fail(c, "Route not found", 404, { code: "ROUTE_NOT_FOUND" }));

app.onError((error, c) => {
  logger.error("http.unhandled_error", {
    requestId: c.get("requestId"),
    error
  });

  return fail(c, "Internal server error", 500, { code: "INTERNAL_SERVER_ERROR" });
});

export default {
  port: env.port,
  fetch: app.fetch
};

logger.info("api.started", {
  url: `http://localhost:${env.port}`
});

import type { MiddlewareHandler } from "hono";
import { auth } from "../auth";
import { env } from "../env";
import { fail } from "../http/response";
import type { AppVariables } from "../types";

export const requireAdminAccess: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  if (env.authMode === "better-auth") {
    if (!env.betterAuthSecret) {
      return fail(c, "BETTER_AUTH_SECRET is not configured on the server", 503, { code: "BETTER_AUTH_SECRET_MISSING" });
    }

    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!session) {
      return fail(c, "Authentication required", 401, { code: "AUTH_REQUIRED" });
    }

    const role = session.user.role;
    const roles = Array.isArray(role) ? role : String(role ?? "").split(",");
    const isAdmin = roles.map((item) => item.trim()).some((item) => env.adminRoles.includes(item));

    if (!isAdmin) {
      return fail(c, "Admin role required", 403, { code: "ADMIN_ROLE_REQUIRED" });
    }

    await next();
    return;
  }

  if (!env.adminKey) {
    return fail(c, "ADMIN_KEY is not configured on the server", 503, { code: "ADMIN_KEY_MISSING" });
  }

  const provided = c.req.header("X-Admin-Key");

  if (!provided || provided !== env.adminKey) {
    return fail(c, "Missing or invalid admin key", 401, { code: "ADMIN_KEY_INVALID" });
  }

  await next();
};

export const requireAdminKey = requireAdminAccess;

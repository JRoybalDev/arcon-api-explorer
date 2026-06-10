import { desc } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { sites, user } from "../../db/schema";
import { auth } from "../auth";
import { db } from "../db";
import { env } from "../env";
import { fail, ok } from "../http/response";
import { toSite } from "../mappers";
import { requireAdminKey } from "../middleware/admin";
import type { AppVariables } from "../types";

export const adminRoute = new Hono<{ Variables: AppVariables }>();

const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["admin", "user"]).default("user")
});

const UserIdSchema = z.object({
  userId: z.string().min(1)
});

const SetRoleSchema = UserIdSchema.extend({
  role: z.enum(["admin", "user"])
});

const BanUserSchema = UserIdSchema.extend({
  banReason: z.string().optional(),
  banExpiresIn: z.number().int().positive().optional()
});

const SetPasswordSchema = UserIdSchema.extend({
  newPassword: z.string().min(8)
});

function betterAuthRequired(c: Parameters<typeof fail>[0]) {
  return fail(c, "Better Auth user management requires AUTH_MODE=better-auth.", 400, { code: "BETTER_AUTH_REQUIRED" });
}

adminRoute.use("*", requireAdminKey);

adminRoute.get("/session", (c) =>
  ok(c, {
    ok: true,
    authMode: env.authMode
  })
);

adminRoute.get("/sites", async (c) => {
  const rows = await db.select().from(sites).orderBy(desc(sites.updatedAt));
  return ok(c, rows.map(toSite));
});

adminRoute.get("/users", async (c) => {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return ok(c, rows);
});

adminRoute.post("/users", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const body = await c.req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return fail(c, "Invalid user payload", 400, { code: "USER_INVALID", details: parsed.error.flatten() });
  }

  const created = await auth.api.createUser({
    body: parsed.data
  });

  return ok(c, created, 201);
});

adminRoute.post("/users/:userId/role", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const body = await c.req.json();
  const parsed = SetRoleSchema.safeParse({ ...body, userId: c.req.param("userId") });

  if (!parsed.success) {
    return fail(c, "Invalid role payload", 400, { code: "USER_ROLE_INVALID", details: parsed.error.flatten() });
  }

  const updated = await auth.api.setRole({
    headers: c.req.raw.headers,
    body: parsed.data
  });

  return ok(c, updated);
});

adminRoute.post("/users/:userId/ban", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = BanUserSchema.safeParse({ ...body, userId: c.req.param("userId") });

  if (!parsed.success) {
    return fail(c, "Invalid ban payload", 400, { code: "USER_BAN_INVALID", details: parsed.error.flatten() });
  }

  const updated = await auth.api.banUser({
    headers: c.req.raw.headers,
    body: parsed.data
  });

  return ok(c, updated);
});

adminRoute.post("/users/:userId/unban", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const parsed = UserIdSchema.safeParse({ userId: c.req.param("userId") });

  if (!parsed.success) {
    return fail(c, "Invalid user id", 400, { code: "USER_ID_INVALID", details: parsed.error.flatten() });
  }

  const updated = await auth.api.unbanUser({
    headers: c.req.raw.headers,
    body: parsed.data
  });

  return ok(c, updated);
});

adminRoute.post("/users/:userId/password", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const body = await c.req.json();
  const parsed = SetPasswordSchema.safeParse({ ...body, userId: c.req.param("userId") });

  if (!parsed.success) {
    return fail(c, "Invalid password payload", 400, { code: "USER_PASSWORD_INVALID", details: parsed.error.flatten() });
  }

  const updated = await auth.api.setUserPassword({
    headers: c.req.raw.headers,
    body: parsed.data
  });

  return ok(c, updated);
});

adminRoute.post("/users/:userId/revoke-sessions", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const parsed = UserIdSchema.safeParse({ userId: c.req.param("userId") });

  if (!parsed.success) {
    return fail(c, "Invalid user id", 400, { code: "USER_ID_INVALID", details: parsed.error.flatten() });
  }

  const updated = await auth.api.revokeUserSessions({
    headers: c.req.raw.headers,
    body: parsed.data
  });

  return ok(c, updated);
});

adminRoute.delete("/users/:userId", async (c) => {
  if (env.authMode !== "better-auth") {
    return betterAuthRequired(c);
  }

  const parsed = UserIdSchema.safeParse({ userId: c.req.param("userId") });

  if (!parsed.success) {
    return fail(c, "Invalid user id", 400, { code: "USER_ID_INVALID", details: parsed.error.flatten() });
  }

  const removed = await auth.api.removeUser({
    headers: c.req.raw.headers,
    body: parsed.data
  });

  return ok(c, removed);
});

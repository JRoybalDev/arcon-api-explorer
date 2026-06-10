import type { MiddlewareHandler } from "hono";
import { fail } from "../http/response";
import type { AppVariables } from "../types";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function createRateLimit({ max, name, windowSeconds }: { max: number; name: string; windowSeconds: number }): MiddlewareHandler<{ Variables: AppVariables }> {
  return async (c, next) => {
    const now = Date.now();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    const key = `${name}:${ip}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000
      });
      await next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfter));
      return fail(c, "Too many requests", 429, { code: "RATE_LIMITED", details: { retryAfter } });
    }

    await next();
  };
}

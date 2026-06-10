import type { MiddlewareHandler } from "hono";
import { logger } from "../logger";
import type { AppVariables } from "../types";

export const requestContext: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const requestId = c.req.header("X-Request-Id") ?? crypto.randomUUID();
  const startedAt = Date.now();

  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);

  await next();

  logger.info("http.request", {
    requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs: Date.now() - startedAt
  });
};

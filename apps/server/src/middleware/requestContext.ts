import type { MiddlewareHandler } from "hono";
import { logger } from "../logger";
import type { AppVariables } from "../types";

export const requestContext: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  const requestId = c.req.header("X-Request-Id") ?? crypto.randomUUID();
  const startedAt = Date.now();

  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);

  await next();

  const status = c.res.status;
  const log = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;

  log("http.request", {
    requestId,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status,
    durationMs: Date.now() - startedAt
  });
};

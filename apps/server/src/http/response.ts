import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppVariables } from "../types";

type ApiMeta = {
  requestId?: string;
};

type ErrorOptions = {
  code?: string;
  details?: unknown;
};

function meta(c: Context<{ Variables: AppVariables }>): ApiMeta {
  const requestId = c.get("requestId");
  return requestId ? { requestId } : {};
}

export function ok<T>(c: Context<{ Variables: AppVariables }>, data: T, status: ContentfulStatusCode = 200) {
  return c.json(
    {
      success: true,
      data,
      meta: meta(c)
    },
    status
  );
}

export function fail(c: Context<{ Variables: AppVariables }>, error: string, status: ContentfulStatusCode = 400, options: ErrorOptions = {}) {
  return c.json(
    {
      success: false,
      error,
      code: options.code,
      details: options.details,
      meta: meta(c)
    },
    status
  );
}

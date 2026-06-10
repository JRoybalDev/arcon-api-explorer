# Integrations And API Standards

This guide covers the optional production presets included with the template: Resend email, Cloudinary uploads, API response envelopes, OpenAPI docs, request IDs, structured logging, security headers, and seed commands.

## Resend Email

Password reset emails use console logging by default:

```txt
PASSWORD_RESET_EMAIL_MODE=console
PASSWORD_RESET_FROM_EMAIL=Fullstack Template <noreply@example.com>
```

Switch to Resend provider mode for real email delivery:

```txt
PASSWORD_RESET_EMAIL_MODE=provider
PASSWORD_RESET_FROM_EMAIL=Support <support@example.com>
RESEND_API_KEY=re_...
```

Before production:

- Verify your sending domain in Resend.
- Use a from address on that verified domain.
- Keep `RESEND_API_KEY` server-only.
- Restart the API after env changes.

For early testing before domain verification, use:

```txt
RESEND_AUDIENCE_OVERRIDE=your-verified-resend-account@example.com
```

When set, password reset emails are sent to the override address instead of the requested user's email. Remove this before production.

## Cloudinary Uploads

Local uploads are the default:

```txt
STORAGE_DRIVER=local
UPLOAD_DIR=uploads
```

Cloudinary is the object-storage preset:

```txt
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=fullstack-template
```

When Cloudinary is enabled:

- The original upload is stored in Cloudinary.
- The database stores the Cloudinary secure URL.
- Image uploads receive an optimized Cloudinary thumbnail URL.
- Replacing or deleting uploads removes the old Cloudinary asset by `public_id`.
- The frontend continues using `url` and `thumbnailUrl`; it does not need to know which storage driver is active.

Keep `CLOUDINARY_API_SECRET` server-only.

Run migrations after enabling the media manager fields:

```bash
cd apps/server
bunx drizzle-kit migrate
```

## API Response Standard

Template API routes return a consistent envelope.

Successful responses:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {},
  "meta": {
    "requestId": "..."
  }
}
```

The web app's `apiJson` helper unwraps successful `data` automatically. New frontend API helpers should call `apiJson` instead of raw `fetch` unless there is a specific reason not to.

Better Auth's built-in `/api/auth/*` responses are controlled by Better Auth and may not use this envelope.

## OpenAPI Docs

The API exposes OpenAPI docs without an extra server dependency:

```txt
GET /openapi.json
GET /docs
```

`/openapi.json` returns the OpenAPI 3.1 document. `/docs` serves a small Swagger UI page that reads from `/openapi.json`.

When adding new template routes, update `apps/server/src/openapi.ts` in the same change so the docs stay useful.

## Request IDs

Every API response includes:

```txt
X-Request-Id: ...
```

If a client sends `X-Request-Id`, the server reuses it. Otherwise, the API creates a UUID. Include this ID when debugging client reports or matching frontend errors to server logs.

## Structured Logs

Server logs are JSON lines:

```json
{
  "level": "info",
  "message": "http.request",
  "time": "2026-06-08T18:58:46.139Z",
  "requestId": "...",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "durationMs": 1
}
```

These logs are friendly to hosted log drains, Docker logs, and plain terminal output.

## Security Headers

The API sets secure headers by default:

```txt
SECURITY_HEADERS_ENABLED=true
SECURITY_HSTS_ENABLED=false
```

Included headers:

- `Content-Security-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Permissions-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-Permitted-Cross-Domain-Policies`

The default CSP allows the bundled Swagger UI docs from `https://unpkg.com`, local/API assets, and HTTPS image/media sources. If a project adds third-party scripts, frames, analytics, or media providers, update `apps/server/src/middleware/securityHeaders.ts`.

Enable HSTS only after the deployed domain is available over HTTPS:

```txt
SECURITY_HSTS_ENABLED=true
```

## Seed Commands

Seed the first Better Auth admin:

```bash
bun run db:seed
```

Required env:

```txt
AUTH_MODE=better-auth
BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-long-random-password
BETTER_AUTH_BOOTSTRAP_ADMIN_NAME=Template Admin
```

After the admin exists, remove `BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL` and `BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD` from production env.

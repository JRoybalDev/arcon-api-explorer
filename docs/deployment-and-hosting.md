# Deployment And Hosting

This template can be deployed in a few different ways. The important requirement is that the web app can reach the API server, and the API server can reach Postgres.

## Environment Variables

The project uses one root `.env` file. Server and web settings live together:

```txt
DATABASE_URL=postgres://user:password@host:5432/database
PORT=3001
UPLOAD_DIR=uploads
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
WEB_ORIGIN=https://www.example.com
PUBLIC_API_URL=https://api.example.com
VITE_API_PROXY_TARGET=https://api.example.com
CORS_ORIGINS=https://www.example.com

AUTH_MODE=better-auth
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=https://www.example.com
BETTER_AUTH_TRUSTED_ORIGINS=https://www.example.com
BETTER_AUTH_SIGNUP_MODE=private
BETTER_AUTH_ADMIN_ROLES=admin
PASSWORD_RESET_EMAIL_MODE=provider
PASSWORD_RESET_FROM_EMAIL=Support <support@example.com>
RESEND_API_KEY=re_...
AUTH_COOKIE_SECURE=true
AUTH_RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true
SECURITY_HSTS_ENABLED=true
```

For production builds, prefer configuring the frontend with a stable public API base URL if the API is not served from the same origin.

## Vercel

The Vite web app can be hosted on Vercel as a static frontend.

Recommended shape:

- Deploy `apps/web` to Vercel.
- Deploy `apps/server` separately to a Bun-compatible host.
- Use a hosted Postgres provider.
- Configure the web app to point to the deployed API URL.

Vercel project settings:

- Root directory: `apps/web`
- Install command: `bun install`
- Build command: `bun run build`
- Output directory: `dist`

Add the web env variable:

```txt
VITE_API_PROXY_TARGET=https://api.example.com
VITE_AUTH_BASE_URL=https://www.example.com
```

## Cookie Presets

Same-origin web and API:

```txt
WEB_ORIGIN=https://www.example.com
PUBLIC_API_URL=https://www.example.com
BETTER_AUTH_URL=https://www.example.com
BETTER_AUTH_TRUSTED_ORIGINS=https://www.example.com
CORS_ORIGINS=https://www.example.com
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_CROSS_SUBDOMAIN=false
AUTH_COOKIE_DOMAIN=
```

Separate web and API origins:

```txt
WEB_ORIGIN=https://www.example.com
PUBLIC_API_URL=https://api.example.com
VITE_API_PROXY_TARGET=https://api.example.com
VITE_AUTH_BASE_URL=https://www.example.com
BETTER_AUTH_URL=https://www.example.com
BETTER_AUTH_TRUSTED_ORIGINS=https://www.example.com,https://api.example.com
CORS_ORIGINS=https://www.example.com
AUTH_COOKIE_SECURE=true
```

Shared cookies across trusted subdomains:

```txt
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_CROSS_SUBDOMAIN=true
AUTH_COOKIE_DOMAIN=example.com
```

Only enable cross-subdomain cookies when every subdomain in scope is trusted.

## Self-Hosting

For a single VPS or server:

1. Install Bun, Docker, and Docker Compose.
2. Copy the project to the server.
3. Configure production `.env` files.
4. Run migrations against the production database.
5. Build the web app.
6. Run the API server with a process manager.
7. Serve the web `dist` directory and proxy API traffic through Nginx, Caddy, or another reverse proxy.

Example production commands:

```bash
bun install
cd packages/schema && bun install
cd ../../apps/server && bun install
cd ../web && bun install
cd ../..

cd apps/server && bunx drizzle-kit migrate && cd ../..
cd apps/web && bun run build && cd ../..
```

## Other Hosts

Use this checklist for Render, Railway, Fly.io, DigitalOcean, or similar platforms:

- Confirm Bun is supported or use a container image that includes Bun.
- Set `DATABASE_URL`.
- Choose an auth preset. Use a strong `ADMIN_KEY` for `AUTH_MODE=admin-key`, or set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`, and cookie settings for `AUTH_MODE=better-auth`.
- Set `RESEND_API_KEY` and a verified `PASSWORD_RESET_FROM_EMAIL` before using `PASSWORD_RESET_EMAIL_MODE=provider`.
- Keep `SECURITY_HEADERS_ENABLED=true`; enable `SECURITY_HSTS_ENABLED=true` only after HTTPS is confirmed.
- Use `STORAGE_DRIVER=cloudinary` or ensure local uploads are written to persistent storage, object storage, or a mounted volume.
- Run Drizzle migrations before or during release.
- Point the web app at the deployed API URL.

## Upload Storage Note

Local uploads are filesystem-based. On platforms with ephemeral filesystems, move uploads to persistent disk or object storage before production use.

Cloudinary is the default object-storage preset:

```txt
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=fullstack-template
```

The API stores Cloudinary's public URL in Postgres and returns a transformed thumbnail URL for image uploads.

The media manager stores Cloudinary `public_id` metadata. Replacing or deleting an upload removes the old Cloudinary asset, which prevents edited images and videos from piling up in your Cloudinary account.

## API Docs

The server exposes:

```txt
GET /openapi.json
GET /docs
```

Keep `/docs` protected at the reverse proxy level if the route list should not be public for a deployed client project.

## Security Headers

The API sets security headers by default. For HTTPS production, use:

```txt
SECURITY_HEADERS_ENABLED=true
SECURITY_HSTS_ENABLED=true
```

If you embed the app in another site, load assets from additional third-party providers, or add analytics scripts, review `apps/server/src/middleware/securityHeaders.ts` and adjust the CSP intentionally.

## Observability

Every API response includes an `X-Request-Id` header. If the client sends `X-Request-Id`, the server reuses it; otherwise it creates one.

Server logs are structured JSON with fields like:

```json
{
  "level": "info",
  "message": "http.request",
  "requestId": "...",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "durationMs": 4
}
```

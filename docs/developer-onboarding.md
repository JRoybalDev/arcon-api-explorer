# Developer Onboarding

This project is a Bun-first TypeScript app split into three main parts:

- `apps/web`: React 19 + Vite public site and admin dashboard.
- `apps/server`: Bun + Hono API with Postgres, Drizzle ORM, uploads, and protected admin writes.
- `packages/schema`: shared Zod schemas and inferred TypeScript types used by the API and frontend.

## Local Setup

Install dependencies in each Bun context:

```bash
bun install
cd packages/schema && bun install
cd ../../apps/server && bun install
cd ../web && bun install
cd ../..
```

Create the single project env file:

```bash
cp .env.example .env
```

Start Postgres:

```bash
bun run db:up
```

Run migrations:

```bash
cd apps/server
bunx drizzle-kit migrate
cd ../..
```

Start the stack:

```bash
bun run dev
```

## Local URLs

- Public site: `http://localhost:5173`
- Dashboard: `http://localhost:5173/dashboard`
- API health: `http://localhost:3001/health`
- API docs: `http://localhost:3001/docs`
- OpenAPI JSON: `http://localhost:3001/openapi.json`

## Common Workflows

Run typechecks:

```bash
bun run typecheck
```

Run builds:

```bash
bun run build
```

Generate a Drizzle migration after changing `apps/server/db/schema.ts`:

```bash
cd apps/server
bun run db:generate
```

Apply migrations:

```bash
cd apps/server
bun run db:migrate
```

Seed the first Better Auth admin:

```bash
bun run db:seed
```

This requires `AUTH_MODE=better-auth`, `BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL`, and `BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD`.

## Important Concepts

The shared schema package is the contract between the web app and server. Add or change validation in `packages/schema/src/index.ts` first, then update server routes and frontend forms to match.

Public page content is static by default and should be edited in React routes/components. The dashboard intentionally does not include a Content tab; it focuses on setup, metadata, branding colors, links, users, records, and upload management.

Non-dashboard routes are wrapped by `apps/web/src/routes/App.tsx` with the shared public header/navbar, route transition animation, and `site-template-shell` grid. New public pages should use the `frontend-template-grid` body layout:

```txt
header header header
aside  main   aside
footer footer footer
```

The header is supplied by the app shell. Route components should render the left aside, main section, right aside, and footer using `template-section`, `template-aside`, `grid-area-aside-left`, `grid-area-main`, `grid-area-aside-right`, and `public-layout-footer`. See [Page Setup With The Grid Layout](./page-setup-grid-layout.md) for the copyable route template.

Aside behavior is configured in `apps/web/src/shared/siteConfig.ts` with `frontendAsideMode`. Use `"static"` for sticky viewport-height asides that release before the footer, or `"scroll"` for asides that stretch and scroll with the page.

Site identity is code-configured in `apps/web/src/shared/siteConfig.ts`. Change the site name, default page name, dashboard page name, page-title format, and favicon path there. The default convention is `Site Name | Page Name`, with the dashboard using `Site Name | Dashboard`.

The app includes a shared loading component in `apps/web/src/shared/Loading.tsx` and a catch-all not found page in `apps/web/src/routes/NotFound.tsx`. Use `LoadingScreen` for public or dashboard states that are waiting on async data.

Protected dashboard and write requests use the auth preset configured by `AUTH_MODE`. Keep `AUTH_MODE=admin-key` for simple projects that only need an access code, or switch to `AUTH_MODE=better-auth` for email/password accounts backed by Better Auth sessions and admin roles. The template default keeps Better Auth signup private; admins create users from the dashboard Users tab. See [Auth Presets](./auth-presets.md).

Uploads store the original file and generate optimized WebP thumbnails for supported image files. Use `thumbnailUrl` for thumbnail displays instead of the original `url`.

For production uploads, switch `STORAGE_DRIVER=cloudinary` and set the Cloudinary credentials in `.env`. The database keeps the returned public URL, so the frontend does not need to know which storage driver is active.

The dashboard Uploads tab can list, replace, and delete media. Replacing or deleting an upload removes the old local or Cloudinary asset when storage metadata is available.

API routes return a standard envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Errors use the same shape with `success: false`, `error`, optional `code`, optional `details`, and the same request metadata. The web `apiJson` helper unwraps successful `data` automatically.

Every request receives an `X-Request-Id` response header and a structured JSON log line with method, path, status, and duration.

OpenAPI docs are served from `/docs`, and the source spec lives in `apps/server/src/openapi.ts`. Update that file whenever you add or rename API routes.

Security headers are applied in `apps/server/src/middleware/securityHeaders.ts`. If you add analytics, embedded frames, or third-party asset hosts, update the CSP there and keep the change deliberate.

Public page theme colors are stored with the site record through `SiteBrandingSchema`. The dashboard Branding tab exposes light and dark values for the semantic `--app-*` variables used by public pages and the shared header. When adding CSS, prefer variables such as `--app-bg`, `--app-surface`, `--app-text`, `--app-heading`, `--app-border`, `--app-accent`, and `--app-topbar` so the page remains editable from the dashboard.

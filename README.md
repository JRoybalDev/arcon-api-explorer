# Fullstack Template V1

Bun-first TypeScript template with a React 19 + Vite frontend, Bun + Hono API, Postgres 16 persistence through Drizzle ORM, protected admin writes, local or Cloudinary uploads, Resend-ready auth emails, structured API responses, request IDs, a shared Zod schema package, and a responsive public page grid with client-editable light/dark branding colors.

## Start A New Project

Use this section when creating a fresh app from the template.

### 1. Copy The Template

From the directory where you keep projects:

```bash
cp -R /path/to/fullstack-template-v1 my-new-project
cd my-new-project
```

If the copied template includes installed dependencies or local env files, remove them before installing fresh:

```bash
rm -rf node_modules apps/web/node_modules apps/server/node_modules packages/schema/node_modules
rm -f .env apps/web/.env apps/server/.env
```

### 2. Rename The Project

Update package names to match the new project:

- Root `package.json`: change `"name"`
- `apps/web/package.json`: change `"name"`
- `apps/server/package.json`: change `"name"`
- `packages/schema/package.json`: change `"name"` if you want a project-specific package scope

If you rename `@fullstack-template/schema`, also update imports and package dependencies that reference it:

```bash
rg "@fullstack-template/schema"
```

### 3. Initialize Git

If you copied this template outside an existing repository, create a fresh repo:

```bash
rm -rf .git
git init
git add .
git commit -m "Initial project from fullstack template"
```

Keep `.env` files out of source control. They are ignored by default.

### 4. Configure Env Files

Create the single project env file from the example:

```bash
cp .env.example .env
```

Choose an auth preset in `.env`.

For small projects, keep the default admin-key preset:

```txt
AUTH_MODE=admin-key
ADMIN_KEY=replace-with-a-long-random-secret
```

The dashboard at `/dashboard` uses this value as its access code. Protected API requests use the same value in the `X-Admin-Key` header.

For larger projects, use Better Auth instead:

```txt
AUTH_MODE=better-auth
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SIGNUP_MODE=private
BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-long-random-password
```

When `AUTH_MODE=better-auth`, the dashboard and private API writes use Better Auth session cookies and do not require `ADMIN_KEY`. The default signup mode is private, so seed the first admin from env and create later users from the dashboard Users tab.

Seed the first Better Auth admin explicitly:

```bash
bun run db:seed
```

The local database defaults to host port `5433` to avoid conflicts with an existing Postgres on `5432`:

```txt
POSTGRES_HOST_PORT=5433
DATABASE_URL=postgres://postgres:postgres@localhost:5433/fullstack_template
```

For a new project, rename the database in `DATABASE_URL` and `docker-compose.yml` if you do not want to use `fullstack_template`.

### 5. Install Dependencies

This template intentionally uses separate Bun install contexts at the root, `apps/web`, `apps/server`, and `packages/schema`.

```bash
bun install
cd packages/schema && bun install
cd ../../apps/server && bun install
cd ../web && bun install
cd ../..
```

### 6. Start Postgres

```bash
bun run db:up
```

The DB helper supports both Docker Compose v2 (`docker compose`) and legacy Compose v1 (`docker-compose`).

### 7. Run Migrations

```bash
cd apps/server
bunx drizzle-kit migrate
cd ../..
```

### 8. Start Development

```bash
bun run dev
```

Open:

- Public site: `http://localhost:5173`
- Dashboard: `http://localhost:5173/dashboard`
- API health: `http://localhost:3001/health`
- API docs: `http://localhost:3001/docs`

If the API is already running when you change `.env` files, stop and restart it so Bun reloads the environment.

### 9. Smoke Check

Before building on the template, run:

```bash
bun run typecheck
bun run build
```

## Project Shape

```txt
apps/
  web/       React 19, Vite 8, React Router, React Query, Zustand, Tailwind 4, DaisyUI
  server/    Bun, Hono, Drizzle ORM, Postgres, uploads, auth-protected writes
packages/
  schema/    Shared Zod schemas and inferred TypeScript types
scripts/
  dev.ts     Bun full stack dev runner
docs/        Project documentation for developers, deployment, database setup, and branding
```

This template intentionally uses separate Bun install contexts at the root, `apps/web`, `apps/server`, and `packages/schema`.

Public page content is intentionally added statically in React routes/components. Use the dashboard for project setup, metadata, branding colors, links, users, records, and upload management.

The public site uses a shared responsive grid template for new frontend pages:

```txt
header header header
aside  main   aside
footer footer footer
```

The shared header/navbar is rendered by `apps/web/src/routes/App.tsx`. Page routes render the left aside, main section, right aside, and footer with the `frontend-template-grid` and `template-section` classes. See [Page Setup With The Grid Layout](./docs/page-setup-grid-layout.md) for the copyable page recipe.

## Stack

- Runtime: Bun
- Language: TypeScript
- Database: Postgres 16, exposed locally on host port `5433` by default
- ORM and migrations: Drizzle ORM + Drizzle Kit
- Frontend: React 19, Vite 8, React Router 7, TanStack Query 5, Zustand 5
- Styling: Tailwind CSS 4, DaisyUI 5, regular CSS files, responsive grid-template layout primitives
- API: Hono on port `3001`
- Web: Vite on port `5173`
- Dashboard: `http://localhost:5173/dashboard`
- OpenAPI docs: `http://localhost:3001/docs`
- Email: Resend provider preset for password reset
- Upload storage: local filesystem by default, Cloudinary preset for production/object storage
- Observability: structured JSON logs and `X-Request-Id` headers
- Security: default API security headers with optional HTTPS HSTS

Site identity is configured in code:

```txt
apps/web/src/shared/siteConfig.ts
apps/web/public/favicon.svg
```

Page titles use `Site Name | Page Name`; the dashboard uses `Site Name | Dashboard`.

Public page records can override the semantic app color variables from the dashboard Branding tab. The tab has separate light and dark sections for the shared variables used by the public page and header, including background, surfaces, borders, text, navigation, accent, danger, and topbar colors.

## First Run In This Template

If you are working directly inside this template checkout rather than copying it into a new project, run:

```bash
bun install
cd packages/schema && bun install
cd ../../apps/server && bun install
cd ../web && bun install
cd ../..
```

Create the env file:

```bash
cp .env.example .env
```

The Docker database maps container port `5432` to host port `5433` by default. Change `POSTGRES_HOST_PORT` and `DATABASE_URL` if you prefer another host port.

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

If the API is already running when you change `.env` files, stop and restart it so Bun reloads the environment.

Open:

- Web: `http://localhost:5173`
- Dashboard: `http://localhost:5173/dashboard`
- API health: `http://localhost:3001/health`
- API docs: `http://localhost:3001/docs`

## Dashboard Access And Admin Writes

The dashboard and private API routes use the auth preset configured by `AUTH_MODE`.

Simple projects can use:

Open `http://localhost:5173/dashboard` and enter the same value configured in `.env`:

```txt
AUTH_MODE=admin-key
ADMIN_KEY=replace-with-a-long-random-secret
```

Protected API requests send that value through:

```txt
X-Admin-Key: replace-with-a-long-random-secret
```

Set `ADMIN_KEY` before using the dashboard or protected API routes. The server returns a configuration error for protected requests when it is missing.

Larger projects can use Better Auth:

```txt
AUTH_MODE=better-auth
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SIGNUP_MODE=private
BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-long-random-password
```

With this preset, run migrations and restart the API. The server creates the bootstrap admin if the bootstrap env values are set. Then open `/dashboard`, choose Better Auth, and sign in. Protected API requests require an admin role, so `ADMIN_KEY` can be removed from the project environment.

## Email, Storage, And API Responses

Password reset uses console logging locally:

```txt
PASSWORD_RESET_EMAIL_MODE=console
```

For production, switch to the Resend provider preset:

```txt
PASSWORD_RESET_EMAIL_MODE=provider
RESEND_API_KEY=re_...
PASSWORD_RESET_FROM_EMAIL=Support <support@example.com>
```

Use `RESEND_AUDIENCE_OVERRIDE` for early testing before your Resend sending domain is verified.

Uploads use local disk by default. To use Cloudinary:

```txt
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=fullstack-template
```

The dashboard Uploads tab can list, copy, replace, and delete media. Replacing or deleting a Cloudinary upload removes the old asset from Cloudinary using stored provider metadata.

Template API routes return `{ success, data, meta }` for successful responses and `{ success, error, code, details, meta }` for errors. The frontend `apiJson` helper unwraps successful `data` automatically.

See [Integrations And API Standards](./docs/integrations-and-api.md) for the full Resend, Cloudinary, API envelope, request ID, logging, and seed setup.

## Security Headers

The API enables common security headers by default:

```txt
SECURITY_HEADERS_ENABLED=true
SECURITY_HSTS_ENABLED=false
```

Enable `SECURITY_HSTS_ENABLED=true` only after the production domain is served over HTTPS.

## Useful Commands

```bash
bun run typecheck
bun run build
bun run db:seed
bun run db:logs
bun run db:down
```

Server-only:

```bash
cd apps/server
bun run db:generate
bun run db:migrate
bun run db:studio
```

## API Routes

- `GET /health`
- `GET /docs` Swagger UI for the OpenAPI spec
- `GET /openapi.json` OpenAPI 3.1 document
- `GET /api/sites` published public records only
- `GET /api/sites/:slug` published public records only
- `GET /api/auth/config` public auth preset metadata for the dashboard gate
- `GET /api/admin/session` protected by the configured auth preset
- `GET /api/admin/sites` protected by the configured auth preset
- `GET /api/admin/users` protected by the configured auth preset
- `POST /api/admin/users` protected by the configured auth preset
- `POST /api/admin/users/:userId/role` protected by the configured auth preset
- `POST /api/admin/users/:userId/ban` protected by the configured auth preset
- `POST /api/admin/users/:userId/unban` protected by the configured auth preset
- `POST /api/admin/users/:userId/password` protected by the configured auth preset
- `POST /api/admin/users/:userId/revoke-sessions` protected by the configured auth preset
- `DELETE /api/admin/users/:userId` protected by the configured auth preset
- `POST /api/sites` protected by the configured auth preset
- `DELETE /api/sites/:slug` protected by the configured auth preset
- `GET /api/uploads` protected media library list
- `POST /api/uploads` with multipart `file`, protected by the configured auth preset
- `POST /api/uploads/:id/replace` with multipart `file`, protected by the configured auth preset
- `DELETE /api/uploads/:id` protected upload deletion and storage cleanup
- `GET /api/auth/*` Better Auth routes
- `GET /uploads/*`

Image uploads also generate compressed WebP thumbnails. The upload response includes both:

- `url`: original uploaded asset
- `thumbnailUrl`: optimized 640px thumbnail for supported image files, or an empty string for non-image files

Cloudinary uploads store provider metadata in Postgres. Replacing or deleting an upload removes the old Cloudinary asset so edits do not overpopulate the media library.

## Shared Schema

`packages/schema` exports:

- `SiteSchema`
- `SiteDraftSchema`
- `SiteListSchema`
- `SiteMetadataSchema`
- `SiteBrandingSchema`
- `UploadSchema`
- `UploadListSchema`
- `ApiResponseSchema`
- `ApiSuccessSchema`
- `ApiErrorSchema`
- Inferred TypeScript types for the API, dashboard, and import or validation scripts

## More Documentation

See [docs/README.md](./docs/README.md) for:

- Developer onboarding
- Deployment and hosting
- External PostgreSQL setup
- Auth presets
- Branding and marketing guidance
- Page setup with the responsive grid layout

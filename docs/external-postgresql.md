# External PostgreSQL

Use this guide when connecting the API to a hosted or external Postgres database instead of the local Docker database.

## 1. Create The Database

Create a PostgreSQL 16 database with your provider. Common providers include Neon, Supabase, Railway, Render, Fly.io, DigitalOcean, and AWS RDS.

Collect the connection string:

```txt
postgres://user:password@host:5432/database
```

Some providers require SSL. If they provide a connection string with query parameters, keep them:

```txt
postgres://user:password@host:5432/database?sslmode=require
```

## 2. Update Root Env

This template uses one root `.env` file for Docker Compose, Drizzle, the Bun API, and Vite. In `.env`, set:

```txt
DATABASE_URL=postgres://user:password@host:5432/database?sslmode=require
AUTH_MODE=admin-key
ADMIN_KEY=replace-with-a-long-random-secret
PORT=3001
UPLOAD_DIR=uploads
PUBLIC_API_URL=http://localhost:3001
```

For Better Auth projects, also set the Better Auth fields from [Auth Presets](./auth-presets.md).

## 3. Run Migrations

Run migrations from the server app:

```bash
cd apps/server
bunx drizzle-kit migrate
```

Drizzle reads `DATABASE_URL` from the environment and applies migrations to that database.

Current migrations include Better Auth tables and upload storage metadata for media replacement cleanup.

## 4. Verify The API

Start the API:

```bash
cd apps/server
bun run dev
```

Open:

```txt
http://localhost:3001/health
http://localhost:3001/docs
```

Then verify a protected route with the same value as `ADMIN_KEY`:

```bash
curl -H "X-Admin-Key: replace-with-a-long-random-secret" http://localhost:3001/api/admin/session
```

## Local Docker vs External Database

Use local Docker Postgres for development when you want disposable local data.

Use external Postgres when you need shared development data, staging, production, backups, or provider-managed operations.

Do not point local experiments at production unless you intentionally want to modify production data.

# ARCON Production Deployment On Arch Linux + AMP

This guide deploys ARCON on an Arch Linux server using AMP (Application Management Panel by CubeCoders) for both the Bun API process and the PostgreSQL server.

Production assumptions:

- API/CDN domain: `https://arcon-api.duckdns.org:7777`
- API process: Bun running the Hono server in `apps/server`
- Database: PostgreSQL hosted by AMP
- Media library mount: `/mnt/ARCON-CLOUD`
- Auth mode: `admin-key`
- Explorer population: on startup and hourly

## 1. Server Prerequisites

Install the runtime tools on Arch:

```bash
sudo pacman -Syu
sudo pacman -S git unzip base-devel
curl -fsSL https://bun.sh/install | bash
```

Confirm Bun is available to the AMP service user. If AMP cannot find Bun, use the absolute path from:

```bash
which bun
```

Common paths are:

```text
/home/<user>/.bun/bin/bun
/usr/bin/bun
```

## 2. Mount The Media Drive

The API indexes and serves media from:

```text
/mnt/ARCON-CLOUD
```

Confirm the mount exists:

```bash
findmnt /mnt/ARCON-CLOUD
ls -la /mnt/ARCON-CLOUD
```

Make sure the AMP process user can read existing media and write new folders/uploads:

```bash
sudo chown -R <amp-user>:<amp-user> /mnt/ARCON-CLOUD
sudo chmod -R u+rwX,g+rwX /mnt/ARCON-CLOUD
```

If the drive is mounted with `/etc/fstab`, use stable UUID-based mounting so it survives reboot:

```bash
lsblk -f
sudo nano /etc/fstab
```

Example:

```text
UUID=<drive-uuid> /mnt/ARCON-CLOUD ext4 defaults,nofail 0 2
```

For NTFS/exFAT, use the matching filesystem type and explicit uid/gid for the AMP user.

## 3. Create The AMP PostgreSQL Server

In AMP:

1. Create a PostgreSQL instance.
2. Create a database for ARCON, for example:

```text
arcon_api_explorer
```

3. Create a dedicated database user.
4. Note the host, port, username, password, and database name.

The app expects a standard PostgreSQL connection string:

```text
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
```

If the PostgreSQL server is on the same machine, the host is often `127.0.0.1` and the port is the AMP PostgreSQL port.

## 4. Deploy The Repo

Clone or upload the project onto the server:

```bash
mkdir -p ~/apps
cd ~/apps
git clone <repo-url> arcon-api-explorer
cd arcon-api-explorer
bun install
```

Build/typecheck before production launch:

```bash
bun run typecheck:all
bun run build:all
```

## 5. Production Environment File

Create the root `.env` file:

```bash
cp .env.example .env
nano .env
```

Recommended production values:

```env
DATABASE_URL=postgres://<user>:<password>@127.0.0.1:<postgres-port>/arcon_api_explorer

PORT=7777
WEB_ORIGIN=https://arcon-api.duckdns.org:7777
PUBLIC_API_URL=https://arcon-api.duckdns.org:7777
CDN_BASE_URL=https://arcon-api.duckdns.org:7777
CORS_ORIGINS=https://arcon-api.duckdns.org:7777,http://127.0.0.1:7777,http://localhost:7777

AUTH_MODE=admin-key
ADMIN_KEY=<long-random-secret>

CONTENT_ROOT=/mnt/ARCON-CLOUD
UPLOAD_DIR=/mnt/ARCON-CLOUD/.arcon-uploads
STORAGE_DRIVER=local

AUTO_POPULATE_EXPLORER=true
POPULATE_EXPLORER_ON_STARTUP=true
POPULATE_EXPLORER_INTERVAL_MS=3600000

SECURITY_HEADERS_ENABLED=true
SECURITY_HSTS_ENABLED=true

ADMIN_RATE_LIMIT_WINDOW_SECONDS=60
ADMIN_RATE_LIMIT_MAX_REQUESTS=120
UPLOAD_RATE_LIMIT_WINDOW_SECONDS=60
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20
```

Generate a strong admin key:

```bash
openssl rand -hex 32
```

Important:

- `CDN_BASE_URL` controls generated media URLs.
- `CONTENT_ROOT` is where `/content/*` files are read from.
- The thumbnail cache is stored under `/mnt/ARCON-CLOUD/.arcon-thumbnails`.
- The server can load `.env` from the repo root when started from `apps/server`, because `apps/server/src/loadEnv.ts` checks `../../.env`.

## 6. Run Database Migrations

From the repo root:

```bash
cd ~/apps/arcon-api-explorer
bun run --cwd apps/server db:migrate
```

Or directly from `apps/server`:

```bash
cd ~/apps/arcon-api-explorer/apps/server
bunx drizzle-kit migrate
```

The migration config is:

```text
apps/server/drizzle.config.ts
```

It reads `DATABASE_URL` from the root `.env`.

## 7. Configure AMP Node.js/Bun Application

Create a new AMP application for the API.

Recommended AMP settings:

```text
Application type: Node.js / Generic Node.js
Working directory: /home/<user>/apps/arcon-api-explorer/apps/server
Executable: /home/<user>/.bun/bin/bun
Arguments: src/index.ts
Port: 7777
```

If AMP has a command/startup field instead of executable + arguments, use:

```bash
bun src/index.ts
```

Use this working directory:

```text
/home/<user>/apps/arcon-api-explorer/apps/server
```

The root `.env` remains at:

```text
/home/<user>/apps/arcon-api-explorer/.env
```

## 8. Firewall And Network

Open the API port:

```bash
sudo firewall-cmd --add-port=7777/tcp --permanent
sudo firewall-cmd --reload
```

If using `ufw`:

```bash
sudo ufw allow 7777/tcp
```

Forward TCP port `7777` on the router to the Arch Linux server.

DuckDNS should point `arcon-api.duckdns.org` to the public IP of the server.

## 9. HTTPS Notes

The app is configured for:

```text
https://arcon-api.duckdns.org:7777
```

AMP or a reverse proxy must provide TLS if the URL is truly HTTPS. If AMP terminates HTTPS, configure the AMP endpoint/certificate for `arcon-api.duckdns.org`.

If TLS is not enabled yet, temporarily use:

```env
PUBLIC_API_URL=http://arcon-api.duckdns.org:7777
CDN_BASE_URL=http://arcon-api.duckdns.org:7777
SECURITY_HSTS_ENABLED=false
```

Switch back to HTTPS after the certificate works.

## 10. First Production Start

Start the AMP app.

Check health:

```bash
curl https://arcon-api.duckdns.org:7777/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "ok": true,
    "service": "arcon-api"
  }
}
```

Check OpenAPI docs:

```text
https://arcon-api.duckdns.org:7777/docs
https://arcon-api.duckdns.org:7777/openapi.json
```

Trigger a manual explorer scan:

```bash
curl -X POST https://arcon-api.duckdns.org:7777/api/explorer/populate \
  -H "X-Admin-Key: <ADMIN_KEY>"
```

## 11. Frontend/API Access

The API expects the admin key in:

```text
X-Admin-Key: <ADMIN_KEY>
```

The private frontend uses the same admin key unlock flow. Keep the key private.

If serving the frontend from a separate domain, add it to:

```env
WEB_ORIGIN=https://<frontend-domain>
CORS_ORIGINS=https://<frontend-domain>,https://arcon-api.duckdns.org:7777
```

## 12. Media URLs And Thumbnails

Original media is served from:

```text
/content/<relative-media-path>
```

Image thumbnails are served from:

```text
/content-thumb/<relative-media-path>
```

Generated public URLs use:

```env
CDN_BASE_URL=https://arcon-api.duckdns.org:7777
```

Thumbnail cache files are generated under:

```text
/mnt/ARCON-CLOUD/.arcon-thumbnails
```

The scanner ignores hidden/system folders through `shouldIgnoreDirectory`, so `.arcon-thumbnails` should not pollute the media library.

## 13. Updating Production

From the repo:

```bash
git pull
bun install
bun run typecheck:all
bun run build:all
bun run --cwd apps/server db:migrate
```

Restart the AMP app after migrations finish.

## 14. Troubleshooting

### API starts but folders disappear

Confirm the drive is mounted and readable before the AMP app starts:

```bash
findmnt /mnt/ARCON-CLOUD
sudo -u <amp-user> ls /mnt/ARCON-CLOUD
```

The population job skips destructive pruning if a directory read fails, but the mount should still be fixed before relying on scans.

### Cannot connect to PostgreSQL

Check the AMP PostgreSQL instance is running and verify:

```bash
psql "$DATABASE_URL" -c "select 1;"
```

If this fails, update `DATABASE_URL` in `.env`.

### Bun not found in AMP

Use the absolute Bun path in AMP:

```bash
which bun
```

Then set AMP executable to that path.

### HTTPS does not load

Confirm TLS is configured in AMP or a reverse proxy. The app itself listens with Bun/Hono; TLS usually belongs to AMP, Caddy, Nginx, or another proxy layer.

### CORS errors

Add the browser origin to:

```env
CORS_ORIGINS=
WEB_ORIGIN=
```

Restart the AMP app after changing env values.

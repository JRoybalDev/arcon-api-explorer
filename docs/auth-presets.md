# Auth Presets

This template ships with two protected-access presets. Both protect the dashboard and all private API writes through the same server middleware.

## Admin Key

Use this for simple projects, small client sites, prototypes, and internal tools where one shared access code is enough.

```txt
AUTH_MODE=admin-key
ADMIN_KEY=replace-with-a-long-random-secret
```

The dashboard asks for the access code and private API requests send it as:

```txt
X-Admin-Key: replace-with-a-long-random-secret
```

## Better Auth

Use this for larger projects where you want real user accounts and session cookies.

```txt
AUTH_MODE=better-auth
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SIGNUP_MODE=private
BETTER_AUTH_ADMIN_ROLES=admin
PASSWORD_RESET_EMAIL_MODE=console
```

Run migrations after switching presets:

```bash
cd apps/server
bunx drizzle-kit migrate
```

The template default is private signup:

```txt
BETTER_AUTH_SIGNUP_MODE=private
```

Seed the first admin with env values, restart the API, then remove those values after the account exists:

```txt
BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD=replace-with-a-long-random-password
BETTER_AUTH_BOOTSTRAP_ADMIN_NAME=Template Admin
```

You can seed it explicitly:

```bash
bun run db:seed
```

Then open `http://localhost:5173/dashboard`, choose Better Auth, and sign in. Existing admins can create later users from the dashboard Users tab.

To allow public account creation from the dashboard gate, switch:

```txt
BETTER_AUTH_SIGNUP_MODE=public
```

Once Better Auth mode is active, protected API writes use the Better Auth session cookie and require an admin role. `ADMIN_KEY` is not required.

## Password Reset

Password reset is enabled for Better Auth email/password accounts. In local development, reset links are logged by the API server:

```txt
PASSWORD_RESET_EMAIL_MODE=console
PASSWORD_RESET_FROM_EMAIL=Fullstack Template <noreply@example.com>
```

For production, switch to the Resend provider preset:

```txt
PASSWORD_RESET_EMAIL_MODE=provider
PASSWORD_RESET_FROM_EMAIL=Support <support@example.com>
RESEND_API_KEY=re_...
```

Provider mode uses Resend by default. If you are testing before your Resend domain is verified, set `RESEND_AUDIENCE_OVERRIDE` to send all reset emails to your verified Resend account email.

Reset links land on `/reset-password` and revoke existing sessions after the password is changed.

## User Management

Admins can manage Better Auth users from the dashboard Users tab:

- create users
- change roles
- ban or unban users
- set a temporary password
- revoke sessions
- delete users

## Switching Presets

Change `AUTH_MODE` in `.env`, restart the API server, and sign in again through the dashboard.

- `admin-key`: requires `ADMIN_KEY`.
- `better-auth`: requires `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, admin-role fields, and the Better Auth database tables from migrations.

For production, use HTTPS for `BETTER_AUTH_URL`, keep `BETTER_AUTH_SECRET` private, set `CORS_ORIGINS`, and use `AUTH_COOKIE_SECURE=true`. If the app must share auth across subdomains, set `AUTH_COOKIE_CROSS_SUBDOMAIN=true` and scope `AUTH_COOKIE_DOMAIN` as tightly as possible.

## Rate Limits

Better Auth routes, private admin routes, and uploads have simple env-configured rate limits:

```txt
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_MAX_REQUESTS=20
ADMIN_RATE_LIMIT_WINDOW_SECONDS=60
ADMIN_RATE_LIMIT_MAX_REQUESTS=120
UPLOAD_RATE_LIMIT_WINDOW_SECONDS=60
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20
```

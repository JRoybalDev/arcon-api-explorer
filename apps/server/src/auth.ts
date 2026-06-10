import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import * as schema from "../db/schema";
import { db } from "./db";
import { sendPasswordResetEmail } from "./email";
import { env } from "./env";

const trustedOrigins = Array.from(new Set([env.webOrigin, env.betterAuthUrl, "http://localhost:5173", "http://127.0.0.1:5173", ...env.betterAuthTrustedOrigins]));

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: env.betterAuthSignupMode === "private",
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        from: env.passwordResetFromEmail,
        mode: env.passwordResetEmailMode,
        url
      });
    }
  },
  rateLimit: {
    enabled: env.authRateLimitEnabled,
    window: env.authRateLimitWindow,
    max: env.authRateLimitMax,
    customRules: {
      "/sign-in/email": {
        window: env.authRateLimitWindow,
        max: Math.min(env.authRateLimitMax, 10)
      },
      "/request-password-reset": {
        window: env.authRateLimitWindow,
        max: Math.min(env.authRateLimitMax, 5)
      },
      "/reset-password": {
        window: env.authRateLimitWindow,
        max: Math.min(env.authRateLimitMax, 5)
      }
    }
  },
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  trustedOrigins,
  advanced: {
    useSecureCookies: env.authCookieSecure,
    crossSubDomainCookies: env.authCookieCrossSubdomain
      ? {
          enabled: true,
          domain: env.authCookieDomain
        }
      : undefined,
    defaultCookieAttributes: {
      secure: env.authCookieSecure
    }
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: env.adminRoles
    })
  ]
});

import { seedBootstrapAdmin } from "./bootstrapAdmin";
import { env } from "./env";
import { logger } from "./logger";

if (env.authMode !== "better-auth") {
  logger.warn("seed.skipped", {
    reason: "AUTH_MODE must be better-auth to seed a Better Auth admin."
  });
} else if (!env.betterAuthBootstrapAdminEmail || !env.betterAuthBootstrapAdminPassword) {
  logger.warn("seed.skipped", {
    reason: "Set BETTER_AUTH_BOOTSTRAP_ADMIN_EMAIL and BETTER_AUTH_BOOTSTRAP_ADMIN_PASSWORD first."
  });
} else {
  await seedBootstrapAdmin();
  logger.info("seed.complete");
}

import { Resend } from "resend";
import { env } from "./env";
import { logger } from "./logger";

type SendPasswordResetEmailInput = {
  email: string;
  from: string;
  mode: "console" | "provider";
  url: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character] ?? character;
  });
}

function passwordResetHtml(url: string) {
  const safeUrl = escapeHtml(url);

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h1 style="font-size:20px">Reset your password</h1>
      <p>Use the secure link below to set a new dashboard password.</p>
      <p><a href="${safeUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p style="font-size:13px;color:#4b5563">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput) {
  if (input.mode === "console") {
    logger.info("auth.password_reset_link", {
      email: input.email,
      from: input.from,
      url: input.url
    });
    return;
  }

  if (!env.resendApiKey) {
    throw new Error("RESEND_API_KEY is required when PASSWORD_RESET_EMAIL_MODE=provider.");
  }

  const resend = new Resend(env.resendApiKey);
  const to = env.resendAudienceOverride || input.email;
  const { error } = await resend.emails.send({
    from: input.from,
    to,
    subject: "Reset your dashboard password",
    html: passwordResetHtml(input.url),
    text: `Reset your dashboard password: ${input.url}`
  });

  if (error) {
    logger.error("email.password_reset_failed", {
      email: input.email,
      provider: "resend",
      error
    });
    throw new Error("Password reset email could not be sent.");
  }

  logger.info("email.password_reset_sent", {
    email: input.email,
    provider: "resend"
  });
}

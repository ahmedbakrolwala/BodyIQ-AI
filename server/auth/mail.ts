const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_TOKEN_LENGTH = 256;

class AuthEmailError extends Error {
  readonly code: "email_configuration_unavailable" | "email_provider_error";

  constructor(
    name: "AuthEmailConfigurationError" | "AuthEmailProviderError",
    code: "email_configuration_unavailable" | "email_provider_error",
    message: string,
  ) {
    super(message);
    this.name = name;
    this.code = code;
  }
}

function nonEmptyEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function isEmailAddress(value: string): boolean {
  return (
    value.length <= 320 &&
    /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[^\s@<>()[\]\\,;:]+$/.test(value)
  );
}

function isSenderAddress(value: string): boolean {
  if (/[\r\n]/.test(value) || value.length > 500) return false;
  if (isEmailAddress(value)) return true;
  const match = /^[^<>]+<([^<>]+)>$/.exec(value);
  return Boolean(match && isEmailAddress(match[1]));
}

function configuredFrontendOrigin(): string | null {
  const configured =
    nonEmptyEnv("AUTH_PUBLIC_FRONTEND_URL") ??
    nonEmptyEnv("EXPO_WEB_PREVIEW_URL") ??
    nonEmptyEnv("EXPO_PUBLIC_FRONTEND_URL");
  if (!configured) {
    return null;
  }

  try {
    const url = new URL(configured);
    if (
      !(
        url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      ) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function configuredEmail(): {
  apiKey: string;
  from: string;
  frontendOrigin: string;
} | null {
  const apiKey = nonEmptyEnv("RESEND_API_KEY");
  const from = nonEmptyEnv("AUTH_EMAIL_FROM");
  const frontendOrigin = configuredFrontendOrigin();
  if (!apiKey || !from || !isSenderAddress(from) || !frontendOrigin) {
    return null;
  }
  return { apiKey, from, frontendOrigin };
}

export function isEmailDeliveryConfigured(): boolean {
  return configuredEmail() !== null;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function validActionToken(token: string): boolean {
  if (
    typeof token !== "string" ||
    token.length < 43 ||
    token.length > MAX_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return false;
  }
  try {
    const bytes = Buffer.from(token, "base64url");
    return bytes.length >= 32 && bytes.toString("base64url") === token;
  } catch {
    return false;
  }
}

function validRecipient(to: string): boolean {
  return (
    typeof to === "string" && isEmailAddress(to.trim()) && to === to.trim()
  );
}

function messageFor(
  purpose: "verify" | "reset",
  origin: string,
  token: string,
): { subject: string; text: string; html: string } {
  const isReset = purpose === "reset";
  const label = isReset
    ? "reset your BodyIQ password"
    : "verify your BodyIQ email address";
  const path = isReset ? "/reset-password" : "/verify-email";
  const link = `${origin}${path}?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  const subject = isReset
    ? "Reset your BodyIQ password"
    : "Verify your BodyIQ email address";
  const text = `Use this link to ${label}: ${link}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Use this link to ${escapeHtml(label)}:</p><p><a href="${safeLink}">${safeLink}</a></p><p>If you did not request this, you can ignore this email.</p>`;
  return { subject, text, html };
}

export async function sendAuthEmail({
  to,
  purpose,
  token,
}: {
  to: string;
  purpose: "verify" | "reset";
  token: string;
}): Promise<void> {
  const configuration = configuredEmail();
  if (!configuration) {
    throw new AuthEmailError(
      "AuthEmailConfigurationError",
      "email_configuration_unavailable",
      "Email delivery is not configured",
    );
  }
  if (
    !validRecipient(to) ||
    !["verify", "reset"].includes(purpose) ||
    !validActionToken(token)
  ) {
    throw new AuthEmailError(
      "AuthEmailConfigurationError",
      "email_configuration_unavailable",
      "Invalid email delivery request",
    );
  }

  const message = messageFor(purpose, configuration.frontendOrigin, token);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: configuration.from,
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new AuthEmailError(
        "AuthEmailProviderError",
        "email_provider_error",
        "Email provider rejected the request",
      );
    }
  } catch (error) {
    if (error instanceof AuthEmailError) {
      throw error;
    }
    throw new AuthEmailError(
      "AuthEmailProviderError",
      "email_provider_error",
      "Email provider request failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

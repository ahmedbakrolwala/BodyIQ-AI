import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { isAllowedNativeRedirectUri } from "../_core/oauth-state";
import { APP_SCHEME } from "../../shared/app-identity";
export const GOOGLE_BINDING_COOKIE = "bodyiq_google_binding";
export type GoogleStateDocument = {
  nonce: string;
  verifier: string;
  binding: string;
  kind: "web" | "native";
  redirectUri: string | null;
  expiresAt: number;
};
function key() {
  const secret = process.env.MANUS_JWT_SECRET ?? process.env.JWT_SECRET;
  if (!secret) throw new Error("OAuth signing is unavailable");
  return createHash("sha256")
    .update("bodyiq-google-state-v1:")
    .update(secret)
    .digest();
}
export function encryptGoogleState(document: GoogleStateDocument): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(document), "utf8"),
    cipher.final(),
  ]);
  return [iv, encrypted, cipher.getAuthTag()]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function decryptGoogleState(state: string): GoogleStateDocument {
  if (state.length > 8192) throw new Error("Invalid OAuth state");
  const parts = state.split(".");
  if (parts.length !== 3) throw new Error("Invalid OAuth state");
  const [iv, data, tag] = parts.map((v) => Buffer.from(v, "base64url"));
  if (iv.length !== 12 || tag.length !== 16)
    throw new Error("Invalid OAuth state");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const document = JSON.parse(
    Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"),
  ) as GoogleStateDocument;
  if (
    !["web", "native"].includes(document.kind) ||
    typeof document.nonce !== "string" ||
    typeof document.verifier !== "string" ||
    typeof document.binding !== "string" ||
    typeof document.expiresAt !== "number" ||
    document.expiresAt <= Date.now()
  )
    throw new Error("Invalid OAuth state");
  return document;
}
export function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function isAllowedGoogleNativeReturn(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol === `${APP_SCHEME}:`) {
      if (url.host === "auth" && url.pathname === "/google-callback")
        return true;
      if (url.host === "" && url.pathname === "/auth/google-callback")
        return true;
      return false;
    }
    if (
      !["exp:", "exps:"].includes(url.protocol) ||
      url.pathname !== "/--/auth/google-callback"
    )
      return false;
    url.pathname = "/--/oauth/callback";
    return isAllowedNativeRedirectUri(url.toString());
  } catch {
    return false;
  }
}

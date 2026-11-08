import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password";
import { isEmailDeliveryConfigured, sendAuthEmail } from "./mail";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  getFrontendAuthUri,
  getGoogleCallbackUri,
  isGoogleConfigured,
} from "./google-provider";
import { registerAuthRoutes } from "./routes";

export function registerAuthBackend(
  app: Parameters<typeof registerAuthRoutes>[0],
) {
  registerAuthRoutes(app, {
    hashPassword,
    verifyPassword,
    dummyPasswordHash: DUMMY_PASSWORD_HASH,
    isEmailDeliveryConfigured,
    sendAuthEmail,
    isGoogleConfigured,
    getGoogleCallbackUri,
    getFrontendAuthUri,
    buildGoogleAuthorizationUrl,
    exchangeGoogleCode,
  });
}

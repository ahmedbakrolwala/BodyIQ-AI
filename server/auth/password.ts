import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 131_072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 16;
const DIGEST_BYTES = 64;
const MAXMEM = 256 * 1024 * 1024;
const MAX_PASSWORD_LENGTH = 128;
const MAX_ENCODED_LENGTH = 256;

const ENCODED_PASSWORD_PATTERN =
  /^scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{86})$/;

function assertPasswordInput(password: string): void {
  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) {
    throw new TypeError("Password must be at most 128 characters");
  }
}

function encodeBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function encodePasswordHash(salt: Buffer, digest: Buffer): string {
  return `scrypt$N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${encodeBase64Url(salt)}$${encodeBase64Url(digest)}`;
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      DIGEST_BYTES,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: MAXMEM,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey as Buffer);
      },
    );
  });
}

function parseEncodedHash(
  encoded: string,
): { salt: Buffer; digest: Buffer } | null {
  if (typeof encoded !== "string" || encoded.length > MAX_ENCODED_LENGTH) {
    return null;
  }

  const match = ENCODED_PASSWORD_PATTERN.exec(encoded);
  if (!match) {
    return null;
  }

  const [, n, r, p, encodedSalt, encodedDigest] = match;
  if (
    n !== String(SCRYPT_N) ||
    r !== String(SCRYPT_R) ||
    p !== String(SCRYPT_P)
  ) {
    return null;
  }

  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const digest = Buffer.from(encodedDigest, "base64url");
    if (salt.length !== SALT_BYTES || digest.length !== DIGEST_BYTES) {
      return null;
    }
    return { salt, digest };
  } catch {
    return null;
  }
}

/** Hash a password using the application-wide scrypt parameters. */
export async function hashPassword(password: string): Promise<string> {
  assertPasswordInput(password);
  const salt = randomBytes(SALT_BYTES);
  const digest = await derive(password, salt);
  return encodePasswordHash(salt, digest);
}

/** Verify a password without accepting alternate or resource-expensive encodings. */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  const parsed = parseEncodedHash(encoded);
  if (!parsed) {
    return false;
  }

  try {
    const digest = await derive(password, parsed.salt);
    return (
      digest.length === parsed.digest.length &&
      timingSafeEqual(digest, parsed.digest)
    );
  } catch {
    return false;
  }
}

// A random process-static password means this is useful for equal-cost unknown-user
// checks without embedding a password that can be discovered from the source.
const dummySalt = randomBytes(SALT_BYTES);
export const DUMMY_PASSWORD_HASH = encodePasswordHash(
  dummySalt,
  scryptSync(randomBytes(32), dummySalt, DIGEST_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  }),
);

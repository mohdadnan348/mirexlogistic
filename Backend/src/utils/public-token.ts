import crypto from "node:crypto";

export interface PublicTokenOptions {
  byteLength?: number;
  prefix?: string;
}

export interface PublicTokenPayload {
  token: string;
  hash: string;
  expiresAt?: Date;
}

const DEFAULT_BYTE_LENGTH = 32;
const MIN_BYTE_LENGTH = 16;
const MAX_BYTE_LENGTH = 128;

function normalizePrefix(
  prefix?: string,
): string {
  if (!prefix) {
    return "";
  }

  return prefix
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 32);
}

function validateByteLength(
  byteLength: number,
): void {
  if (
    !Number.isInteger(byteLength) ||
    byteLength < MIN_BYTE_LENGTH ||
    byteLength > MAX_BYTE_LENGTH
  ) {
    throw new Error(
      `Token byte length must be between ${MIN_BYTE_LENGTH} and ${MAX_BYTE_LENGTH}`,
    );
  }
}

export function generatePublicToken(
  options: PublicTokenOptions = {},
): string {
  const byteLength =
    options.byteLength ??
    DEFAULT_BYTE_LENGTH;

  validateByteLength(byteLength);

  const prefix = normalizePrefix(
    options.prefix,
  );

  const token = crypto
    .randomBytes(byteLength)
    .toString("hex");

  return prefix
    ? `${prefix}_${token}`
    : token;
}

export function hashPublicToken(
  token: string,
): string {
  if (
    typeof token !== "string" ||
    token.trim().length === 0
  ) {
    throw new Error(
      "Public token is required",
    );
  }

  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function generatePublicTokenPayload(
  options: PublicTokenOptions = {},
  expiresAt?: Date,
): PublicTokenPayload {
  const token = generatePublicToken(options);

  return {
    token,
    hash: hashPublicToken(token),
    ...(expiresAt
      ? { expiresAt: new Date(expiresAt) }
      : {}),
  };
}

export function verifyPublicToken(
  token: string,
  storedHash: string,
): boolean {
  if (
    typeof token !== "string" ||
    typeof storedHash !== "string" ||
    token.length === 0 ||
    storedHash.length === 0
  ) {
    return false;
  }

  const tokenHash =
    hashPublicToken(token);

  const expected = Buffer.from(
    storedHash,
    "utf8",
  );

  const actual = Buffer.from(
    tokenHash,
    "utf8",
  );

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    actual,
  );
}

export function isPublicTokenExpired(
  expiresAt: Date | string | number | null | undefined,
): boolean {
  if (expiresAt === null || expiresAt === undefined) {
    return false;
  }

  const expiration = new Date(expiresAt);

  if (Number.isNaN(expiration.getTime())) {
    return true;
  }

  return expiration.getTime() <= Date.now();
}

export function hasPublicTokenExpired(
  expiresAt: Date | string | number | null | undefined,
): boolean {
  return isPublicTokenExpired(expiresAt);
}

export function generateTrackingToken(
  byteLength = 32,
): string {
  return generatePublicToken({
    byteLength,
    prefix: "TRK",
  });
}

export function generatePublicTrackingToken(
  byteLength = 32,
): string {
  return generateTrackingToken(
    byteLength,
  );
}

export function generatePublicShareToken(
  byteLength = 32,
): string {
  return generatePublicToken({
    byteLength,
    prefix: "PUB",
  });
}

export function generateDownloadToken(
  byteLength = 32,
): string {
  return generatePublicToken({
    byteLength,
    prefix: "DL",
  });
}

export function createTokenExpiration(
  durationMs: number,
  fromDate: Date = new Date(),
): Date {
  if (
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  ) {
    throw new Error(
      "Token duration must be a positive number",
    );
  }

  return new Date(
    fromDate.getTime() + durationMs,
  );
}

export function createPublicTokenWithExpiration(
  durationMs: number,
  options: PublicTokenOptions = {},
): PublicTokenPayload {
  const expiresAt =
    createTokenExpiration(durationMs);

  return generatePublicTokenPayload(
    options,
    expiresAt,
  );
}
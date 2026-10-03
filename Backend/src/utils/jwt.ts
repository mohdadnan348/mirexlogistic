import jwt, {
  type JwtPayload,
  type SignOptions,
  type VerifyOptions,
} from "jsonwebtoken";
import type { StringValue } from "ms";

import { ENV } from "../config/env";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  branchId?: string;
  tokenType: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  tokenType: "refresh";
  tokenId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface VerifyTokenOptions {
  ignoreExpiration?: boolean;
}

type AccessTokenInput = Omit<
  AccessTokenPayload,
  "iat" | "exp" | "tokenType"
>;

type RefreshTokenInput = Omit<
  RefreshTokenPayload,
  "iat" | "exp" | "tokenType"
>;

const JWT_ALGORITHM = "HS256" as const;

function getAccessTokenExpiresIn(): StringValue {
  return ENV.JWT_ACCESS_EXPIRES_IN as StringValue;
}

function getRefreshTokenExpiresIn(): StringValue {
  return ENV.JWT_REFRESH_EXPIRES_IN as StringValue;
}

function getJwtSecret(): string {
  if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return ENV.JWT_SECRET;
}

function getRefreshJwtSecret(): string {
  if (!ENV.JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET is not configured",
    );
  }

  return ENV.JWT_REFRESH_SECRET;
}

function buildAccessPayload(
  payload: AccessTokenInput,
): AccessTokenPayload {
  return {
    ...payload,
    sub: payload.sub,
    tokenType: "access",
  };
}

function buildRefreshPayload(
  payload: RefreshTokenInput,
): RefreshTokenPayload {
  return {
    ...payload,
    sub: payload.sub,
    tokenId: payload.tokenId,
    tokenType: "refresh",
  };
}

export function signAccessToken(
  payload: AccessTokenInput,
): string {
  const tokenPayload =
    buildAccessPayload(payload);

  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: getAccessTokenExpiresIn(),
    subject: payload.sub,
  };

  return jwt.sign(
    tokenPayload,
    getJwtSecret(),
    options,
  );
}

export function signRefreshToken(
  payload: RefreshTokenInput,
): string {
  const tokenPayload =
    buildRefreshPayload(payload);

  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: getRefreshTokenExpiresIn(),
    subject: payload.sub,
  };

  return jwt.sign(
    tokenPayload,
    getRefreshJwtSecret(),
    options,
  );
}

function isJwtPayload(
  value: string | JwtPayload | jwt.Jwt,
): value is JwtPayload {
  return (
    typeof value !== "string" &&
    typeof value === "object" &&
    value !== null &&
    "sub" in value
  );
}

function isAccessTokenPayload(
  value: string | JwtPayload | jwt.Jwt,
): value is AccessTokenPayload {
  return (
    isJwtPayload(value) &&
    typeof value.sub === "string" &&
    value.tokenType === "access"
  );
}

function isRefreshTokenPayload(
  value: string | JwtPayload | jwt.Jwt,
): value is RefreshTokenPayload {
  return (
    isJwtPayload(value) &&
    typeof value.sub === "string" &&
    value.tokenType === "refresh" &&
    typeof value.tokenId === "string"
  );
}

export function verifyAccessToken(
  token: string,
  options: VerifyTokenOptions = {},
): AccessTokenPayload {
  const verifyOptions: VerifyOptions = {
    algorithms: [JWT_ALGORITHM],
    ignoreExpiration:
      options.ignoreExpiration ?? false,
  };

  const decoded = jwt.verify(
    token,
    getJwtSecret(),
    verifyOptions,
  );

  if (!isAccessTokenPayload(decoded)) {
    throw new Error("Invalid access token");
  }

  return {
    ...decoded,
    sub: decoded.sub,
    tokenType: "access",
  };
}

export function verifyRefreshToken(
  token: string,
  options: VerifyTokenOptions = {},
): RefreshTokenPayload {
  const verifyOptions: VerifyOptions = {
    algorithms: [JWT_ALGORITHM],
    ignoreExpiration:
      options.ignoreExpiration ?? false,
  };

  const decoded = jwt.verify(
    token,
    getRefreshJwtSecret(),
    verifyOptions,
  );

  if (!isRefreshTokenPayload(decoded)) {
    throw new Error("Invalid refresh token");
  }

  return {
    ...decoded,
    sub: decoded.sub,
    tokenId: decoded.tokenId,
    tokenType: "refresh",
  };
}

export function decodeToken(
  token: string,
): JwtPayload | null {
  const decoded = jwt.decode(token);

  if (!decoded) {
    return null;
  }

  if (typeof decoded === "string") {
    return null;
  }

  if (
    typeof decoded !== "object" ||
    decoded === null
  ) {
    return null;
  }

  return decoded as JwtPayload;
}

export function getTokenExpiration(
  token: string,
): Date | null {
  const decoded = decodeToken(token);

  if (
    !decoded ||
    typeof decoded.exp !== "number"
  ) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}

export function isTokenExpired(
  token: string,
): boolean {
  const expiration =
    getTokenExpiration(token);

  if (!expiration) {
    return true;
  }

  return expiration.getTime() <= Date.now();
}

export function getTokenSubject(
  token: string,
): string | null {
  const decoded = decodeToken(token);

  if (
    !decoded ||
    typeof decoded.sub !== "string"
  ) {
    return null;
  }

  return decoded.sub;
}

export function getTokenId(
  token: string,
): string | null {
  const decoded = decodeToken(token);

  if (
    !decoded ||
    typeof decoded.jti !== "string"
  ) {
    return null;
  }

  return decoded.jti;
}

export function generateTokenId(): string {
  const timestamp = Date.now().toString(36);

  const random = Math.random()
    .toString(36)
    .slice(2, 14);

  return `${timestamp}-${random}`;
}

export function createTokenPair(user: {
  id: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  branchId?: string;
}): TokenPair {
  const tokenId = generateTokenId();

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
    permissions: user.permissions,
    branchId: user.branchId,
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenId,
  });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn:
      ENV.JWT_ACCESS_EXPIRES_IN,
    refreshTokenExpiresIn:
      ENV.JWT_REFRESH_EXPIRES_IN,
  };
}

export function extractBearerToken(
  authorizationHeader?: string,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const parts =
    authorizationHeader.trim().split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

export function getBearerTokenFromHeader(
  authorizationHeader?: string,
): string | null {
  return extractBearerToken(
    authorizationHeader,
  );
}

export function isValidJwtFormat(
  token: string,
): boolean {
  if (
    !token ||
    typeof token !== "string"
  ) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  return parts.every(
    (part) => part.length > 0,
  );
}

export function getJwtPayload(
  token: string,
): JwtPayload | null {
  if (!isValidJwtFormat(token)) {
    return null;
  }

  return decodeToken(token);
}
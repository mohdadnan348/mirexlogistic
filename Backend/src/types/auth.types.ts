import type { Request } from "express";
import type { Document, Types } from "mongoose";

import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../utils/jwt";

/**
 * Authentication provider.
 */
export type AuthProvider =
  | "password"
  | "google"
  | "microsoft"
  | "apple";

/**
 * Supported account status values.
 */
export type AccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "LOCKED"
  | "PENDING"
  | "DELETED";

/**
 * Authentication session status.
 */
export type AuthSessionStatus =
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED";

/**
 * Login credentials.
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration payload.
 */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  roleId?: string;
  branchId?: string;
}

/**
 * Authentication user representation.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId?: string;
  roleCode?: string;
  roleName?: string;
  permissions: string[];
  branchId?: string;
  accountStatus: AccountStatus;
  authProvider: AuthProvider;
}

/**
 * Authenticated session representation.
 */
export interface AuthSession {
  id: string;
  userId: string;
  tokenId: string;
  status: AuthSessionStatus;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

/**
 * Access and refresh token pair.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

/**
 * Login result returned by authentication service.
 */
export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
  session: AuthSession;
}

/**
 * Refresh token result.
 */
export interface RefreshTokenResult {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn?: string;
}

/**
 * Authenticated request user.
 */
export interface AuthenticatedUser extends AuthUser {
  sessionId?: string;
  tokenId?: string;
}

/**
 * Express request extended with authenticated user.
 */
export interface AuthenticatedRequest
  extends Request {
  user?: AuthenticatedUser;
  auth?: AuthContext;
}

/**
 * Authentication context attached to a request.
 */
export interface AuthContext {
  user: AuthenticatedUser;
  accessToken: string;
  payload: AccessTokenPayload;
  sessionId?: string;
  tokenId?: string;
}

/**
 * Refresh-token context.
 */
export interface RefreshTokenContext {
  userId: string;
  tokenId: string;
  payload: RefreshTokenPayload;
  refreshToken: string;
}

/**
 * Password reset request.
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation.
 */
export interface PasswordResetConfirmation {
  token: string;
  password: string;
}

/**
 * Change-password request.
 */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/**
 * Email verification payload.
 */
export interface EmailVerificationPayload {
  token: string;
}

/**
 * OTP verification payload.
 */
export interface OtpVerificationPayload {
  identifier: string;
  otp: string;
  purpose:
    | "LOGIN"
    | "REGISTRATION"
    | "PASSWORD_RESET"
    | "PHONE_VERIFICATION"
    | "EMAIL_VERIFICATION";
}

/**
 * Authentication cookie names.
 */
export interface AuthCookieNames {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT payload union used by authentication middleware.
 */
export type AuthJwtPayload =
  | AccessTokenPayload
  | RefreshTokenPayload;

/**
 * Authentication document base fields.
 *
 * Kept generic so it can be reused by Mongoose
 * authentication-related documents without coupling
 * this type to a specific model.
 */
export interface AuthDocumentBase {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic authentication document.
 */
export type AuthDocument<
  T extends object = object,
> = Document<Types.ObjectId, Record<string, never>, T> &
  T &
  AuthDocumentBase;

/**
 * Authentication audit information.
 */
export interface AuthAuditContext {
  userId?: string;
  sessionId?: string;
  tokenId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  requestId?: string;
}

/**
 * Login audit event.
 */
export interface LoginAuditEvent
  extends AuthAuditContext {
  email: string;
  success: boolean;
  failureReason?: string;
}

/**
 * Logout audit event.
 */
export interface LogoutAuditEvent
  extends AuthAuditContext {
  reason?:
    | "USER"
    | "ADMIN"
    | "SESSION_EXPIRED"
    | "SECURITY"
    | "PASSWORD_CHANGED";
}

/**
 * Authentication service options.
 */
export interface AuthServiceOptions {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  rememberMe?: boolean;
}

/**
 * Session creation input.
 */
export interface CreateAuthSessionInput {
  userId: string;
  tokenId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  expiresAt: Date;
}

/**
 * Session revoke input.
 */
export interface RevokeAuthSessionInput {
  sessionId?: string;
  tokenId?: string;
  userId?: string;
  reason?:
    | "LOGOUT"
    | "ADMIN"
    | "SECURITY"
    | "PASSWORD_CHANGED"
    | "SESSION_EXPIRED";
}

/**
 * Authentication permission checker.
 */
export type PermissionChecker = (
  permission: string,
) => boolean;

/**
 * Role checker.
 */
export type RoleChecker = (
  role: string | string[],
) => boolean;

/**
 * Authentication context factory.
 */
export type AuthContextFactory = (
  request: AuthenticatedRequest,
) => AuthContext | undefined;

/**
 * Type guard for authenticated requests.
 */
export function isAuthenticatedRequest(
  request: Request,
): request is AuthenticatedRequest {
  return Boolean(
    (request as AuthenticatedRequest).user,
  );
}

/**
 * Type guard for authenticated users.
 */
export function isAuthenticatedUser(
  user: unknown,
): user is AuthenticatedUser {
  if (
    typeof user !== "object" ||
    user === null
  ) {
    return false;
  }

  const candidate =
    user as Partial<AuthenticatedUser>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    Array.isArray(candidate.permissions) &&
    typeof candidate.accountStatus ===
      "string" &&
    typeof candidate.authProvider ===
      "string"
  );
}

/**
 * Type guard for access-token payloads.
 */
export function isAccessAuthPayload(
  payload: unknown,
): payload is AccessTokenPayload {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return false;
  }

  const candidate =
    payload as Partial<AccessTokenPayload>;

  return (
    typeof candidate.sub === "string" &&
    candidate.tokenType === "access"
  );
}

/**
 * Type guard for refresh-token payloads.
 */
export function isRefreshAuthPayload(
  payload: unknown,
): payload is RefreshTokenPayload {
  if (
    typeof payload !== "object" ||
    payload === null
  ) {
    return false;
  }

  const candidate =
    payload as Partial<RefreshTokenPayload>;

  return (
    typeof candidate.sub === "string" &&
    typeof candidate.tokenId === "string" &&
    candidate.tokenType === "refresh"
  );
}
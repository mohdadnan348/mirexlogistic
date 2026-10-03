/**
 * MirexCargo
 * Authentication Module Types
 *
 * Shared TypeScript contracts for authentication,
 * login, tokens, sessions, password reset and OTP flows.
 */

import type { Request } from "express";
import type { Types } from "mongoose";

import type {
  AuthAccountStatus,
  AuthOtpPurpose,
  AuthRole,
} from "./auth.constants";

/* -------------------------------------------------------------------------- */
/*                               Core Identity                                */
/* -------------------------------------------------------------------------- */

export interface AuthUser {
  userId: string;
  email: string;
  phone?: string;
  name?: string;
  role: AuthRole;
  branchId?: string;
  departmentId?: string;
  status: AuthAccountStatus;
}

export interface AuthUserDocument {
  _id: Types.ObjectId;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: AuthRole;
  branchId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  status: AuthAccountStatus;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                                Credentials                                 */
/* -------------------------------------------------------------------------- */

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
  rememberMe?: boolean;
}

export interface PasswordCredentials {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequest {
  email?: string;
  phone?: string;
}

export interface PasswordResetPayload {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Tokens                                    */
/* -------------------------------------------------------------------------- */

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AuthRole;
  branchId?: string;
  sessionId: string;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface RevokeTokenRequest {
  refreshToken?: string;
  sessionId?: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Session                                   */
/* -------------------------------------------------------------------------- */

export interface AuthSession {
  sessionId: string;
  userId: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  refreshTokenHash?: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  isRevoked: boolean;
}

export interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

/* -------------------------------------------------------------------------- */
/*                                    OTP                                     */
/* -------------------------------------------------------------------------- */

export interface OtpRequest {
  purpose: AuthOtpPurpose;
  email?: string;
  phone?: string;
}

export interface OtpVerificationRequest {
  purpose: AuthOtpPurpose;
  identifier: string;
  otp: string;
}

export interface OtpRecord {
  _id?: Types.ObjectId;
  userId?: Types.ObjectId;
  identifier: string;
  purpose: AuthOtpPurpose;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  lastSentAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                              Email / Phone                                 */
/* -------------------------------------------------------------------------- */

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyPhoneRequest {
  otp: string;
}

export interface ResendVerificationRequest {
  channel: "email" | "phone";
}

/* -------------------------------------------------------------------------- */
/*                              Authentication                                 */
/* -------------------------------------------------------------------------- */

/**
 * IMPORTANT:
 *
 * Express Request already receives `auth` from src/types/express.d.ts.
 * That global property contains:
 *
 * - user
 * - accessToken
 * - payload
 *
 * Therefore this module must NOT redefine Request.auth with another shape.
 *
 * AuthRequest is kept as an alias so existing module imports can continue
 * using AuthRequest without creating an incompatible Request extension.
 */
export type AuthRequest = Request;

export interface AuthenticatedRequestContext {
  userId: string;
  email: string;
  role: AuthRole;
  branchId?: string;
  sessionId: string;
  tokenType: "access";
}

export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface LogoutContext {
  userId: string;
  sessionId?: string;
  refreshToken?: string;
}

/* -------------------------------------------------------------------------- */
/*                              Login Response                                 */
/* -------------------------------------------------------------------------- */

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokenPair;
  session: {
    sessionId: string;
    expiresAt: Date;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt?: Date;
}

/* -------------------------------------------------------------------------- */
/*                               Auth Results                                  */
/* -------------------------------------------------------------------------- */

export interface AuthenticationResult {
  success: boolean;
  user?: AuthUser;
  tokens?: AuthTokenPair;
  session?: AuthSession;
  error?: AuthError;
}

export interface AuthOperationResult {
  success: boolean;
  message: string;
  error?: AuthError;
}

export interface OtpOperationResult extends AuthOperationResult {
  expiresAt?: Date;
  retryAfterSeconds?: number;
}

/* -------------------------------------------------------------------------- */
/*                                  Errors                                    */
/* -------------------------------------------------------------------------- */

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "TOKEN_MISSING"
  | "INVALID_REFRESH_TOKEN"
  | "REFRESH_TOKEN_EXPIRED"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_LOCKED"
  | "TOO_MANY_LOGIN_ATTEMPTS"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_INVALID"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG"
  | "PASSWORD_MISMATCH"
  | "PASSWORD_SAME_AS_OLD"
  | "PASSWORD_EXPIRED"
  | "OTP_REQUIRED"
  | "OTP_INVALID"
  | "OTP_EXPIRED"
  | "OTP_MAX_ATTEMPTS"
  | "OTP_RESEND_COOLDOWN"
  | "EMAIL_NOT_VERIFIED"
  | "PHONE_NOT_VERIFIED"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "SESSION_LIMIT_REACHED"
  | "UNAUTHORIZED"
  | "FORBIDDEN";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*                              Audit Context                                 */
/* -------------------------------------------------------------------------- */

export interface AuthAuditContext {
  userId?: string;
  sessionId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  success: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*                              Service Inputs                                */
/* -------------------------------------------------------------------------- */

export interface LoginInput {
  credentials: LoginCredentials;
  context?: LoginContext;
}

export interface RefreshTokenInput {
  refreshToken: string;
  context?: LoginContext;
}

export interface LogoutInput {
  userId: string;
  sessionId?: string;
  refreshToken?: string;
}

export interface ChangePasswordInput {
  userId: string;
  credentials: PasswordCredentials;
  revokeAllSessions?: boolean;
}

export interface RequestPasswordResetInput {
  identifier: string;
  context?: LoginContext;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
  context?: LoginContext;
}

/* -------------------------------------------------------------------------- */
/*                              Authorization                                 */
/* -------------------------------------------------------------------------- */

export interface AuthorizationContext {
  userId: string;
  role: AuthRole;
  branchId?: string;
  permissions: string[];
}

export interface PermissionCheckInput {
  userId: string;
  permission: string;
  branchId?: string;
}

export interface RoleCheckInput {
  userId: string;
  roles: AuthRole[];
}

/* -------------------------------------------------------------------------- */
/*                              Security Data                                 */
/* -------------------------------------------------------------------------- */

export interface LoginAttempt {
  userId?: string;
  identifier: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  successful: boolean;
  reason?: string;
  attemptedAt: Date;
}

export interface SecurityEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*                              Type Guards                                   */
/* -------------------------------------------------------------------------- */

export function isAuthUser(
  value: unknown,
): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.userId === "string" &&
    typeof data.email === "string" &&
    typeof data.role === "string" &&
    typeof data.status === "string"
  );
}

/**
 * Checks whether the request has the global Express auth context.
 *
 * The actual AuthContext interface is defined in src/types/express.d.ts.
 * We intentionally inspect the properties structurally instead of redefining
 * the interface here.
 */
export function isAuthenticatedRequest(
  request: Request,
): boolean {
  const auth = request.auth;

  return (
    auth !== undefined &&
    auth.user !== undefined &&
    typeof auth.accessToken === "string" &&
    auth.payload !== undefined
  );
}

export function isAuthTokenPair(
  value: unknown,
): value is AuthTokenPair {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.accessToken === "string" &&
    typeof data.refreshToken === "string" &&
    data.accessTokenExpiresAt instanceof Date &&
    data.refreshTokenExpiresAt instanceof Date
  );
}

/* -------------------------------------------------------------------------- */
/*                              Helper Types                                  */
/* -------------------------------------------------------------------------- */

export type AuthIdentifier = string;

export type AuthChannel = "email" | "phone";

export type AuthTokenKind = "access" | "refresh";

export type AuthVerificationChannel = "email" | "phone";

export type AuthRequestContext = Pick<
  LoginContext,
  "ipAddress" | "userAgent" | "deviceId"
>;
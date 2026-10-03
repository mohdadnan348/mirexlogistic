/**
 * MirexCargo
 * Authentication Module Constants
 *
 * Centralized constants for authentication, sessions,
 * passwords, OTP, account status, and authentication events.
 */

export const AUTH_MODULE_CONSTANTS = Object.freeze({
  MODULE_NAME: "auth",

  TOKEN: Object.freeze({
    ACCESS: "access",
    REFRESH: "refresh",

    ACCESS_TOKEN_TYPE: "Bearer",

    ACCESS_COOKIE_NAME: "mirexcargo_access_token",
    REFRESH_COOKIE_NAME: "mirexcargo_refresh_token",

    ACCESS_HEADER_NAME: "authorization",

    ACCESS_EXPIRY: "15m",
    REFRESH_EXPIRY: "7d",

    TOKEN_PREFIX: "Bearer",
  }),

  PASSWORD: Object.freeze({
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,

    BCRYPT_SALT_ROUNDS: 12,

    RESET_TOKEN_LENGTH: 64,
    RESET_TOKEN_EXPIRY_MINUTES: 30,

    HISTORY_LIMIT: 5,

    SPECIAL_CHARACTERS: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  }),

  OTP: Object.freeze({
    LENGTH: 6,

    EXPIRY_MINUTES: 10,

    MAX_ATTEMPTS: 5,

    RESEND_COOLDOWN_SECONDS: 60,

    MAX_RESEND_ATTEMPTS: 5,

    PURPOSES: Object.freeze({
      LOGIN: "LOGIN",
      PHONE_VERIFICATION: "PHONE_VERIFICATION",
      EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
      PASSWORD_RESET: "PASSWORD_RESET",
      TRANSACTION: "TRANSACTION",
    }),
  }),

  SESSION: Object.freeze({
    MAX_SESSIONS_PER_USER: 5,

    DEFAULT_SESSION_EXPIRY_DAYS: 7,

    REMEMBER_ME_EXPIRY_DAYS: 30,

    INACTIVITY_TIMEOUT_MINUTES: 60,

    COOKIE_HTTP_ONLY: true,

    COOKIE_SAME_SITE: "lax",

    COOKIE_PATH: "/",
  }),

  ACCOUNT: Object.freeze({
    STATUS: Object.freeze({
      ACTIVE: "ACTIVE",
      INACTIVE: "INACTIVE",
      SUSPENDED: "SUSPENDED",
      LOCKED: "LOCKED",
      PENDING: "PENDING",
      DELETED: "DELETED",
    }),

    MAX_LOGIN_ATTEMPTS: 5,

    LOCK_DURATION_MINUTES: 30,

    PASSWORD_EXPIRY_DAYS: 90,

    EMAIL_VERIFICATION_REQUIRED: false,

    PHONE_VERIFICATION_REQUIRED: false,
  }),

  ROLES: Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    SALES: "SALES",
    OPERATIONS: "OPERATIONS",
    DOCUMENTATION: "DOCUMENTATION",
    FINANCE: "FINANCE",
    WAREHOUSE_TRANSPORT: "WAREHOUSE_TRANSPORT",
    VIEWER: "VIEWER",
  }),

  PERMISSIONS: Object.freeze({
    AUTH_LOGIN: "auth:login",
    AUTH_LOGOUT: "auth:logout",
    AUTH_REFRESH: "auth:refresh",
    AUTH_CHANGE_PASSWORD: "auth:change-password",
    AUTH_RESET_PASSWORD: "auth:reset-password",
    AUTH_VERIFY_OTP: "auth:verify-otp",
    AUTH_VERIFY_EMAIL: "auth:verify-email",
    AUTH_VERIFY_PHONE: "auth:verify-phone",
  }),

  HEADERS: Object.freeze({
    AUTHORIZATION: "Authorization",
    CONTENT_TYPE: "Content-Type",
    ACCEPT: "Accept",
    USER_AGENT: "User-Agent",
    X_REQUEST_ID: "X-Request-ID",
    X_CLIENT_VERSION: "X-Client-Version",
    X_DEVICE_ID: "X-Device-ID",
  }),

  COOKIES: Object.freeze({
    ACCESS_TOKEN: "mirexcargo_access_token",
    REFRESH_TOKEN: "mirexcargo_refresh_token",
    SESSION: "mirexcargo_session",
  }),

  EVENTS: Object.freeze({
    LOGIN_SUCCESS: "auth:login:success",
    LOGIN_FAILED: "auth:login:failed",

    LOGOUT: "auth:logout",

    TOKEN_REFRESHED: "auth:token-refreshed",
    TOKEN_REVOKED: "auth:token-revoked",

    PASSWORD_CHANGED: "auth:password-changed",
    PASSWORD_RESET_REQUESTED: "auth:password-reset-requested",
    PASSWORD_RESET: "auth:password-reset",

    OTP_SENT: "auth:otp-sent",
    OTP_VERIFIED: "auth:otp-verified",
    OTP_FAILED: "auth:otp-failed",

    EMAIL_VERIFIED: "auth:email-verified",
    PHONE_VERIFIED: "auth:phone-verified",

    ACCOUNT_LOCKED: "auth:account-locked",
    ACCOUNT_UNLOCKED: "auth:account-unlocked",

    SESSION_CREATED: "auth:session-created",
    SESSION_REVOKED: "auth:session-revoked",

    SECURITY_ALERT: "auth:security-alert",
  }),

  ERRORS: Object.freeze({
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

    INVALID_TOKEN: "INVALID_TOKEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    TOKEN_REVOKED: "TOKEN_REVOKED",
    TOKEN_MISSING: "TOKEN_MISSING",

    INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
    REFRESH_TOKEN_EXPIRED: "REFRESH_TOKEN_EXPIRED",

    ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
    ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
    ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
    ACCOUNT_LOCKED: "ACCOUNT_LOCKED",

    TOO_MANY_LOGIN_ATTEMPTS: "TOO_MANY_LOGIN_ATTEMPTS",

    PASSWORD_REQUIRED: "PASSWORD_REQUIRED",
    PASSWORD_INVALID: "PASSWORD_INVALID",
    PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
    PASSWORD_TOO_LONG: "PASSWORD_TOO_LONG",
    PASSWORD_MISMATCH: "PASSWORD_MISMATCH",
    PASSWORD_SAME_AS_OLD: "PASSWORD_SAME_AS_OLD",
    PASSWORD_EXPIRED: "PASSWORD_EXPIRED",

    OTP_REQUIRED: "OTP_REQUIRED",
    OTP_INVALID: "OTP_INVALID",
    OTP_EXPIRED: "OTP_EXPIRED",
    OTP_MAX_ATTEMPTS: "OTP_MAX_ATTEMPTS",
    OTP_RESEND_COOLDOWN: "OTP_RESEND_COOLDOWN",

    EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
    PHONE_NOT_VERIFIED: "PHONE_NOT_VERIFIED",

    SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
    SESSION_EXPIRED: "SESSION_EXPIRED",
    SESSION_LIMIT_REACHED: "SESSION_LIMIT_REACHED",

    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
  }),

  VALIDATION: Object.freeze({
    EMAIL_MAX_LENGTH: 254,

    PHONE_MIN_LENGTH: 8,
    PHONE_MAX_LENGTH: 15,

    OTP_MIN_LENGTH: 4,
    OTP_MAX_LENGTH: 8,

    DEVICE_ID_MAX_LENGTH: 255,

    USER_AGENT_MAX_LENGTH: 1000,

    RESET_TOKEN_MIN_LENGTH: 32,

    PASSWORD_REQUIREMENTS: Object.freeze({
      MIN_LENGTH: 8,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBER: true,
      REQUIRE_SPECIAL_CHARACTER: true,
    }),
  }),

  SECURITY: Object.freeze({
    MAX_FAILED_ATTEMPTS: 5,

    ACCOUNT_LOCK_MINUTES: 30,

    RESET_TOKEN_SINGLE_USE: true,

    REFRESH_TOKEN_ROTATION: true,

    REVOKE_REFRESH_TOKEN_ON_LOGOUT: true,

    REVOKE_ALL_SESSIONS_ON_PASSWORD_CHANGE: true,

    PREVENT_PASSWORD_REUSE: true,

    ENABLE_LOGIN_AUDIT: true,

    ENABLE_SECURITY_AUDIT: true,
  }),

  AUDIT: Object.freeze({
    ACTIONS: Object.freeze({
      LOGIN: "LOGIN",
      LOGOUT: "LOGOUT",
      LOGIN_FAILED: "LOGIN_FAILED",

      TOKEN_REFRESH: "TOKEN_REFRESH",
      TOKEN_REVOKED: "TOKEN_REVOKED",

      PASSWORD_CHANGE: "PASSWORD_CHANGE",
      PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
      PASSWORD_RESET: "PASSWORD_RESET",

      OTP_REQUEST: "OTP_REQUEST",
      OTP_VERIFY: "OTP_VERIFY",

      EMAIL_VERIFY: "EMAIL_VERIFY",
      PHONE_VERIFY: "PHONE_VERIFY",

      SESSION_CREATE: "SESSION_CREATE",
      SESSION_REVOKE: "SESSION_REVOKE",

      ACCOUNT_LOCK: "ACCOUNT_LOCK",
      ACCOUNT_UNLOCK: "ACCOUNT_UNLOCK",
    }),
  }),

  MESSAGES: Object.freeze({
    LOGIN_SUCCESS: "Login successful.",
    LOGOUT_SUCCESS: "Logout successful.",
    TOKEN_REFRESH_SUCCESS: "Access token refreshed successfully.",

    PASSWORD_CHANGED: "Password changed successfully.",
    PASSWORD_RESET_REQUESTED:
      "If the account exists, password reset instructions have been sent.",

    PASSWORD_RESET_SUCCESS: "Password reset successfully.",

    OTP_SENT: "OTP sent successfully.",
    OTP_VERIFIED: "OTP verified successfully.",

    EMAIL_VERIFIED: "Email verified successfully.",
    PHONE_VERIFIED: "Phone verified successfully.",

    SESSION_REVOKED: "Session revoked successfully.",
    ALL_SESSIONS_REVOKED: "All sessions revoked successfully.",
  }),
} as const);

export type AuthAccountStatus =
  (typeof AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS)[keyof typeof AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS];

export type AuthRole =
  (typeof AUTH_MODULE_CONSTANTS.ROLES)[keyof typeof AUTH_MODULE_CONSTANTS.ROLES];

export type AuthOtpPurpose =
  (typeof AUTH_MODULE_CONSTANTS.OTP.PURPOSES)[keyof typeof AUTH_MODULE_CONSTANTS.OTP.PURPOSES];

export type AuthTokenType =
  (typeof AUTH_MODULE_CONSTANTS.TOKEN)[keyof Pick<
    typeof AUTH_MODULE_CONSTANTS.TOKEN,
    "ACCESS" | "REFRESH"
  >];

export function isValidAuthAccountStatus(
  status: string,
): status is AuthAccountStatus {
  return Object.values(AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS).includes(
    status as AuthAccountStatus,
  );
}

export function isValidAuthRole(role: string): role is AuthRole {
  return Object.values(AUTH_MODULE_CONSTANTS.ROLES).includes(
    role as AuthRole,
  );
}

export function isValidAuthOtpPurpose(
  purpose: string,
): purpose is AuthOtpPurpose {
  return Object.values(AUTH_MODULE_CONSTANTS.OTP.PURPOSES).includes(
    purpose as AuthOtpPurpose,
  );
}

export function isAccountActive(status: AuthAccountStatus): boolean {
  return status === AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS.ACTIVE;
}

export function isAccountLocked(status: AuthAccountStatus): boolean {
  return status === AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS.LOCKED;
}

export function isAccountSuspended(status: AuthAccountStatus): boolean {
  return status === AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS.SUSPENDED;
}

export function getAccessTokenCookieName(): string {
  return AUTH_MODULE_CONSTANTS.COOKIES.ACCESS_TOKEN;
}

export function getRefreshTokenCookieName(): string {
  return AUTH_MODULE_CONSTANTS.COOKIES.REFRESH_TOKEN;
}

export function getAuthorizationHeaderName(): string {
  return AUTH_MODULE_CONSTANTS.HEADERS.AUTHORIZATION;
}

export function getBearerTokenPrefix(): string {
  return AUTH_MODULE_CONSTANTS.TOKEN.TOKEN_PREFIX;
}

export function getOtpExpiryInMinutes(): number {
  return AUTH_MODULE_CONSTANTS.OTP.EXPIRY_MINUTES;
}

export function getMaxLoginAttempts(): number {
  return AUTH_MODULE_CONSTANTS.ACCOUNT.MAX_LOGIN_ATTEMPTS;
}

export function getLockDurationInMinutes(): number {
  return AUTH_MODULE_CONSTANTS.ACCOUNT.LOCK_DURATION_MINUTES;
}
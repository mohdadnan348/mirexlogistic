export const AUTH_CONSTANTS = Object.freeze({
  TOKEN: Object.freeze({
    ACCESS: "access",
    REFRESH: "refresh",

    ACCESS_TOKEN_TYPE: "Bearer",

    ACCESS_TOKEN_HEADER: "authorization",

    ACCESS_TOKEN_COOKIE: "accessToken",
    REFRESH_TOKEN_COOKIE: "refreshToken",

    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN: "7d",
  }),

  PASSWORD: Object.freeze({
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,

    BCRYPT_MIN_ROUNDS: 10,
    BCRYPT_RECOMMENDED_ROUNDS: 12,

    RESET_TOKEN_LENGTH: 64,
    RESET_TOKEN_EXPIRES_IN_MINUTES: 30,

    OTP_LENGTH: 6,
    OTP_EXPIRES_IN_MINUTES: 10,

    MAX_LOGIN_ATTEMPTS: 5,
    LOCK_DURATION_MINUTES: 30,
  }),

  SESSION: Object.freeze({
    MAX_ACTIVE_SESSIONS: 5,
    DEFAULT_SESSION_DURATION_DAYS: 7,
  }),

  COOKIE: Object.freeze({
    HTTP_ONLY: true,
    SAME_SITE: "lax" as const,
    SECURE_IN_PRODUCTION: true,

    ACCESS_TOKEN_MAX_AGE_MS: 15 * 60 * 1000,
    REFRESH_TOKEN_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
  }),

  ROLES: Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    MANAGER: "MANAGER",
    SALES: "SALES",
    OPERATIONS: "OPERATIONS",
    DOCUMENTATION: "DOCUMENTATION",
    FINANCE: "FINANCE",
    WAREHOUSE_TRANSPORT: "WAREHOUSE_TRANSPORT",
    VIEWER: "VIEWER",
  }),

  PERMISSIONS: Object.freeze({
    WILDCARD: "*",
    SEPARATOR: ":",

    ACTIONS: Object.freeze({
      CREATE: "create",
      READ: "read",
      UPDATE: "update",
      DELETE: "delete",
      APPROVE: "approve",
      SEND: "send",
      EXPORT: "export",
    }),
  }),

  ACCOUNT_STATUS: Object.freeze({
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended",
    LOCKED: "locked",
    PENDING: "pending",
  }),

  AUTH_EVENTS: Object.freeze({
    LOGIN_SUCCESS: "auth:login:success",
    LOGIN_FAILED: "auth:login:failed",
    LOGOUT: "auth:logout",
    TOKEN_REFRESHED: "auth:token:refreshed",
    PASSWORD_CHANGED: "auth:password:changed",
    PASSWORD_RESET_REQUESTED: "auth:password:reset-requested",
    PASSWORD_RESET: "auth:password:reset",
    ACCOUNT_LOCKED: "auth:account:locked",
    ACCOUNT_UNLOCKED: "auth:account:unlocked",
    OTP_SENT: "auth:otp:sent",
    OTP_VERIFIED: "auth:otp:verified",
  }),

  JWT: Object.freeze({
    ACCESS_TOKEN_SUBJECT: "mirexcargo-access",
    REFRESH_TOKEN_SUBJECT: "mirexcargo-refresh",

    ACCESS_TOKEN_AUDIENCE: "mirexcargo-api",
    REFRESH_TOKEN_AUDIENCE: "mirexcargo-refresh-api",

    ISSUER: "mirexcargo",
  }),

  ERROR_CODES: Object.freeze({
    AUTH_REQUIRED: "AUTH_REQUIRED",
    INVALID_TOKEN: "INVALID_TOKEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",

    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
    ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
    ACCOUNT_LOCKED: "ACCOUNT_LOCKED",

    INVALID_OTP: "INVALID_OTP",
    OTP_EXPIRED: "OTP_EXPIRED",
    OTP_ATTEMPTS_EXCEEDED: "OTP_ATTEMPTS_EXCEEDED",

    PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
    PASSWORD_TOO_LONG: "PASSWORD_TOO_LONG",
    PASSWORD_MISMATCH: "PASSWORD_MISMATCH",
    PASSWORD_RESET_EXPIRED: "PASSWORD_RESET_EXPIRED",

    SESSION_EXPIRED: "SESSION_EXPIRED",
    SESSION_REVOKED: "SESSION_REVOKED",

    FORBIDDEN: "FORBIDDEN",
    INSUFFICIENT_PERMISSION: "INSUFFICIENT_PERMISSION",
  }),
} as const);

export type AuthTokenType =
  (typeof AUTH_CONSTANTS.TOKEN)[keyof typeof AUTH_CONSTANTS.TOKEN];

export type AuthRole =
  (typeof AUTH_CONSTANTS.ROLES)[keyof typeof AUTH_CONSTANTS.ROLES];

export type AccountStatus =
  (typeof AUTH_CONSTANTS.ACCOUNT_STATUS)[keyof typeof AUTH_CONSTANTS.ACCOUNT_STATUS];

export type AuthErrorCode =
  (typeof AUTH_CONSTANTS.ERROR_CODES)[keyof typeof AUTH_CONSTANTS.ERROR_CODES];

export type AuthEvent =
  (typeof AUTH_CONSTANTS.AUTH_EVENTS)[keyof typeof AUTH_CONSTANTS.AUTH_EVENTS];

export type PermissionAction =
  (typeof AUTH_CONSTANTS.PERMISSIONS.ACTIONS)[keyof typeof AUTH_CONSTANTS.PERMISSIONS.ACTIONS];
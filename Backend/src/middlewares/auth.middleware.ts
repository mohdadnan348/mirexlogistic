import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import { isValidObjectId } from "mongoose";

import { UserModel } from "../modules/users/user.model";
import {
  extractBearerToken,
  verifyAccessToken,
  type AccessTokenPayload,
} from "../utils/jwt";

import type {
  AuthenticatedUser,
  AuthContext,
} from "../types/auth.types";

/**
 * JWT payload used by authentication middleware.
 */
interface AuthenticatedJwtPayload
  extends AccessTokenPayload {
  userId?: string;
  roleId?: string;
  branchId?: string;
  dataScope?: string;
  tokenId?: string;
}

/**
 * Minimal user projection required by authentication.
 *
 * This interface intentionally contains only the fields
 * needed by the authentication layer.
 */
interface AuthenticatedUserRecord {
  _id: string;
  email: string;
  phone?: string;
  roleId?: string;
  branchId?: string;
  departmentId?: string;
  dataScope?: string;
  status?: string;
  isLoginEnabled?: boolean;
  isLocked?: boolean;
}

/**
 * Public paths that do not require authentication.
 */
const PUBLIC_PATHS = new Set<string>([
  "/health",
  "/health/",
  "/api/health",
  "/api/health/",
]);

/**
 * Authentication error messages.
 */
const AUTH_ERROR_MESSAGES = {
  MISSING_TOKEN:
    "Authentication token is required.",

  INVALID_TOKEN:
    "Invalid or expired authentication token.",

  USER_NOT_FOUND:
    "Authenticated user was not found.",

  USER_INACTIVE:
    "User account is inactive.",

  USER_SUSPENDED:
    "User account is suspended.",

  USER_LOCKED:
    "User account is locked.",

  LOGIN_DISABLED:
    "User login access is disabled.",
} as const;

/**
 * Normalize unknown value to a non-empty string.
 */
function normalizeString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : undefined;
}

/**
 * Check whether request is a public request.
 */
function isPublicPath(
  request: Request,
): boolean {
  const path =
    request.path ||
    request.originalUrl;

  return PUBLIC_PATHS.has(path);
}

/**
 * Resolve authenticated user ID from JWT payload.
 *
 * Supports both:
 * - userId
 * - sub
 */
function getUserIdFromPayload(
  payload: AuthenticatedJwtPayload,
): string | undefined {
  return (
    normalizeString(
      payload.userId,
    ) ??
    normalizeString(
      payload.sub,
    )
  );
}

/**
 * Resolve token/session ID.
 *
 * Raw JWT is intentionally never stored in AuthContext.
 */
function getTokenIdFromPayload(
  payload: AuthenticatedJwtPayload,
): string | undefined {
  return (
    normalizeString(
      payload.tokenId,
    ) ??
    normalizeString(
      payload.jti,
    )
  );
}

/**
 * Convert database user into the exact
 * AuthenticatedUser contract.
 */
function toAuthenticatedUser(
  user: AuthenticatedUserRecord,
): AuthenticatedUser {
  const id =
    normalizeString(
      user._id,
    );

  if (!id) {
    throw new Error(
      "Authenticated user has no valid identifier.",
    );
  }

  return {
    id,
    email: user.email,
    phone: user.phone,
    roleId: user.roleId,
    branchId: user.branchId,
    departmentId: user.departmentId,
    dataScope: user.dataScope,
    status: user.status,
    isLoginEnabled:
      user.isLoginEnabled,
    isLocked:
      user.isLocked,
  };
}

/**
 * Build the exact AuthContext contract.
 *
 * AuthContext supports:
 * - user
 * - tokenId
 *
 * No raw JWT or extra timestamp is stored here.
 */
function createAuthContext(
  user: AuthenticatedUser,
  payload: AuthenticatedJwtPayload,
): AuthContext {
  return {
    user,
    tokenId:
      getTokenIdFromPayload(
        payload,
      ),
  };
}

/**
 * Send unauthorized response.
 */
function sendUnauthorized(
  response: Response,
  message: string,
): void {
  response.status(401).json({
    success: false,
    message,
    errors: [
      {
        code: "UNAUTHORIZED",
        message,
      },
    ],
  });
}

/**
 * Send forbidden response.
 */
function sendForbidden(
  response: Response,
  message: string,
  code: string,
): void {
  response.status(403).json({
    success: false,
    message,
    errors: [
      {
        code,
        message,
      },
    ],
  });
}

/**
 * Find authenticated user.
 *
 * The latest database state is always checked so that
 * disabled/locked/suspended users cannot continue using
 * an already-issued access token.
 */
async function findAuthenticatedUser(
  userId: string,
): Promise<AuthenticatedUserRecord | null> {
  if (
    !isValidObjectId(userId)
  ) {
    return null;
  }

  const user =
    await UserModel.findById(
      userId,
    )
      .select(
        [
          "_id",
          "email",
          "phone",
          "roleId",
          "branchId",
          "departmentId",
          "dataScope",
          "status",
          "isLoginEnabled",
          "isLocked",
        ].join(" "),
      )
      .lean<AuthenticatedUserRecord | null>();

  return user;
}

/**
 * Validate current account state.
 */
function validateUserAccountState(
  user: AuthenticatedUserRecord,
): {
  allowed: boolean;
  message?: string;
  code?: string;
} {
  const status =
    normalizeString(
      user.status,
    )?.toUpperCase();

  /**
   * Explicit suspended account.
   */
  if (
    status === "SUSPENDED"
  ) {
    return {
      allowed: false,
      message:
        AUTH_ERROR_MESSAGES.USER_SUSPENDED,
      code: "ACCOUNT_SUSPENDED",
    };
  }

  /**
   * Explicit locked account.
   */
  if (
    status === "LOCKED"
  ) {
    return {
      allowed: false,
      message:
        AUTH_ERROR_MESSAGES.USER_LOCKED,
      code: "ACCOUNT_LOCKED",
    };
  }

  /**
   * Any known status other than ACTIVE
   * is treated as inactive.
   */
  if (
    status &&
    status !== "ACTIVE"
  ) {
    return {
      allowed: false,
      message:
        AUTH_ERROR_MESSAGES.USER_INACTIVE,
      code: "ACCOUNT_INACTIVE",
    };
  }

  /**
   * Login can be disabled independently
   * from account status.
   */
  if (
    user.isLoginEnabled === false
  ) {
    return {
      allowed: false,
      message:
        AUTH_ERROR_MESSAGES.LOGIN_DISABLED,
      code: "LOGIN_DISABLED",
    };
  }

  /**
   * Explicit lock flag.
   */
  if (
    user.isLocked === true
  ) {
    return {
      allowed: false,
      message:
        AUTH_ERROR_MESSAGES.USER_LOCKED,
      code: "ACCOUNT_LOCKED",
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Main authentication middleware.
 *
 * Flow:
 *
 * Authorization Header
 *        ↓
 * Bearer Token
 *        ↓
 * JWT Verification
 *        ↓
 * User Lookup
 *        ↓
 * Account Validation
 *        ↓
 * AuthContext
 *        ↓
 * next()
 */
export const authMiddleware: RequestHandler =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      /**
       * Allow configured public paths.
       */
      if (
        isPublicPath(request)
      ) {
        next();
        return;
      }

      /**
       * Authorization header.
       */
      const authorizationHeader =
        request.headers.authorization;

      if (
        !authorizationHeader ||
        authorizationHeader.trim()
          .length === 0
      ) {
        sendUnauthorized(
          response,
          AUTH_ERROR_MESSAGES.MISSING_TOKEN,
        );
        return;
      }

      /**
       * Extract Bearer token.
       */
      const token =
        extractBearerToken(
          authorizationHeader,
        );

      if (!token) {
        sendUnauthorized(
          response,
          AUTH_ERROR_MESSAGES.INVALID_TOKEN,
        );
        return;
      }

      /**
       * Verify access token.
       */
      let payload:
        AuthenticatedJwtPayload;

      try {
        payload =
          verifyAccessToken(
            token,
          ) as AuthenticatedJwtPayload;
      } catch {
        sendUnauthorized(
          response,
          AUTH_ERROR_MESSAGES.INVALID_TOKEN,
        );
        return;
      }

      /**
       * Resolve user ID from token.
       */
      const userId =
        getUserIdFromPayload(
          payload,
        );

      if (!userId) {
        sendUnauthorized(
          response,
          AUTH_ERROR_MESSAGES.INVALID_TOKEN,
        );
        return;
      }

      /**
       * Load latest user state.
       */
      const user =
        await findAuthenticatedUser(
          userId,
        );

      if (!user) {
        sendUnauthorized(
          response,
          AUTH_ERROR_MESSAGES.USER_NOT_FOUND,
        );
        return;
      }

      /**
       * Validate account status.
       */
      const accountState =
        validateUserAccountState(
          user,
        );

      if (
        !accountState.allowed
      ) {
        sendForbidden(
          response,
          accountState.message ??
            AUTH_ERROR_MESSAGES.USER_INACTIVE,
          accountState.code ??
            "ACCOUNT_FORBIDDEN",
        );
        return;
      }

      /**
       * Convert database record
       * to authentication contract.
       */
      const authenticatedUser =
        toAuthenticatedUser(
          user,
        );

      /**
       * Attach authentication context.
       */
      request.auth =
        createAuthContext(
          authenticatedUser,
          payload,
        );

      next();
    } catch {
      /**
       * Do not expose internal authentication
       * implementation/database errors.
       */
      sendUnauthorized(
        response,
        AUTH_ERROR_MESSAGES.INVALID_TOKEN,
      );
    }
  };

/**
 * Alias for authentication middleware.
 */
export const authenticate =
  authMiddleware;

/**
 * Require authentication.
 *
 * If authentication has already been executed,
 * continue directly.
 */
export const requireAuth: RequestHandler =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (
      request.auth?.user?.id
    ) {
      next();
      return;
    }

    await authMiddleware(
      request,
      response,
      next,
    );
  };

/**
 * Optional authentication.
 *
 * Invalid/missing authentication does not reject
 * the request. It simply continues without auth.
 */
export const optionalAuthMiddleware: RequestHandler =
  async (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authorizationHeader =
        request.headers.authorization;

      /**
       * No Authorization header.
       */
      if (
        !authorizationHeader ||
        authorizationHeader.trim()
          .length === 0
      ) {
        next();
        return;
      }

      /**
       * Extract token.
       */
      const token =
        extractBearerToken(
          authorizationHeader,
        );

      if (!token) {
        next();
        return;
      }

      /**
       * Verify token.
       */
      let payload:
        AuthenticatedJwtPayload;

      try {
        payload =
          verifyAccessToken(
            token,
          ) as AuthenticatedJwtPayload;
      } catch {
        next();
        return;
      }

      /**
       * Resolve user ID.
       */
      const userId =
        getUserIdFromPayload(
          payload,
        );

      if (!userId) {
        next();
        return;
      }

      /**
       * Load user.
       */
      const user =
        await findAuthenticatedUser(
          userId,
        );

      if (!user) {
        next();
        return;
      }

      /**
       * Validate account.
       */
      const accountState =
        validateUserAccountState(
          user,
        );

      if (
        !accountState.allowed
      ) {
        next();
        return;
      }

      /**
       * Attach authentication context.
       */
      const authenticatedUser =
        toAuthenticatedUser(
          user,
        );

      request.auth =
        createAuthContext(
          authenticatedUser,
          payload,
        );

      next();
    } catch {
      /**
       * Optional authentication must never
       * break the request.
       */
      next();
    }
  };

/**
 * Alias for optional authentication.
 */
export const optionalAuth =
  optionalAuthMiddleware;

/**
 * Check whether request is authenticated.
 */
export function isAuthenticated(
  request: Request,
): boolean {
  return Boolean(
    request.auth?.user?.id,
  );
}

/**
 * Get authenticated user ID.
 */
export function getAuthenticatedUserId(
  request: Request,
): string | undefined {
  return normalizeString(
    request.auth?.user?.id,
  );
}

/**
 * Get authenticated user.
 *
 * Throws when authentication is missing.
 */
export function getAuthenticatedUser(
  request: Request,
): AuthenticatedUser {
  const user =
    request.auth?.user;

  if (
    !user?.id
  ) {
    throw new Error(
      "Authenticated user is required.",
    );
  }

  return user;
}

/**
 * Get complete authentication context.
 *
 * Throws when authentication is missing.
 */
export function getAuthContext(
  request: Request,
): AuthContext {
  const auth =
    request.auth;

  if (
    !auth?.user?.id
  ) {
    throw new Error(
      "Authentication context is required.",
    );
  }

  return auth;
}

/**
 * Get authentication token/session ID.
 *
 * IMPORTANT:
 * This returns tokenId/jti only.
 * The raw JWT is never exposed through AuthContext.
 */
export function getAuthenticatedTokenId(
  request: Request,
): string | undefined {
  return normalizeString(
    request.auth?.tokenId,
  );
}

export default authMiddleware;
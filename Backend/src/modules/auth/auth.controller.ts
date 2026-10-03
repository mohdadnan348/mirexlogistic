/**
 * MirexCargo
 * Authentication Controller
 *
 * HTTP layer for authentication operations.
 *
 * Flow:
 * Route → Controller → Validator → Service → Repository
 */

import type { NextFunction, Request, Response } from "express";

import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendInternalServerError,
  sendUnprocessableEntity,
} from "../../utils/api-response";

import {
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
  changePasswordValidator,
  passwordResetRequestValidator,
  passwordResetValidator,
  otpRequestValidator,
  otpVerificationValidator,
} from "./auth.validator";

import {
  login,
  refreshAccessToken,
  logout,
  logoutAllSessions,
  changePassword,
  requestPasswordReset,
  resetPassword,
  createOtp,
  verifyOtp,
  getAuthenticatedUser,
  getUserSessions,
  revokeSession,
} from "./auth.service";

import type {
  AuthRequest,
  LoginContext,
  ChangePasswordInput,
} from "./auth.types";

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

function getLoginContext(
  request: Request,
): LoginContext {
  const forwardedFor =
    request.headers["x-forwarded-for"];

  let ipAddress = request.ip;

  if (typeof forwardedFor === "string") {
    ipAddress =
      forwardedFor.split(",")[0]?.trim() ||
      request.ip;
  }

  return {
    ipAddress,
    userAgent:
      request.headers["user-agent"],
    deviceId:
      typeof request.headers["x-device-id"] ===
      "string"
        ? request.headers["x-device-id"]
        : undefined,
  };
}

function getAuthenticatedUserId(
  request: AuthRequest,
): string | null {
  const auth = request.auth;

  if (!auth) {
    return null;
  }

  const rawUser: unknown = auth.user;

  if (
    !rawUser ||
    typeof rawUser !== "object"
  ) {
    return null;
  }

  const user = rawUser as {
    id?: unknown;
    _id?: unknown;
    userId?: unknown;
  };

  const id =
    user.id ??
    user._id ??
    user.userId;

  if (typeof id === "string") {
    return id;
  }

  if (
    id &&
    typeof id === "object" &&
    "toString" in id
  ) {
    return String(id);
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  Login                                     */
/* -------------------------------------------------------------------------- */

export async function loginController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation =
      loginValidator.safeParse(request.body);

    if (!validation.success) {
      sendUnprocessableEntity(
        response,
        "Invalid login request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const result = await login({
      credentials: validation.data,
      context: getLoginContext(request),
    });

    if (!result.success) {
      if (
        result.error?.code ===
        "INVALID_CREDENTIALS"
      ) {
        sendUnauthorized(
          response,
          result.error.message,
        );
        return;
      }

      if (
        result.error?.code ===
          "ACCOUNT_INACTIVE" ||
        result.error?.code ===
          "ACCOUNT_SUSPENDED" ||
        result.error?.code ===
          "ACCOUNT_LOCKED"
      ) {
        sendBadRequest(
          response,
          result.error.message,
        );
        return;
      }

      sendBadRequest(
        response,
        result.error?.message ??
          "Login failed.",
      );
      return;
    }

    sendSuccess(
      response,
      {
        user: result.user,
        tokens: result.tokens,
        session: result.session
          ? {
              sessionId:
                result.session.sessionId,
              expiresAt:
                result.session.expiresAt,
            }
          : undefined,
      },
      "Login successful.",
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                             Refresh Token                                  */
/* -------------------------------------------------------------------------- */

export async function refreshTokenController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body =
      refreshTokenValidator.safeParse(
        request.body,
      );

    if (!body.success) {
      sendUnprocessableEntity(
        response,
        "Invalid refresh token request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const result =
      await refreshAccessToken({
        refreshToken:
          body.data.refreshToken,
        context: getLoginContext(request),
      });

    sendSuccess(
      response,
      result,
      "Access token refreshed successfully.",
    );
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;

      if (
        message === "INVALID_REFRESH_TOKEN" ||
        message === "TOKEN_REVOKED" ||
        message === "REFRESH_TOKEN_EXPIRED"
      ) {
        sendUnauthorized(
          response,
          "Invalid or expired refresh token.",
        );
        return;
      }

      if (
        message === "SESSION_EXPIRED"
      ) {
        sendUnauthorized(
          response,
          "Authentication session has expired.",
        );
        return;
      }
    }

    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Logout                                    */
/* -------------------------------------------------------------------------- */

export async function logoutController(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(request);

    if (!userId) {
      sendUnauthorized(
        response,
        "Authentication required.",
      );
      return;
    }

    const body =
      logoutValidator.safeParse(
        request.body ?? {},
      );

    if (!body.success) {
      sendUnprocessableEntity(
        response,
        "Invalid logout request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const result = await logout(
      userId,
      body.data.sessionId,
      body.data.refreshToken,
    );

    sendSuccess(
      response,
      null,
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Logout All                                    */
/* -------------------------------------------------------------------------- */

export async function logoutAllController(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(request);

    if (!userId) {
      sendUnauthorized(
        response,
        "Authentication required.",
      );
      return;
    }

    const result =
      await logoutAllSessions(userId);

    sendSuccess(
      response,
      null,
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                           Current User                                     */
/* -------------------------------------------------------------------------- */

export async function meController(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(request);

    if (!userId) {
      sendUnauthorized(
        response,
        "Authentication required.",
      );
      return;
    }

    const user =
      await getAuthenticatedUser(userId);

    if (!user) {
      sendNotFound(
        response,
        "User account not found.",
      );
      return;
    }

    sendSuccess(
      response,
      user,
      "Authenticated user retrieved successfully.",
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                           Change Password                                  */
/* -------------------------------------------------------------------------- */

export async function changePasswordController(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(request);

    if (!userId) {
      sendUnauthorized(
        response,
        "Authentication required.",
      );
      return;
    }

    const validation =
      changePasswordValidator.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendUnprocessableEntity(
        response,
        "Invalid password change request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const input: ChangePasswordInput = {
      userId,
      credentials: {
        currentPassword:
          validation.data.currentPassword,
        newPassword:
          validation.data.newPassword,
        confirmPassword:
          validation.data.confirmPassword,
      },
      revokeAllSessions:
        validation.data.revokeAllSessions,
    };

    const result =
      await changePassword(input);

    if (!result.success) {
      if (
        result.error?.code ===
        "INVALID_CREDENTIALS"
      ) {
        sendUnauthorized(
          response,
          result.message,
        );
        return;
      }

      sendBadRequest(
        response,
        result.message,
      );
      return;
    }

    sendSuccess(
      response,
      null,
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                        Password Reset Request                              */
/* -------------------------------------------------------------------------- */

export async function requestPasswordResetController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation =
      passwordResetRequestValidator.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendUnprocessableEntity(
        response,
        "Invalid password reset request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const identifier =
      validation.data.email ??
      validation.data.phone ??
      "";

    const result =
      await requestPasswordReset({
        identifier,
        context: getLoginContext(request),
      });

    /*
     * The service intentionally returns the same
     * message whether or not the account exists.
     */
    sendSuccess(
      response,
      {
        message: result.message,
      },
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                             Reset Password                                 */
/* -------------------------------------------------------------------------- */

export async function resetPasswordController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation =
      passwordResetValidator.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendUnprocessableEntity(
        response,
        "Invalid password reset data.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const result =
      await resetPassword({
        token: validation.data.token,
        newPassword:
          validation.data.newPassword,
        confirmPassword:
          validation.data.confirmPassword,
        context: getLoginContext(request),
      });

    if (!result.success) {
      if (
        result.error?.code ===
        "INVALID_TOKEN"
      ) {
        sendBadRequest(
          response,
          result.message,
        );
        return;
      }

      sendBadRequest(
        response,
        result.message,
      );
      return;
    }

    sendSuccess(
      response,
      null,
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                OTP Send                                    */
/* -------------------------------------------------------------------------- */

export async function sendOtpController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation =
      otpRequestValidator.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendUnprocessableEntity(
        response,
        "Invalid OTP request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const result =
      await createOtp(validation.data);

    sendCreated(
      response,
      {
        expiresAt: result.expiresAt,
      },
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              OTP Verify                                    */
/* -------------------------------------------------------------------------- */

export async function verifyOtpController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation =
      otpVerificationValidator.safeParse(
        request.body,
      );

    if (!validation.success) {
      sendUnprocessableEntity(
        response,
        "Invalid OTP verification request.",
        "VALIDATION_ERROR",
      );
      return;
    }

    const result =
      await verifyOtp(validation.data);

    if (!result.success) {
      if (
        result.error?.code ===
          "OTP_INVALID" ||
        result.error?.code ===
          "OTP_EXPIRED"
      ) {
        sendBadRequest(
          response,
          result.message,
        );
        return;
      }

      sendBadRequest(
        response,
        result.message,
      );
      return;
    }

    sendSuccess(
      response,
      null,
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Sessions                                      */
/* -------------------------------------------------------------------------- */

export async function sessionsController(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(request);

    if (!userId) {
      sendUnauthorized(
        response,
        "Authentication required.",
      );
      return;
    }

    const sessions =
      await getUserSessions(userId);

    sendSuccess(
      response,
      sessions,
      "Sessions retrieved successfully.",
    );
  } catch (error) {
    next(error);
  }
}

export async function revokeSessionController(
  request: AuthRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId =
      getAuthenticatedUserId(request);

    if (!userId) {
      sendUnauthorized(
        response,
        "Authentication required.",
      );
      return;
    }

    const rawSessionId =
      request.params.sessionId;

    const sessionId = Array.isArray(rawSessionId)
      ? rawSessionId[0]
      : rawSessionId;

    if (!sessionId) {
      sendBadRequest(
        response,
        "Session ID is required.",
      );
      return;
    }

    const result =
      await revokeSession(
        userId,
        sessionId,
      );

    if (!result.success) {
      sendNotFound(
        response,
        result.message,
      );
      return;
    }

    sendSuccess(
      response,
      null,
      result.message,
    );
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/*                         Controller Object                                  */
/* -------------------------------------------------------------------------- */

export const authController = Object.freeze({
  login: loginController,
  refreshToken: refreshTokenController,

  logout: logoutController,
  logoutAll: logoutAllController,

  me: meController,

  changePassword:
    changePasswordController,

  requestPasswordReset:
    requestPasswordResetController,

  resetPassword:
    resetPasswordController,

  sendOtp: sendOtpController,
  verifyOtp: verifyOtpController,

  sessions: sessionsController,
  revokeSession:
    revokeSessionController,
});
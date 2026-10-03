import { Router, type RequestHandler } from "express";
import type { ZodType } from "zod";

import {
  loginController,
  refreshTokenController,
  logoutController,
  logoutAllController,
  meController,
  changePasswordController,
  requestPasswordResetController,
  resetPasswordController,
  sendOtpController,
  verifyOtpController,
  sessionsController,
  revokeSessionController,
} from "./auth.controller";

import {
  loginValidator,
  refreshTokenValidator,
  logoutValidator,
  changePasswordValidator,
  passwordResetRequestValidator,
  passwordResetValidator,
  otpRequestValidator,
  otpVerificationValidator,
  sessionIdValidator,
} from "./auth.validator";

import { asyncHandler } from "../../utils/async-handler";

/**
 * Converts a Zod schema into an Express middleware.
 *
 * The dedicated validation middleware is introduced later in the
 * development order. Until then, authentication routes keep their
 * validation adapter local to this module.
 */
function validate<TSchema extends ZodType>(
  schema: TSchema,
): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse({
      ...request.body,
      ...request.params,
      ...request.query,
    });

    if (!result.success) {
      response.status(422).json({
        success: false,
        message: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          issues: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        },
      });

      return;
    }

    /**
     * Keep validated/transformed values available to controllers.
     *
     * Body values are written back to req.body because authentication
     * controllers consume request.body directly.
     */
    if (request.body && typeof request.body === "object") {
      request.body = {
        ...request.body,
        ...(result.data as Record<string, unknown>),
      };
    }

    next();
  };
}

const router = Router();

/**
 * --------------------------------------------------------------------------
 * Public Authentication Routes
 * --------------------------------------------------------------------------
 */

/**
 * Login
 */
router.post(
  "/login",
  validate(loginValidator),
  asyncHandler(loginController),
);

/**
 * Refresh access token
 */
router.post(
  "/refresh",
  validate(refreshTokenValidator),
  asyncHandler(refreshTokenController),
);

/**
 * Request password reset
 */
router.post(
  "/password/forgot",
  validate(passwordResetRequestValidator),
  asyncHandler(requestPasswordResetController),
);

/**
 * Reset password
 */
router.post(
  "/password/reset",
  validate(passwordResetValidator),
  asyncHandler(resetPasswordController),
);

/**
 * Send OTP
 */
router.post(
  "/otp/send",
  validate(otpRequestValidator),
  asyncHandler(sendOtpController),
);

/**
 * Verify OTP
 */
router.post(
  "/otp/verify",
  validate(otpVerificationValidator),
  asyncHandler(verifyOtpController),
);

/**
 * --------------------------------------------------------------------------
 * Authenticated Authentication Routes
 * --------------------------------------------------------------------------
 *
 * Authentication / authorization middleware is introduced later in the
 * development order. These routes therefore remain controller-connected
 * here and will be protected by the global/auth middleware layer.
 */

/**
 * Logout current session
 */
router.post(
  "/logout",
  validate(logoutValidator),
  asyncHandler(logoutController),
);

/**
 * Logout all sessions
 */
router.post(
  "/logout-all",
  asyncHandler(logoutAllController),
);

/**
 * Get currently authenticated user
 */
router.get(
  "/me",
  asyncHandler(meController),
);

/**
 * Change current user's password
 */
router.post(
  "/password/change",
  validate(changePasswordValidator),
  asyncHandler(changePasswordController),
);

/**
 * Get active sessions
 */
router.get(
  "/sessions",
  asyncHandler(sessionsController),
);

/**
 * Revoke a specific session
 */
router.delete(
  "/sessions/:sessionId",
  validate(sessionIdValidator),
  asyncHandler(revokeSessionController),
);

export default router;
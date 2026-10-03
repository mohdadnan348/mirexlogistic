/**
 * MirexCargo
 * Authentication Validators
 *
 * Zod validation schemas for authentication requests.
 */

import { z } from "zod";

import { AUTH_MODULE_CONSTANTS } from "./auth.constants";

/* -------------------------------------------------------------------------- */
/*                              Shared Schemas                                */
/* -------------------------------------------------------------------------- */

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(
    AUTH_MODULE_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH,
    "Email is too long",
  )
  .email("Please provide a valid email address")
  .transform((value) => value.toLowerCase());

const phoneSchema = z
  .string()
  .trim()
  .min(
    AUTH_MODULE_CONSTANTS.VALIDATION.PHONE_MIN_LENGTH,
    "Phone number is too short",
  )
  .max(
    AUTH_MODULE_CONSTANTS.VALIDATION.PHONE_MAX_LENGTH + 1,
    "Phone number is too long",
  )
  .regex(
    /^\+?[0-9]{8,15}$/,
    "Please provide a valid phone number",
  );

const passwordSchema = z
  .string()
  .min(
    AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS.MIN_LENGTH,
    `Password must be at least ${AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
  )
  .max(
    AUTH_MODULE_CONSTANTS.PASSWORD.MAX_LENGTH,
    `Password must not exceed ${AUTH_MODULE_CONSTANTS.PASSWORD.MAX_LENGTH} characters`,
  )
  .refine(
    (value) =>
      !AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
        .REQUIRE_UPPERCASE ||
      /[A-Z]/.test(value),
    "Password must contain at least one uppercase letter",
  )
  .refine(
    (value) =>
      !AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
        .REQUIRE_LOWERCASE ||
      /[a-z]/.test(value),
    "Password must contain at least one lowercase letter",
  )
  .refine(
    (value) =>
      !AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
        .REQUIRE_NUMBER ||
      /[0-9]/.test(value),
    "Password must contain at least one number",
  )
  .refine(
    (value) =>
      !AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
        .REQUIRE_SPECIAL_CHARACTER ||
      /[^A-Za-z0-9]/.test(value),
    "Password must contain at least one special character",
  );

const identifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone number is required")
  .max(
    AUTH_MODULE_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH,
    "Identifier is too long",
  );

const otpSchema = z
  .string()
  .trim()
  .regex(
    new RegExp(
      `^[0-9]{${AUTH_MODULE_CONSTANTS.OTP.LENGTH}}$`,
    ),
    `OTP must be exactly ${AUTH_MODULE_CONSTANTS.OTP.LENGTH} digits`,
  );

/* -------------------------------------------------------------------------- */
/*                              Login Validation                              */
/* -------------------------------------------------------------------------- */

export const loginValidator = z
  .object({
    email: emailSchema.optional(),

    phone: phoneSchema.optional(),

    password: z
      .string()
      .min(1, "Password is required")
      .max(
        AUTH_MODULE_CONSTANTS.PASSWORD.MAX_LENGTH,
        "Password is too long",
      ),

    rememberMe: z.boolean().optional().default(false),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email or phone number is required",
      });
    }

    if (value.email && value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Provide either email or phone number, not both",
      });
    }
  });

export type LoginValidatorInput = z.input<
  typeof loginValidator
>;

export type LoginValidatorOutput = z.output<
  typeof loginValidator
>;

/* -------------------------------------------------------------------------- */
/*                         Refresh Token Validation                           */
/* -------------------------------------------------------------------------- */

export const refreshTokenValidator = z.object({
  refreshToken: z
    .string()
    .trim()
    .min(1, "Refresh token is required"),
});

export type RefreshTokenValidatorInput = z.infer<
  typeof refreshTokenValidator
>;

/* -------------------------------------------------------------------------- */
/*                             Logout Validation                              */
/* -------------------------------------------------------------------------- */

export const logoutValidator = z.object({
  refreshToken: z
    .string()
    .trim()
    .optional(),

  sessionId: z
    .string()
    .trim()
    .min(1, "Session ID cannot be empty")
    .optional(),
});

export type LogoutValidatorInput = z.infer<
  typeof logoutValidator
>;

/* -------------------------------------------------------------------------- */
/*                         Change Password Validation                         */
/* -------------------------------------------------------------------------- */

export const changePasswordValidator = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Password confirmation is required"),

    revokeAllSessions: z
      .boolean()
      .optional()
      .default(false),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }

    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from current password",
      });
    }
  });

export type ChangePasswordValidatorInput = z.infer<
  typeof changePasswordValidator
>;

/* -------------------------------------------------------------------------- */
/*                      Password Reset Request Validation                    */
/* -------------------------------------------------------------------------- */

export const passwordResetRequestValidator = z
  .object({
    email: emailSchema.optional(),

    phone: phoneSchema.optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email or phone number is required",
      });
    }

    if (value.email && value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Provide either email or phone number, not both",
      });
    }
  });

export type PasswordResetRequestValidatorInput =
  z.infer<typeof passwordResetRequestValidator>;

/* -------------------------------------------------------------------------- */
/*                         Password Reset Validation                          */
/* -------------------------------------------------------------------------- */

export const passwordResetValidator = z
  .object({
    token: z
      .string()
      .trim()
      .min(
        AUTH_MODULE_CONSTANTS.VALIDATION.RESET_TOKEN_MIN_LENGTH,
        "Invalid password reset token",
      ),

    newPassword: passwordSchema,

    confirmPassword: z
      .string()
      .min(1, "Password confirmation is required"),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type PasswordResetValidatorInput = z.infer<
  typeof passwordResetValidator
>;

/* -------------------------------------------------------------------------- */
/*                              OTP Validation                                */
/* -------------------------------------------------------------------------- */

export const otpRequestValidator = z
  .object({
    purpose: z.enum([
      AUTH_MODULE_CONSTANTS.OTP.PURPOSES.LOGIN,
      AUTH_MODULE_CONSTANTS.OTP.PURPOSES.PHONE_VERIFICATION,
      AUTH_MODULE_CONSTANTS.OTP.PURPOSES.EMAIL_VERIFICATION,
      AUTH_MODULE_CONSTANTS.OTP.PURPOSES.PASSWORD_RESET,
      AUTH_MODULE_CONSTANTS.OTP.PURPOSES.TRANSACTION,
    ]),

    email: emailSchema.optional(),

    phone: phoneSchema.optional(),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email or phone number is required",
      });
    }

    if (value.email && value.phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Provide either email or phone number, not both",
      });
    }
  });

export type OtpRequestValidatorInput = z.infer<
  typeof otpRequestValidator
>;

export const otpVerificationValidator = z.object({
  purpose: z.enum([
    AUTH_MODULE_CONSTANTS.OTP.PURPOSES.LOGIN,
    AUTH_MODULE_CONSTANTS.OTP.PURPOSES.PHONE_VERIFICATION,
    AUTH_MODULE_CONSTANTS.OTP.PURPOSES.EMAIL_VERIFICATION,
    AUTH_MODULE_CONSTANTS.OTP.PURPOSES.PASSWORD_RESET,
    AUTH_MODULE_CONSTANTS.OTP.PURPOSES.TRANSACTION,
  ]),

  identifier: identifierSchema,

  otp: otpSchema,
});

export type OtpVerificationValidatorInput = z.infer<
  typeof otpVerificationValidator
>;

/* -------------------------------------------------------------------------- */
/*                         Email Verification                                 */
/* -------------------------------------------------------------------------- */

export const verifyEmailValidator = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Email verification token is required"),
});

export type VerifyEmailValidatorInput = z.infer<
  typeof verifyEmailValidator
>;

/* -------------------------------------------------------------------------- */
/*                         Phone Verification                                 */
/* -------------------------------------------------------------------------- */

export const verifyPhoneValidator = z.object({
  otp: otpSchema,
});

export type VerifyPhoneValidatorInput = z.infer<
  typeof verifyPhoneValidator
>;

/* -------------------------------------------------------------------------- */
/*                       Resend Verification                                  */
/* -------------------------------------------------------------------------- */

export const resendVerificationValidator = z.object({
  channel: z.enum(["email", "phone"]),
});

export type ResendVerificationValidatorInput = z.infer<
  typeof resendVerificationValidator
>;

/* -------------------------------------------------------------------------- */
/*                            Session Validation                              */
/* -------------------------------------------------------------------------- */

export const sessionIdValidator = z.object({
  sessionId: z
    .string()
    .trim()
    .min(1, "Session ID is required"),
});

export type SessionIdValidatorInput = z.infer<
  typeof sessionIdValidator
>;

/* -------------------------------------------------------------------------- */
/*                          Authorization Validation                          */
/* -------------------------------------------------------------------------- */

export const permissionCheckValidator = z.object({
  permission: z
    .string()
    .trim()
    .min(1, "Permission is required")
    .max(200, "Permission is too long"),

  branchId: z
    .string()
    .trim()
    .min(1, "Branch ID cannot be empty")
    .optional(),
});

export type PermissionCheckValidatorInput = z.infer<
  typeof permissionCheckValidator
>;

/* -------------------------------------------------------------------------- */
/*                              Utility Schemas                               */
/* -------------------------------------------------------------------------- */

export const emailOnlyValidator = z.object({
  email: emailSchema,
});

export const phoneOnlyValidator = z.object({
  phone: phoneSchema,
});

export const identifierValidator = z.object({
  identifier: identifierSchema,
});

export const tokenValidator = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Token is required"),
});

/* -------------------------------------------------------------------------- */
/*                          Validation Helpers                                */
/* -------------------------------------------------------------------------- */

export function validateLogin(
  input: unknown,
): LoginValidatorOutput {
  return loginValidator.parse(input);
}

export function validateRefreshToken(
  input: unknown,
): RefreshTokenValidatorInput {
  return refreshTokenValidator.parse(input);
}

export function validateLogout(
  input: unknown,
): LogoutValidatorInput {
  return logoutValidator.parse(input);
}

export function validateChangePassword(
  input: unknown,
): ChangePasswordValidatorInput {
  return changePasswordValidator.parse(input);
}

export function validatePasswordResetRequest(
  input: unknown,
): PasswordResetRequestValidatorInput {
  return passwordResetRequestValidator.parse(input);
}

export function validatePasswordReset(
  input: unknown,
): PasswordResetValidatorInput {
  return passwordResetValidator.parse(input);
}

export function validateOtpRequest(
  input: unknown,
): OtpRequestValidatorInput {
  return otpRequestValidator.parse(input);
}

export function validateOtpVerification(
  input: unknown,
): OtpVerificationValidatorInput {
  return otpVerificationValidator.parse(input);
}

export function validateEmailVerification(
  input: unknown,
): VerifyEmailValidatorInput {
  return verifyEmailValidator.parse(input);
}

export function validatePhoneVerification(
  input: unknown,
): VerifyPhoneValidatorInput {
  return verifyPhoneValidator.parse(input);
}

/* -------------------------------------------------------------------------- */
/*                        Safe Validation Helpers                             */
/* -------------------------------------------------------------------------- */

export function safeValidateLogin(input: unknown) {
  return loginValidator.safeParse(input);
}

export function safeValidateRefreshToken(input: unknown) {
  return refreshTokenValidator.safeParse(input);
}

export function safeValidateLogout(input: unknown) {
  return logoutValidator.safeParse(input);
}

export function safeValidateChangePassword(input: unknown) {
  return changePasswordValidator.safeParse(input);
}

export function safeValidatePasswordResetRequest(
  input: unknown,
) {
  return passwordResetRequestValidator.safeParse(input);
}

export function safeValidatePasswordReset(input: unknown) {
  return passwordResetValidator.safeParse(input);
}

export function safeValidateOtpRequest(input: unknown) {
  return otpRequestValidator.safeParse(input);
}

export function safeValidateOtpVerification(input: unknown) {
  return otpVerificationValidator.safeParse(input);
}

/* -------------------------------------------------------------------------- */
/*                         Password Validation                                */
/* -------------------------------------------------------------------------- */

export function validatePasswordStrength(
  password: string,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    password.length <
    AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS.MIN_LENGTH
  ) {
    errors.push(
      `Password must be at least ${AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
    );
  }

  if (password.length > AUTH_MODULE_CONSTANTS.PASSWORD.MAX_LENGTH) {
    errors.push(
      `Password must not exceed ${AUTH_MODULE_CONSTANTS.PASSWORD.MAX_LENGTH} characters`,
    );
  }

  if (
    AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
      .REQUIRE_UPPERCASE &&
    !/[A-Z]/.test(password)
  ) {
    errors.push(
      "Password must contain at least one uppercase letter",
    );
  }

  if (
    AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
      .REQUIRE_LOWERCASE &&
    !/[a-z]/.test(password)
  ) {
    errors.push(
      "Password must contain at least one lowercase letter",
    );
  }

  if (
    AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
      .REQUIRE_NUMBER &&
    !/[0-9]/.test(password)
  ) {
    errors.push(
      "Password must contain at least one number",
    );
  }

  if (
    AUTH_MODULE_CONSTANTS.VALIDATION.PASSWORD_REQUIREMENTS
      .REQUIRE_SPECIAL_CHARACTER &&
    !/[^A-Za-z0-9]/.test(password)
  ) {
    errors.push(
      "Password must contain at least one special character",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Exports                                      */
/* -------------------------------------------------------------------------- */

export const authValidators = Object.freeze({
  login: loginValidator,
  refreshToken: refreshTokenValidator,
  logout: logoutValidator,

  changePassword: changePasswordValidator,

  passwordResetRequest:
    passwordResetRequestValidator,

  passwordReset: passwordResetValidator,

  otpRequest: otpRequestValidator,
  otpVerification: otpVerificationValidator,

  verifyEmail: verifyEmailValidator,
  verifyPhone: verifyPhoneValidator,

  resendVerification:
    resendVerificationValidator,

  sessionId: sessionIdValidator,
  permissionCheck: permissionCheckValidator,

  emailOnly: emailOnlyValidator,
  phoneOnly: phoneOnlyValidator,
  identifier: identifierValidator,
  token: tokenValidator,
});
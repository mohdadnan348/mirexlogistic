/**
 * MirexCargo
 * Authentication Service
 *
 * Business logic for:
 * - Login
 * - Logout
 * - Access/refresh tokens
 * - Password change
 * - Password reset
 * - OTP
 * - Email/phone verification
 * - Sessions
 */

import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import { ENV } from "../../config/env";
import {
  AUTH_MODULE_CONSTANTS,
  type AuthRole,
} from "./auth.constants";

import { authRepository } from "./auth.repository";

import type {
  AuthUser,
  AuthenticationResult,
  AuthOperationResult,
  LoginContext,
  LoginInput,
  RefreshTokenInput,
  RefreshTokenResponse,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  OtpRequest,
  OtpVerificationRequest,
  AuthTokenPair,
  AuthSession,
} from "./auth.types";

import {
  comparePassword,
  hashPassword,
  generateRandomPassword,
  generateOtp,
} from "../../utils/password";

import {
  hashPublicToken,
} from "../../utils/public-token";

import {
  logAudit,
  logSecurity,
} from "../../utils/logger";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

interface JwtAccessPayload {
  sub: string;
  email: string;
  role: AuthRole;
  branchId?: string;
  sessionId: string;
  type: "access";
}

interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
  type: "refresh";
}

interface PasswordResetResult extends AuthOperationResult {
  token?: string;
}

interface OtpResult extends AuthOperationResult {
  expiresAt?: Date;
}

interface SessionResult extends AuthOperationResult {
  session?: AuthSession;
}

/* -------------------------------------------------------------------------- */
/*                              Configuration                                 */
/* -------------------------------------------------------------------------- */

const ACCESS_TOKEN_EXPIRES_IN =
  ENV.JWT_ACCESS_EXPIRES_IN;

const REFRESH_TOKEN_EXPIRES_IN =
  ENV.JWT_REFRESH_EXPIRES_IN;

const MAX_LOGIN_ATTEMPTS =
  AUTH_MODULE_CONSTANTS.ACCOUNT.MAX_LOGIN_ATTEMPTS;

const LOCK_DURATION_MINUTES =
  AUTH_MODULE_CONSTANTS.ACCOUNT.LOCK_DURATION_MINUTES;

const OTP_EXPIRY_MINUTES =
  AUTH_MODULE_CONSTANTS.OTP.EXPIRY_MINUTES;

const MAX_OTP_ATTEMPTS =
  AUTH_MODULE_CONSTANTS.OTP.MAX_ATTEMPTS;

/* -------------------------------------------------------------------------- */
/*                              Helper Functions                              */
/* -------------------------------------------------------------------------- */

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/[^\d+]/g, "");
}

function getIpAddress(
  context?: LoginContext,
): string | undefined {
  return context?.ipAddress?.trim() || undefined;
}

function getUserAgent(
  context?: LoginContext,
): string | undefined {
  return context?.userAgent?.trim() || undefined;
}

function createSessionId(): string {
  return `sess_${crypto.randomBytes(18).toString("hex")}`;
}

function createTokenHash(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createSecureToken(byteLength = 48): string {
  return crypto
    .randomBytes(byteLength)
    .toString("hex");
}

function parseExpiryToDate(
  expiresIn: string,
): Date {
  const match = expiresIn
    .trim()
    .match(/^(\d+)\s*(s|m|h|d)$/i);

  if (!match) {
    return new Date(
      Date.now() + 15 * 60 * 1000,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(
    Date.now() +
      amount * multipliers[unit],
  );
}

function createAccessToken(
  user: {
    _id: { toString(): string };
    email: string;
    role: AuthRole;
    branchId?: { toString(): string };
  },
  sessionId: string,
): string {
  const payload: JwtAccessPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    sessionId,
    type: "access",
  };

  if (user.branchId) {
    payload.branchId =
      user.branchId.toString();
  }

  return jwt.sign(
    payload,
    ENV.JWT_SECRET,
    {
      expiresIn:
        ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );
}

function createRefreshToken(
  userId: string,
  sessionId: string,
  tokenVersion: number,
): string {
  const payload: JwtRefreshPayload = {
    sub: userId,
    sessionId,
    tokenVersion,
    type: "refresh",
  };

  return jwt.sign(
    payload,
    ENV.JWT_REFRESH_SECRET,
    {
      expiresIn:
        REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );
}

function verifyRefreshToken(
  token: string,
): JwtRefreshPayload | null {
  try {
    const payload = jwt.verify(
      token,
      ENV.JWT_REFRESH_SECRET,
    ) as JwtRefreshPayload;

    if (
      payload.type !== "refresh" ||
      typeof payload.sub !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.tokenVersion !== "number"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildTokenPair(
  user: {
    _id: { toString(): string };
    email: string;
    role: AuthRole;
    branchId?: { toString(): string };
    tokenVersion: number;
  },
  sessionId: string,
): AuthTokenPair {
  const accessToken =
    createAccessToken(
      user,
      sessionId,
    );

  const refreshToken =
    createRefreshToken(
      user._id.toString(),
      sessionId,
      user.tokenVersion,
    );

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt:
      parseExpiryToDate(
        ACCESS_TOKEN_EXPIRES_IN,
      ),
    refreshTokenExpiresAt:
      parseExpiryToDate(
        REFRESH_TOKEN_EXPIRES_IN,
      ),
  };
}

function toAuthUser(user: {
  _id: { toString(): string };
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: AuthRole;
  branchId?: { toString(): string };
  departmentId?: { toString(): string };
  status: AuthUser["status"];
}): AuthUser {
  const result: AuthUser = {
    userId: user._id.toString(),
    email: user.email,
    phone: user.phone,
    name:
      `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    status: user.status,
  };

  if (user.branchId) {
    result.branchId =
      user.branchId.toString();
  }

  if (user.departmentId) {
    result.departmentId =
      user.departmentId.toString();
  }

  return result;
}

function toAuthSession(
  session: {
    sessionId: string;
    userId: { toString(): string };
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
    refreshTokenHash?: string;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    revokedAt?: Date;
    isRevoked: boolean;
  },
): AuthSession {
  const result: AuthSession = {
    sessionId: session.sessionId,
    userId: session.userId.toString(),
    deviceId: session.deviceId,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    isRevoked: session.isRevoked,
  };

  if (session.refreshTokenHash) {
    result.refreshTokenHash =
      session.refreshTokenHash;
  }

  return result;
}

function timingSafeStringEqual(
  first: string,
  second: string,
): boolean {
  const firstBuffer =
    Buffer.from(first, "utf8");

  const secondBuffer =
    Buffer.from(second, "utf8");

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    firstBuffer,
    secondBuffer,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Login                                     */
/* -------------------------------------------------------------------------- */

export async function login(
  input: LoginInput,
): Promise<AuthenticationResult> {
  const {
    credentials,
    context,
  } = input;

  const identifier =
    credentials.email
      ? normalizeEmail(credentials.email)
      : normalizePhone(
          credentials.phone ?? "",
        );

  const user =
    await authRepository.findUserByEmailOrPhone(
      identifier,
      {
        includePassword: true,
      },
    );

  if (!user) {
    await logSecurity(
      "Authentication failed",
      {
        action:
          AUTH_MODULE_CONSTANTS.EVENTS
            .LOGIN_FAILED,
        identifier,
        ipAddress:
          getIpAddress(context),
        userAgent:
          getUserAgent(context),
        reason:
          AUTH_MODULE_CONSTANTS.ERRORS
            .INVALID_CREDENTIALS,
      },
    );

    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message:
          "Invalid email/phone or password.",
        statusCode: 401,
      },
    };
  }

  if (user.isDeleted) {
    return {
      success: false,
      error: {
        code: "ACCOUNT_NOT_FOUND",
        message:
          "Account not found.",
        statusCode: 404,
      },
    };
  }

  if (user.isAccountLocked()) {
    return {
      success: false,
      error: {
        code: "ACCOUNT_LOCKED",
        message:
          "Your account is temporarily locked.",
        statusCode: 423,
      },
    };
  }

  if (!user.canLogin()) {
    const isSuspended =
      user.status ===
      AUTH_MODULE_CONSTANTS.ACCOUNT
        .STATUS.SUSPENDED;

    return {
      success: false,
      error: {
        code: isSuspended
          ? "ACCOUNT_SUSPENDED"
          : "ACCOUNT_INACTIVE",
        message: isSuspended
          ? "Your account has been suspended."
          : "Your account is not active.",
        statusCode: 403,
      },
    };
  }

  const passwordMatches =
    await comparePassword(
      credentials.password,
      user.password,
    );

  if (!passwordMatches) {
    const updatedUser =
      await authRepository
        .incrementFailedLoginAttempts(
          user._id,
        );

    if (
      updatedUser &&
      updatedUser.failedLoginAttempts >=
        MAX_LOGIN_ATTEMPTS
    ) {
      const lockedUntil =
        new Date(
          Date.now() +
            LOCK_DURATION_MINUTES *
              60 *
              1000,
        );

      await authRepository.lockUserAccount(
        user._id,
        lockedUntil,
      );

      await logSecurity(
        "Authentication account locked",
        {
          action:
            AUTH_MODULE_CONSTANTS.EVENTS
              .ACCOUNT_LOCKED,
          userId:
            user._id.toString(),
          identifier,
          ipAddress:
            getIpAddress(context),
          reason:
            AUTH_MODULE_CONSTANTS.ERRORS
              .TOO_MANY_LOGIN_ATTEMPTS,
        },
      );

      return {
        success: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message:
            "Too many failed login attempts. Your account has been temporarily locked.",
          statusCode: 423,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message:
          "Invalid email/phone or password.",
        statusCode: 401,
      },
    };
  }

  await authRepository
    .resetFailedLoginAttempts(
      user._id,
    );

  const sessionId =
    createSessionId();

  const tokens =
    buildTokenPair(
      user,
      sessionId,
    );

  const session =
    await authRepository
      .createSessionWithId({
        userId:
          user._id.toString(),
        sessionId,
        refreshTokenHash:
          createTokenHash(
            tokens.refreshToken,
          ),
        deviceId:
          context?.deviceId,
        userAgent:
          context?.userAgent,
        ipAddress:
          context?.ipAddress,
        expiresAt:
          tokens.refreshTokenExpiresAt,
      });

  await authRepository
    .updateUserLoginState(
      user._id,
      {
        lastLoginAt:
          new Date(),
        lastLoginIp:
          getIpAddress(context),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    );

  await logAudit(
    "User login successful",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .LOGIN_SUCCESS,
      userId:
        user._id.toString(),
      sessionId,
      ipAddress:
        getIpAddress(context),
      userAgent:
        getUserAgent(context),
      success: true,
    },
  );

  return {
    success: true,
    user: toAuthUser(user),
    tokens,
    session:
      toAuthSession(session),
  };
}

/* -------------------------------------------------------------------------- */
/*                             Refresh Token                                  */
/* -------------------------------------------------------------------------- */

export async function refreshAccessToken(
  input: RefreshTokenInput,
): Promise<RefreshTokenResponse> {
  const payload =
    verifyRefreshToken(
      input.refreshToken,
    );

  if (!payload) {
    throw new Error(
      AUTH_MODULE_CONSTANTS.ERRORS
        .INVALID_REFRESH_TOKEN,
    );
  }

  const session =
    await authRepository
      .findActiveSessionById(
        payload.sessionId,
      );

  if (!session) {
    throw new Error(
      AUTH_MODULE_CONSTANTS.ERRORS
        .SESSION_EXPIRED,
    );
  }

  const storedHash =
    session.refreshTokenHash;

  if (!storedHash) {
    await authRepository
      .revokeSession(
        payload.sessionId,
      );

    throw new Error(
      AUTH_MODULE_CONSTANTS.ERRORS
        .INVALID_REFRESH_TOKEN,
    );
  }

  const incomingHash =
    createTokenHash(
      input.refreshToken,
    );

  if (
    !timingSafeStringEqual(
      storedHash,
      incomingHash,
    )
  ) {
    await authRepository
      .revokeSession(
        payload.sessionId,
      );

    throw new Error(
      AUTH_MODULE_CONSTANTS.ERRORS
        .INVALID_REFRESH_TOKEN,
    );
  }

  const user =
    await authRepository.findUserById(
      payload.sub,
    );

  if (
    !user ||
    !user.canLogin()
  ) {
    throw new Error(
      AUTH_MODULE_CONSTANTS.ERRORS
        .UNAUTHORIZED,
    );
  }

  if (
    user.tokenVersion !==
    payload.tokenVersion
  ) {
    await authRepository
      .revokeSession(
        payload.sessionId,
      );

    throw new Error(
      AUTH_MODULE_CONSTANTS.ERRORS
        .INVALID_REFRESH_TOKEN,
    );
  }

  const tokens =
    buildTokenPair(
      user,
      payload.sessionId,
    );

  await authRepository
    .updateSessionRefreshToken(
      payload.sessionId,
      createTokenHash(
        tokens.refreshToken,
      ),
      tokens.refreshTokenExpiresAt,
    );

  await authRepository
    .updateSessionLastUsed(
      payload.sessionId,
    );

  return {
    accessToken:
      tokens.accessToken,
    refreshToken:
      tokens.refreshToken,
    accessTokenExpiresAt:
      tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt:
      tokens.refreshTokenExpiresAt,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Logout                                    */
/* -------------------------------------------------------------------------- */

export async function logout(
  userId: string,
  sessionId?: string,
  refreshToken?: string,
): Promise<AuthOperationResult> {
  let targetSessionId =
    sessionId;

  if (
    !targetSessionId &&
    refreshToken
  ) {
    const payload =
      verifyRefreshToken(
        refreshToken,
      );

    targetSessionId =
      payload?.sessionId;
  }

  if (targetSessionId) {
    await authRepository
      .revokeUserSession(
        userId,
        targetSessionId,
      );
  }

  await logAudit(
    "User logout",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .LOGOUT,
      userId,
      sessionId:
        targetSessionId,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS.MESSAGES
        .LOGOUT_SUCCESS,
  };
}

export async function logoutAllSessions(
  userId: string,
): Promise<AuthOperationResult> {
  await authRepository
    .revokeAllUserSessions(
      userId,
    );

  await authRepository
    .incrementTokenVersion(
      userId,
    );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS.MESSAGES
        .ALL_SESSIONS_REVOKED,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Change Password                                 */
/* -------------------------------------------------------------------------- */

export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthOperationResult> {
  const user =
    await authRepository.findUserById(
      input.userId,
      {
        includePassword: true,
      },
    );

  if (!user) {
    return {
      success: false,
      message:
        "Account not found.",
      error: {
        code:
          "ACCOUNT_NOT_FOUND",
        message:
          "Account not found.",
        statusCode: 404,
      },
    };
  }

  const currentMatches =
    await comparePassword(
      input.credentials
        .currentPassword,
      user.password,
    );

  if (!currentMatches) {
    return {
      success: false,
      message:
        "Current password is incorrect.",
      error: {
        code:
          "INVALID_CREDENTIALS",
        message:
          "Current password is incorrect.",
        statusCode: 401,
      },
    };
  }

  if (
    input.credentials
      .newPassword !==
    input.credentials
      .confirmPassword
  ) {
    return {
      success: false,
      message:
        "Passwords do not match.",
      error: {
        code:
          "PASSWORD_MISMATCH",
        message:
          "Passwords do not match.",
        statusCode: 422,
      },
    };
  }

  const passwordHash =
    await hashPassword(
      input.credentials
        .newPassword,
    );

  await authRepository
    .updatePassword(
      input.userId,
      passwordHash,
    );

  await authRepository
    .invalidateUserPasswordResetTokens(
      input.userId,
    );

  if (
    input.revokeAllSessions !==
    false
  ) {
    await authRepository
      .revokeAllUserSessions(
        input.userId,
      );
  }

  await logAudit(
    "Password changed",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .PASSWORD_CHANGED,
      userId:
        input.userId,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS.MESSAGES
        .PASSWORD_CHANGED,
  };
}

/* -------------------------------------------------------------------------- */
/*                         Password Reset Request                             */
/* -------------------------------------------------------------------------- */

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<PasswordResetResult> {
  const identifier =
    input.identifier
      .trim()
      .toLowerCase();

  const user =
    await authRepository
      .findUserByEmailOrPhone(
        identifier,
      );

  /*
   * Do not reveal whether an
   * account exists.
   */
  if (!user) {
    return {
      success: true,
      message:
        AUTH_MODULE_CONSTANTS
          .MESSAGES
          .PASSWORD_RESET_REQUESTED,
    };
  }

  const rawToken =
    createSecureToken(48);

  const tokenHash =
    hashPublicToken(
      rawToken,
    );

  const expiresAt =
    new Date(
      Date.now() +
        AUTH_MODULE_CONSTANTS
          .PASSWORD
          .RESET_TOKEN_EXPIRY_MINUTES *
          60 *
          1000,
    );

  await authRepository
    .invalidateUserPasswordResetTokens(
      user._id,
    );

  await authRepository
    .createPasswordResetToken({
      userId:
        user._id,
      tokenHash,
      expiresAt,
    });

  await logAudit(
    "Password reset requested",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .PASSWORD_RESET_REQUESTED,
      userId:
        user._id.toString(),
      ipAddress:
        input.context?.ipAddress,
      userAgent:
        input.context?.userAgent,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .PASSWORD_RESET_REQUESTED,
    token: rawToken,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Reset Password                                */
/* -------------------------------------------------------------------------- */

export async function resetPassword(
  input: ResetPasswordInput,
): Promise<AuthOperationResult> {
  if (
    input.newPassword !==
    input.confirmPassword
  ) {
    return {
      success: false,
      message:
        "Passwords do not match.",
      error: {
        code:
          "PASSWORD_MISMATCH",
        message:
          "Passwords do not match.",
        statusCode: 422,
      },
    };
  }

  const tokenHash =
    hashPublicToken(
      input.token,
    );

  const resetToken =
    await authRepository
      .findPasswordResetToken(
        tokenHash,
      );

  if (!resetToken) {
    return {
      success: false,
      message:
        "Password reset token is invalid or expired.",
      error: {
        code:
          "INVALID_TOKEN",
        message:
          "Password reset token is invalid or expired.",
        statusCode: 400,
      },
    };
  }

  const passwordHash =
    await hashPassword(
      input.newPassword,
    );

  const user =
    await authRepository
      .updatePassword(
        resetToken.userId,
        passwordHash,
      );

  if (!user) {
    return {
      success: false,
      message:
        "Account not found.",
      error: {
        code:
          "ACCOUNT_NOT_FOUND",
        message:
          "Account not found.",
        statusCode: 404,
      },
    };
  }

  await authRepository
    .markPasswordResetTokenUsed(
      resetToken._id,
    );

  await authRepository
    .invalidateUserPasswordResetTokens(
      user._id,
    );

  await authRepository
    .revokeAllUserSessions(
      user._id,
    );

  await logAudit(
    "Password reset completed",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .PASSWORD_RESET,
      userId:
        user._id.toString(),
      ipAddress:
        input.context?.ipAddress,
      userAgent:
        input.context?.userAgent,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .PASSWORD_RESET_SUCCESS,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  OTP                                       */
/* -------------------------------------------------------------------------- */

export async function createOtp(
  input: OtpRequest,
): Promise<OtpResult> {
  const identifier =
    input.email
      ? normalizeEmail(input.email)
      : normalizePhone(
          input.phone ?? "",
        );

  const user =
    await authRepository
      .findUserByEmailOrPhone(
        identifier,
      );

  const otp =
    generateOtp(
      AUTH_MODULE_CONSTANTS.OTP.LENGTH,
    );

  const codeHash =
    await hashPassword(
      otp,
    );

  const expiresAt =
    new Date(
      Date.now() +
        OTP_EXPIRY_MINUTES *
          60 *
          1000,
    );

  await authRepository
    .deleteOtps(
      identifier,
      input.purpose,
    );

  await authRepository
    .createOtp({
      userId:
        user?._id,
      identifier,
      purpose:
        input.purpose,
      codeHash,
      expiresAt,
      maxAttempts:
        MAX_OTP_ATTEMPTS,
    });

  await logSecurity(
    "Authentication OTP generated",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .OTP_SENT,
      userId:
        user?._id?.toString(),
      identifier,
      purpose:
        input.purpose,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .OTP_SENT,
    expiresAt,
  };
}

export async function verifyOtp(
  input: OtpVerificationRequest,
): Promise<OtpResult> {
  const identifier =
    input.identifier
      .trim()
      .toLowerCase();

  const otpRecord =
    await authRepository
      .findLatestOtp(
        identifier,
        input.purpose,
      );

  if (!otpRecord) {
    return {
      success: false,
      message:
        "OTP is invalid or expired.",
      error: {
        code:
          "OTP_EXPIRED",
        message:
          "OTP is invalid or expired.",
        statusCode: 400,
      },
    };
  }

  if (
    otpRecord.attempts >=
    otpRecord.maxAttempts
  ) {
    return {
      success: false,
      message:
        "Maximum OTP verification attempts exceeded.",
      error: {
        code:
          "OTP_MAX_ATTEMPTS",
        message:
          "Maximum OTP verification attempts exceeded.",
        statusCode: 429,
      },
    };
  }

  const matches =
    await comparePassword(
      input.otp,
      otpRecord.codeHash,
    );

  if (!matches) {
    await authRepository
      .incrementOtpAttempts(
        otpRecord._id,
      );

    return {
      success: false,
      message:
        "Invalid OTP.",
      error: {
        code:
          "OTP_INVALID",
        message:
          "Invalid OTP.",
        statusCode: 400,
      },
    };
  }

  await authRepository
    .markOtpVerified(
      otpRecord._id,
    );

  if (otpRecord.userId) {
    if (
      input.purpose ===
      AUTH_MODULE_CONSTANTS.OTP
        .PURPOSES
        .EMAIL_VERIFICATION
    ) {
      await authRepository
        .markEmailVerified(
          otpRecord.userId,
        );
    }

    if (
      input.purpose ===
      AUTH_MODULE_CONSTANTS.OTP
        .PURPOSES
        .PHONE_VERIFICATION
    ) {
      await authRepository
        .markPhoneVerified(
          otpRecord.userId,
        );
    }
  }

  await logAudit(
    "OTP verified",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .OTP_VERIFIED,
      userId:
        otpRecord.userId?.toString(),
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .OTP_VERIFIED,
  };
}

/* -------------------------------------------------------------------------- */
/*                           Email Verification                               */
/* -------------------------------------------------------------------------- */

export async function verifyEmail(
  userId: string,
): Promise<AuthOperationResult> {
  const user =
    await authRepository
      .markEmailVerified(
        userId,
      );

  if (!user) {
    return {
      success: false,
      message:
        "Account not found.",
      error: {
        code:
          "ACCOUNT_NOT_FOUND",
        message:
          "Account not found.",
        statusCode: 404,
      },
    };
  }

  await logAudit(
    "Email verified",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .EMAIL_VERIFIED,
      userId,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .EMAIL_VERIFIED,
  };
}

/* -------------------------------------------------------------------------- */
/*                           Phone Verification                               */
/* -------------------------------------------------------------------------- */

export async function verifyPhone(
  userId: string,
): Promise<AuthOperationResult> {
  const user =
    await authRepository
      .markPhoneVerified(
        userId,
      );

  if (!user) {
    return {
      success: false,
      message:
        "Account not found.",
      error: {
        code:
          "ACCOUNT_NOT_FOUND",
        message:
          "Account not found.",
        statusCode: 404,
      },
    };
  }

  await logAudit(
    "Phone verified",
    {
      action:
        AUTH_MODULE_CONSTANTS.EVENTS
          .PHONE_VERIFIED,
      userId,
      success: true,
    },
  );

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .PHONE_VERIFIED,
  };
}

/* -------------------------------------------------------------------------- */
/*                               Sessions                                     */
/* -------------------------------------------------------------------------- */

export async function getUserSessions(
  userId: string,
): Promise<AuthSession[]> {
  const sessions =
    await authRepository
      .findUserSessions(
        userId,
      );

  return sessions.map(
    toAuthSession,
  );
}

export async function revokeSession(
  userId: string,
  sessionId: string,
): Promise<SessionResult> {
  const session =
    await authRepository
      .revokeUserSession(
        userId,
        sessionId,
      );

  if (!session) {
    return {
      success: false,
      message:
        "Session not found.",
      error: {
        code:
          "SESSION_NOT_FOUND",
        message:
          "Session not found.",
        statusCode: 404,
      },
    };
  }

  return {
    success: true,
    message:
      AUTH_MODULE_CONSTANTS
        .MESSAGES
        .SESSION_REVOKED,
    session:
      toAuthSession(session),
  };
}

/* -------------------------------------------------------------------------- */
/*                         Authenticated User                                 */
/* -------------------------------------------------------------------------- */

export async function getAuthenticatedUser(
  userId: string,
): Promise<AuthUser | null> {
  const user =
    await authRepository
      .findUserById(
        userId,
      );

  if (!user) {
    return null;
  }

  return toAuthUser(user);
}

/* -------------------------------------------------------------------------- */
/*                           Create User Account                              */
/* -------------------------------------------------------------------------- */

export async function createUserAccount(
  input: {
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    password?: string;
    role: AuthRole;
    branchId?: string;
    departmentId?: string;
  },
): Promise<AuthUser> {
  const password =
    input.password ??
    generateRandomPassword(16);

  const passwordHash =
    await hashPassword(
      password,
    );

  const branchId =
    input.branchId &&
    Types.ObjectId.isValid(
      input.branchId,
    )
      ? new Types.ObjectId(
          input.branchId,
        )
      : undefined;

  const departmentId =
    input.departmentId &&
    Types.ObjectId.isValid(
      input.departmentId,
    )
      ? new Types.ObjectId(
          input.departmentId,
        )
      : undefined;

  const user =
    await authRepository
      .createUser({
        email:
          normalizeEmail(
            input.email,
          ),
        phone:
          input.phone
            ? normalizePhone(
                input.phone,
              )
            : undefined,
        firstName:
          input.firstName,
        lastName:
          input.lastName,
        password:
          passwordHash,
        role:
          input.role,
        branchId,
        departmentId,
      });

  return toAuthUser(user);
}

/* -------------------------------------------------------------------------- */
/*                              Service Object                                */
/* -------------------------------------------------------------------------- */

export const authService =
  Object.freeze({
    login,
    refreshAccessToken,

    logout,
    logoutAllSessions,

    changePassword,

    requestPasswordReset,
    resetPassword,

    createOtp,
    verifyOtp,

    verifyEmail,
    verifyPhone,

    getUserSessions,
    revokeSession,

    getAuthenticatedUser,
    createUserAccount,
  });
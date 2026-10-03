/**
 * MirexCargo
 * Authentication Repository
 *
 * Database access layer for:
 * - Users
 * - Authentication sessions
 * - OTP records
 * - Password reset tokens
 *
 * Business logic must remain in auth.service.ts.
 */

import { Types } from "mongoose";

import {
  AuthOtp,
  AuthSession,
  PasswordResetToken,
  UserModel,
  type IAuthOtp,
  type IAuthSession,
  type IAuthUserDocument,
  type IPasswordResetToken,
} from "./auth.model";

import type {
  CreateSessionInput,
  OtpRecord,
} from "./auth.types";

import type {
  AuthAccountStatus,
  AuthOtpPurpose,
  AuthRole,
} from "./auth.constants";

/* -------------------------------------------------------------------------- */
/*                                Types                                       */
/* -------------------------------------------------------------------------- */

export interface FindUserOptions {
  includePassword?: boolean;
  includeDeleted?: boolean;
}

export interface CreateAuthUserInput {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  password: string;
  role: AuthRole;
  branchId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  status?: AuthAccountStatus;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface UpdateLoginStateInput {
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
}

export interface CreateOtpInput {
  userId?: string | Types.ObjectId;
  identifier: string;
  purpose: AuthOtpPurpose;
  codeHash: string;
  expiresAt: Date;
  maxAttempts?: number;
  lastSentAt?: Date;
}

export interface CreatePasswordResetTokenInput {
  userId: string | Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthRepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/* -------------------------------------------------------------------------- */
/*                            User Repository                                 */
/* -------------------------------------------------------------------------- */

export async function findUserById(
  userId: string | Types.ObjectId,
  options: FindUserOptions = {},
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  const query = UserModel.findOne({
    _id: new Types.ObjectId(userId),
    ...(options.includeDeleted ? {} : { isDeleted: false }),
  });

  if (options.includePassword) {
    query.select("+password");
  }

  return query.exec();
}

export async function findUserByEmail(
  email: string,
  options: FindUserOptions = {},
): Promise<IAuthUserDocument | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const query = UserModel.findOne({
    email: normalizedEmail,
    ...(options.includeDeleted ? {} : { isDeleted: false }),
  });

  if (options.includePassword) {
    query.select("+password");
  }

  return query.exec();
}

export async function findUserByPhone(
  phone: string,
  options: FindUserOptions = {},
): Promise<IAuthUserDocument | null> {
  const normalizedPhone = phone.trim();

  if (!normalizedPhone) {
    return null;
  }

  const query = UserModel.findOne({
    phone: normalizedPhone,
    ...(options.includeDeleted ? {} : { isDeleted: false }),
  });

  if (options.includePassword) {
    query.select("+password");
  }

  return query.exec();
}

export async function findUserByEmailOrPhone(
  identifier: string,
  options: FindUserOptions = {},
): Promise<IAuthUserDocument | null> {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (!normalizedIdentifier) {
    return null;
  }

  const query = UserModel.findOne({
    $or: [
      { email: normalizedIdentifier },
      { phone: normalizedIdentifier },
    ],
    ...(options.includeDeleted ? {} : { isDeleted: false }),
  });

  if (options.includePassword) {
    query.select("+password");
  }

  return query.exec();
}

export async function createUser(
  input: CreateAuthUserInput,
): Promise<IAuthUserDocument> {
  const user = new UserModel({
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    password: input.password,
    role: input.role,
    branchId: input.branchId,
    departmentId: input.departmentId,
    status: input.status ?? "ACTIVE",
    emailVerified: input.emailVerified ?? false,
    phoneVerified: input.phoneVerified ?? false,
    passwordResetRequired: false,
    failedLoginAttempts: 0,
    tokenVersion: 0,
    isDeleted: false,
  });

  return user.save();
}

export async function updateUserLoginState(
  userId: string | Types.ObjectId,
  input: UpdateLoginStateInput,
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  const update: Record<string, unknown> = {};

  if (input.lastLoginAt !== undefined) {
    update.lastLoginAt = input.lastLoginAt;
  }

  if (input.lastLoginIp !== undefined) {
    update.lastLoginIp = input.lastLoginIp;
  }

  if (input.failedLoginAttempts !== undefined) {
    update.failedLoginAttempts = input.failedLoginAttempts;
  }

  if (input.lockedUntil !== undefined) {
    update.lockedUntil = input.lockedUntil;
  }

  return UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      isDeleted: false,
    },
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function incrementFailedLoginAttempts(
  userId: string | Types.ObjectId,
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  return UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      isDeleted: false,
    },
    {
      $inc: {
        failedLoginAttempts: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function resetFailedLoginAttempts(
  userId: string | Types.ObjectId,
): Promise<IAuthUserDocument | null> {
  return updateUserLoginState(userId, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
}

export async function lockUserAccount(
  userId: string | Types.ObjectId,
  lockedUntil: Date,
): Promise<IAuthUserDocument | null> {
  return updateUserLoginState(userId, {
    lockedUntil,
  });
}

export async function unlockUserAccount(
  userId: string | Types.ObjectId,
): Promise<IAuthUserDocument | null> {
  return updateUserLoginState(userId, {
    failedLoginAttempts: 0,
    lockedUntil: null,
  });
}

export async function updatePassword(
  userId: string | Types.ObjectId,
  password: string,
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  return UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      isDeleted: false,
    },
    {
      $set: {
        password,
        passwordChangedAt: new Date(),
        passwordResetRequired: false,
      },
      $inc: {
        tokenVersion: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function markEmailVerified(
  userId: string | Types.ObjectId,
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  return UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      isDeleted: false,
    },
    {
      $set: {
        emailVerified: true,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function markPhoneVerified(
  userId: string | Types.ObjectId,
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  return UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      isDeleted: false,
    },
    {
      $set: {
        phoneVerified: true,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function incrementTokenVersion(
  userId: string | Types.ObjectId,
): Promise<IAuthUserDocument | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  return UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      isDeleted: false,
    },
    {
      $inc: {
        tokenVersion: 1,
      },
    },
    {
      new: true,
    },
  ).exec();
}

/* -------------------------------------------------------------------------- */
/*                           Session Repository                               */
/* -------------------------------------------------------------------------- */

export async function createSession(
  input: CreateSessionInput,
): Promise<IAuthSession> {
  const session = new AuthSession({
    userId: new Types.ObjectId(input.userId),
    sessionId: cryptoSafeSessionId(),
    refreshTokenHash: input.refreshTokenHash,
    deviceId: input.deviceId,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: input.expiresAt,
    isRevoked: false,
  });

  return session.save();
}

export async function createSessionWithId(
  input: CreateSessionInput & { sessionId: string },
): Promise<IAuthSession> {
  const session = new AuthSession({
    userId: new Types.ObjectId(input.userId),
    sessionId: input.sessionId,
    refreshTokenHash: input.refreshTokenHash,
    deviceId: input.deviceId,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: input.expiresAt,
    isRevoked: false,
  });

  return session.save();
}

export async function findSessionById(
  sessionId: string,
): Promise<IAuthSession | null> {
  if (!sessionId.trim()) {
    return null;
  }

  return AuthSession.findOne({
    sessionId: sessionId.trim(),
  })
    .select("+refreshTokenHash")
    .exec();
}

export async function findActiveSessionById(
  sessionId: string,
): Promise<IAuthSession | null> {
  if (!sessionId.trim()) {
    return null;
  }

  return AuthSession.findOne({
    sessionId: sessionId.trim(),
    isRevoked: false,
    expiresAt: {
      $gt: new Date(),
    },
  })
    .select("+refreshTokenHash")
    .exec();
}

export async function findUserSessions(
  userId: string | Types.ObjectId,
): Promise<IAuthSession[]> {
  if (!Types.ObjectId.isValid(userId)) {
    return [];
  }

  return AuthSession.find({
    userId: new Types.ObjectId(userId),
    isRevoked: false,
    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({
      lastUsedAt: -1,
    })
    .exec();
}

export async function countActiveSessions(
  userId: string | Types.ObjectId,
): Promise<number> {
  if (!Types.ObjectId.isValid(userId)) {
    return 0;
  }

  return AuthSession.countDocuments({
    userId: new Types.ObjectId(userId),
    isRevoked: false,
    expiresAt: {
      $gt: new Date(),
    },
  }).exec();
}

export async function updateSessionLastUsed(
  sessionId: string,
): Promise<IAuthSession | null> {
  return AuthSession.findOneAndUpdate(
    {
      sessionId,
      isRevoked: false,
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        lastUsedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function updateSessionRefreshToken(
  sessionId: string,
  refreshTokenHash: string,
  expiresAt: Date,
): Promise<IAuthSession | null> {
  return AuthSession.findOneAndUpdate(
    {
      sessionId,
      isRevoked: false,
    },
    {
      $set: {
        refreshTokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function revokeSession(
  sessionId: string,
): Promise<IAuthSession | null> {
  return AuthSession.findOneAndUpdate(
    {
      sessionId,
      isRevoked: false,
    },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function revokeUserSession(
  userId: string | Types.ObjectId,
  sessionId: string,
): Promise<IAuthSession | null> {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  return AuthSession.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      sessionId,
      isRevoked: false,
    },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function revokeAllUserSessions(
  userId: string | Types.ObjectId,
  exceptSessionId?: string,
): Promise<number> {
  if (!Types.ObjectId.isValid(userId)) {
    return 0;
  }

  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    isRevoked: false,
  };

  if (exceptSessionId) {
    filter.sessionId = {
      $ne: exceptSessionId,
    };
  }

  const result = await AuthSession.updateMany(
    filter,
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    },
  ).exec();

  return result.modifiedCount;
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await AuthSession.deleteMany({
    expiresAt: {
      $lte: new Date(),
    },
  }).exec();

  return result.deletedCount;
}

/* -------------------------------------------------------------------------- */
/*                              OTP Repository                                */
/* -------------------------------------------------------------------------- */

export async function createOtp(
  input: CreateOtpInput,
): Promise<IAuthOtp> {
  const userId = input.userId
    ? new Types.ObjectId(input.userId)
    : undefined;

  const otp = new AuthOtp({
    userId,
    identifier: input.identifier.trim().toLowerCase(),
    purpose: input.purpose,
    codeHash: input.codeHash,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 5,
    expiresAt: input.expiresAt,
    lastSentAt: input.lastSentAt ?? new Date(),
  });

  return otp.save();
}

export async function findLatestOtp(
  identifier: string,
  purpose: AuthOtpPurpose,
): Promise<IAuthOtp | null> {
  return AuthOtp.findOne({
    identifier: identifier.trim().toLowerCase(),
    purpose,
    verifiedAt: {
      $exists: false,
    },
    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({
      createdAt: -1,
    })
    .select("+codeHash")
    .exec();
}

export async function findOtpById(
  otpId: string | Types.ObjectId,
): Promise<IAuthOtp | null> {
  if (!Types.ObjectId.isValid(otpId)) {
    return null;
  }

  return AuthOtp.findById(otpId)
    .select("+codeHash")
    .exec();
}

export async function incrementOtpAttempts(
  otpId: string | Types.ObjectId,
): Promise<IAuthOtp | null> {
  if (!Types.ObjectId.isValid(otpId)) {
    return null;
  }

  return AuthOtp.findByIdAndUpdate(
    otpId,
    {
      $inc: {
        attempts: 1,
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function markOtpVerified(
  otpId: string | Types.ObjectId,
): Promise<IAuthOtp | null> {
  if (!Types.ObjectId.isValid(otpId)) {
    return null;
  }

  return AuthOtp.findByIdAndUpdate(
    otpId,
    {
      $set: {
        verifiedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function deleteOtps(
  identifier: string,
  purpose: AuthOtpPurpose,
): Promise<number> {
  const result = await AuthOtp.deleteMany({
    identifier: identifier.trim().toLowerCase(),
    purpose,
  }).exec();

  return result.deletedCount;
}

export async function deleteExpiredOtps(): Promise<number> {
  const result = await AuthOtp.deleteMany({
    expiresAt: {
      $lte: new Date(),
    },
  }).exec();

  return result.deletedCount;
}

/* -------------------------------------------------------------------------- */
/*                       Password Reset Repository                            */
/* -------------------------------------------------------------------------- */

export async function createPasswordResetToken(
  input: CreatePasswordResetTokenInput,
): Promise<IPasswordResetToken> {
  const token = new PasswordResetToken({
    userId: new Types.ObjectId(input.userId),
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  });

  return token.save();
}

export async function findPasswordResetToken(
  tokenHash: string,
): Promise<IPasswordResetToken | null> {
  if (!tokenHash.trim()) {
    return null;
  }

  return PasswordResetToken.findOne({
    tokenHash: tokenHash.trim(),
    usedAt: {
      $exists: false,
    },
    expiresAt: {
      $gt: new Date(),
    },
  })
    .select("+tokenHash")
    .exec();
}

export async function markPasswordResetTokenUsed(
  tokenId: string | Types.ObjectId,
): Promise<IPasswordResetToken | null> {
  if (!Types.ObjectId.isValid(tokenId)) {
    return null;
  }

  return PasswordResetToken.findByIdAndUpdate(
    tokenId,
    {
      $set: {
        usedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function invalidateUserPasswordResetTokens(
  userId: string | Types.ObjectId,
): Promise<number> {
  if (!Types.ObjectId.isValid(userId)) {
    return 0;
  }

  const result = await PasswordResetToken.updateMany(
    {
      userId: new Types.ObjectId(userId),
      usedAt: {
        $exists: false,
      },
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
  ).exec();

  return result.modifiedCount;
}

export async function deleteExpiredPasswordResetTokens(): Promise<number> {
  const result = await PasswordResetToken.deleteMany({
    expiresAt: {
      $lte: new Date(),
    },
  }).exec();

  return result.deletedCount;
}

/* -------------------------------------------------------------------------- */
/*                              Statistics                                    */
/* -------------------------------------------------------------------------- */

export async function getUserSessionCount(
  userId: string | Types.ObjectId,
): Promise<number> {
  return countActiveSessions(userId);
}

export async function getActiveOtpCount(
  identifier: string,
  purpose: AuthOtpPurpose,
): Promise<number> {
  return AuthOtp.countDocuments({
    identifier: identifier.trim().toLowerCase(),
    purpose,
    verifiedAt: {
      $exists: false,
    },
    expiresAt: {
      $gt: new Date(),
    },
  }).exec();
}

/* -------------------------------------------------------------------------- */
/*                              Helpers                                       */
/* -------------------------------------------------------------------------- */

function cryptoSafeSessionId(): string {
  const timestamp = Date.now().toString(36);

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 18);

  return `sess_${timestamp}_${randomPart}`;
}

/* -------------------------------------------------------------------------- */
/*                              Repository Object                             */
/* -------------------------------------------------------------------------- */

export const authRepository = Object.freeze({
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findUserByEmailOrPhone,

  createUser,
  updateUserLoginState,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  lockUserAccount,
  unlockUserAccount,

  updatePassword,
  markEmailVerified,
  markPhoneVerified,
  incrementTokenVersion,

  createSession,
  createSessionWithId,
  findSessionById,
  findActiveSessionById,
  findUserSessions,
  countActiveSessions,
  updateSessionLastUsed,
  updateSessionRefreshToken,
  revokeSession,
  revokeUserSession,
  revokeAllUserSessions,
  deleteExpiredSessions,

  createOtp,
  findLatestOtp,
  findOtpById,
  incrementOtpAttempts,
  markOtpVerified,
  deleteOtps,
  deleteExpiredOtps,

  createPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenUsed,
  invalidateUserPasswordResetTokens,
  deleteExpiredPasswordResetTokens,

  getUserSessionCount,
  getActiveOtpCount,
});
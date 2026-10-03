/**
 * MirexCargo
 * Authentication Module Models
 *
 * User authentication, refresh sessions, OTP and password-reset persistence.
 */

import {
  Schema,
  Types,
  model,
  type Document,
  type Model,
} from "mongoose";

import {
  AUTH_MODULE_CONSTANTS,
  type AuthAccountStatus,
  type AuthOtpPurpose,
  type AuthRole,
} from "./auth.constants";

/* -------------------------------------------------------------------------- */
/*                              User Interfaces                               */
/* -------------------------------------------------------------------------- */

export interface IAuthUser {
  email: string;
  phone?: string;

  firstName: string;
  lastName: string;

  password: string;

  role: AuthRole;

  branchId?: Types.ObjectId;
  departmentId?: Types.ObjectId;

  status: AuthAccountStatus;

  emailVerified: boolean;
  phoneVerified: boolean;

  passwordChangedAt?: Date;
  passwordResetRequired: boolean;

  lastLoginAt?: Date;
  lastLoginIp?: string;

  failedLoginAttempts: number;
  lockedUntil?: Date;

  tokenVersion: number;

  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthUserDocument
  extends IAuthUser,
    Document<Types.ObjectId> {
  isAccountLocked(): boolean;
  canLogin(): boolean;
  getFullName(): string;
}

/* -------------------------------------------------------------------------- */
/*                              Session Interfaces                            */
/* -------------------------------------------------------------------------- */

export interface IAuthSession {
  _id: Types.ObjectId;

  userId: Types.ObjectId;

  sessionId: string;

  refreshTokenHash: string;

  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;

  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;

  revokedAt?: Date;

  isRevoked: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                OTP Model                                   */
/* -------------------------------------------------------------------------- */

export interface IAuthOtp {
  _id: Types.ObjectId;

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
/*                          Password Reset Model                              */
/* -------------------------------------------------------------------------- */

export interface IPasswordResetToken {
  _id: Types.ObjectId;

  userId: Types.ObjectId;

  tokenHash: string;

  expiresAt: Date;

  usedAt?: Date;

  createdAt: Date;
}

/* -------------------------------------------------------------------------- */
/*                              User Schema                                   */
/* -------------------------------------------------------------------------- */

const authUserSchema = new Schema<IAuthUserDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: AUTH_MODULE_CONSTANTS.VALIDATION.EMAIL_MAX_LENGTH,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      required: true,
      enum: Object.values(AUTH_MODULE_CONSTANTS.ROLES),
      index: true,
    },

    branchId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: Object.values(AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS),
      default: AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS.ACTIVE,
      index: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    passwordChangedAt: {
      type: Date,
    },

    passwordResetRequired: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastLoginAt: {
      type: Date,
    },

    lastLoginIp: {
      type: String,
      trim: true,
      maxlength: 255,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockedUntil: {
      type: Date,
      index: true,
    },

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "users",
  },
);

/* -------------------------------------------------------------------------- */
/*                             User Indexes                                   */
/* -------------------------------------------------------------------------- */

authUserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
    name: "users_email_unique_active",
  },
);

authUserSchema.index(
  { phone: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isDeleted: false,
    },
    name: "users_phone_unique_active",
  },
);

authUserSchema.index(
  {
    branchId: 1,
    role: 1,
    status: 1,
  },
  {
    name: "users_branch_role_status",
  },
);

authUserSchema.index(
  {
    status: 1,
    lockedUntil: 1,
  },
  {
    name: "users_status_lock",
  },
);

/* -------------------------------------------------------------------------- */
/*                              User Methods                                  */
/* -------------------------------------------------------------------------- */

authUserSchema.methods.isAccountLocked = function (): boolean {
  if (this.status === AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS.LOCKED) {
    return true;
  }

  if (!this.lockedUntil) {
    return false;
  }

  return this.lockedUntil.getTime() > Date.now();
};

authUserSchema.methods.canLogin = function (): boolean {
  if (this.isDeleted) {
    return false;
  }

  if (
    this.status !== AUTH_MODULE_CONSTANTS.ACCOUNT.STATUS.ACTIVE
  ) {
    return false;
  }

  return !this.isAccountLocked();
};

authUserSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`.trim();
};

/* -------------------------------------------------------------------------- */
/*                              User Hooks                                    */
/* -------------------------------------------------------------------------- */

authUserSchema.pre("save", function (next) {
  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = new Date();
    this.passwordResetRequired = false;
    this.tokenVersion += 1;
  }

  next();
});

/* -------------------------------------------------------------------------- */
/*                             Session Schema                                 */
/* -------------------------------------------------------------------------- */

const authSessionSchema = new Schema<IAuthSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    deviceId: {
      type: String,
      trim: true,
      maxlength:
        AUTH_MODULE_CONSTANTS.VALIDATION.DEVICE_ID_MAX_LENGTH,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength:
        AUTH_MODULE_CONSTANTS.VALIDATION.USER_AGENT_MAX_LENGTH,
    },

    ipAddress: {
      type: String,
      trim: true,
      maxlength: 255,
    },

    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      index: true,
    },

    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "auth_sessions",
  },
);

/* -------------------------------------------------------------------------- */
/*                            Session Indexes                                  */
/* -------------------------------------------------------------------------- */

authSessionSchema.index(
  {
    userId: 1,
    isRevoked: 1,
    expiresAt: 1,
  },
  {
    name: "auth_sessions_user_active",
  },
);

authSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
    name: "auth_sessions_ttl",
  },
);

/* -------------------------------------------------------------------------- */
/*                              OTP Schema                                    */
/* -------------------------------------------------------------------------- */

const authOtpSchema = new Schema<IAuthOtp>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    purpose: {
      type: String,
      required: true,
      enum: Object.values(AUTH_MODULE_CONSTANTS.OTP.PURPOSES),
      index: true,
    },

    codeHash: {
      type: String,
      required: true,
      select: false,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAttempts: {
      type: Number,
      default: AUTH_MODULE_CONSTANTS.OTP.MAX_ATTEMPTS,
      min: 1,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    lastSentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "auth_otps",
  },
);

/* -------------------------------------------------------------------------- */
/*                               OTP Indexes                                  */
/* -------------------------------------------------------------------------- */

authOtpSchema.index(
  {
    identifier: 1,
    purpose: 1,
    createdAt: -1,
  },
  {
    name: "auth_otps_identifier_purpose",
  },
);

authOtpSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
    name: "auth_otps_ttl",
  },
);

/* -------------------------------------------------------------------------- */
/*                         Password Reset Schema                              */
/* -------------------------------------------------------------------------- */

const passwordResetTokenSchema =
  new Schema<IPasswordResetToken>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
        index: true,
      },

      tokenHash: {
        type: String,
        required: true,
        unique: true,
        select: false,
        index: true,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },

      usedAt: {
        type: Date,
        index: true,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
      versionKey: false,
      collection: "password_reset_tokens",
    },
  );

/* -------------------------------------------------------------------------- */
/*                       Password Reset Indexes                               */
/* -------------------------------------------------------------------------- */

passwordResetTokenSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
    name: "password_reset_tokens_ttl",
  },
);

passwordResetTokenSchema.index(
  {
    userId: 1,
    usedAt: 1,
    createdAt: -1,
  },
  {
    name: "password_reset_user_history",
  },
);

/* -------------------------------------------------------------------------- */
/*                              Model Types                                   */
/* -------------------------------------------------------------------------- */

export type AuthUserModel = Model<IAuthUserDocument>;

export type AuthSessionModel = Model<IAuthSession>;

export type AuthOtpModel = Model<IAuthOtp>;

export type PasswordResetTokenModel =
  Model<IPasswordResetToken>;

/* -------------------------------------------------------------------------- */
/*                                Models                                      */
/* -------------------------------------------------------------------------- */

export const AuthUserModelInstance =
  model<IAuthUserDocument>("User", authUserSchema) as AuthUserModel;

export const AuthSessionModelInstance =
  model<IAuthSession>(
    "AuthSession",
    authSessionSchema,
  ) as AuthSessionModel;

export const AuthOtpModelInstance =
  model<IAuthOtp>(
    "AuthOtp",
    authOtpSchema,
  ) as AuthOtpModel;

export const PasswordResetTokenModelInstance =
  model<IPasswordResetToken>(
    "PasswordResetToken",
    passwordResetTokenSchema,
  ) as PasswordResetTokenModel;

/* -------------------------------------------------------------------------- */
/*                              Named Aliases                                 */
/* -------------------------------------------------------------------------- */

export const UserModel = AuthUserModelInstance;

export const AuthSession = AuthSessionModelInstance;

export const AuthOtp = AuthOtpModelInstance;

export const PasswordResetToken =
  PasswordResetTokenModelInstance;

/* -------------------------------------------------------------------------- */
/*                         Schema Exports                                     */
/* -------------------------------------------------------------------------- */

export {
  authUserSchema,
  authSessionSchema,
  authOtpSchema,
  passwordResetTokenSchema,
};
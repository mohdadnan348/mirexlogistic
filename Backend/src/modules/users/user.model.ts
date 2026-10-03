import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
} from "mongoose";

import type {
  UserAccountType,
  UserDataScope,
  UserEntity,
  UserEmploymentType,
  UserGender,
  UserStatus,
} from "./user.types";

export type UserDocument = HydratedDocument<UserEntity>;

export interface UserModel extends Model<UserEntity> {
  findByIdActive(userId: Types.ObjectId): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findByPhone(phone: string): Promise<UserDocument | null>;
  findByEmployeeCode(employeeCode: string): Promise<UserDocument | null>;
  findByEmployeeNumber(employeeNumber: string): Promise<UserDocument | null>;
  existsByEmail(email: string, excludeUserId?: Types.ObjectId): Promise<boolean>;
  existsByPhone(phone: string, excludeUserId?: Types.ObjectId): Promise<boolean>;
  existsByEmployeeCode(
    employeeCode: string,
    excludeUserId?: Types.ObjectId,
  ): Promise<boolean>;
  existsByEmployeeNumber(
    employeeNumber: string,
    excludeUserId?: Types.ObjectId,
  ): Promise<boolean>;
}

const objectIdField = {
  type: Schema.Types.ObjectId,
};

const userBranchAssignmentSchema = new Schema(
  {
    branchId: {
      ...objectIdField,
      required: true,
      ref: "Branch",
    },
    isPrimary: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: false,
    id: false,
  },
);

const notificationPreferencesSchema = new Schema(
  {
    inApp: {
      type: Boolean,
      required: true,
      default: true,
    },
    email: {
      type: Boolean,
      required: true,
      default: true,
    },
    sms: {
      type: Boolean,
      required: true,
      default: false,
    },
    whatsapp: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: false,
    id: false,
  },
);

const securitySettingsSchema = new Schema(
  {
    twoFactorEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      default: undefined,
    },
    lastLoginAt: {
      type: Date,
      default: undefined,
    },
    lastLoginIp: {
      type: String,
      trim: true,
      maxlength: 45,
      default: undefined,
    },
  },
  {
    _id: false,
    id: false,
  },
);

const userSchema = new Schema<UserEntity, UserModel>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 50,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      index: true,
      sparse: true,
      default: undefined,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: undefined,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 201,
    },

    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: undefined,
    },

    gender: {
      type: String,
      enum: [
        "MALE",
        "FEMALE",
        "OTHER",
        "PREFER_NOT_TO_SAY",
      ] satisfies UserGender[],
      default: undefined,
    },

    dateOfBirth: {
      type: Date,
      default: undefined,
    },

    employeeType: {
      type: String,
      required: true,
      enum: [
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "TEMPORARY",
        "INTERN",
      ] satisfies UserEmploymentType[],
      default: "FULL_TIME",
      index: true,
    },

    accountType: {
      type: String,
      required: true,
      enum: [
        "EMPLOYEE",
        "ADMINISTRATOR",
      ] satisfies UserAccountType[],
      default: "EMPLOYEE",
      index: true,
    },

    designation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: undefined,
    },

    employeeNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 50,
      sparse: true,
      index: true,
      default: undefined,
    },

    roleId: {
      ...objectIdField,
      required: true,
      ref: "Role",
      index: true,
    },

    roleIds: {
      type: [Schema.Types.ObjectId],
      ref: "Role",
      default: [],
    },

    departmentId: {
      ...objectIdField,
      ref: "Department",
      index: true,
      default: undefined,
    },

    branches: {
      type: [userBranchAssignmentSchema],
      required: true,
      default: [],
    },

    branchId: {
      ...objectIdField,
      ref: "Branch",
      index: true,
      default: undefined,
    },

    dataScope: {
      type: String,
      required: true,
      enum: [
        "GLOBAL",
        "BRANCH",
        "DEPARTMENT",
      ] satisfies UserDataScope[],
      default: "BRANCH",
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
        "LOCKED",
      ] satisfies UserStatus[],
      default: "ACTIVE",
      index: true,
    },

    isLoginEnabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },

    isLocked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },

    lockedUntil: {
      type: Date,
      default: undefined,
    },

    failedLoginAttempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    notificationPreferences: {
      type: notificationPreferencesSchema,
      required: true,
      default: () => ({
        inApp: true,
        email: true,
        sms: false,
        whatsapp: false,
      }),
    },

    security: {
      type: securitySettingsSchema,
      required: true,
      default: () => ({
        twoFactorEnabled: false,
        emailVerified: false,
        phoneVerified: false,
      }),
    },

    lastLoginAt: {
      type: Date,
      default: undefined,
      index: true,
    },

    lastActivityAt: {
      type: Date,
      default: undefined,
      index: true,
    },

    createdBy: {
      ...objectIdField,
      ref: "User",
      default: undefined,
    },

    updatedBy: {
      ...objectIdField,
      ref: "User",
      default: undefined,
    },
  },
  {
    collection: "users",
    timestamps: true,
    versionKey: false,
    strict: true,
    minimize: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  },
);

userSchema.virtual("fullName").get(function fullNameGetter() {
  return [this.firstName, this.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
});

userSchema.pre("save", function normalizeUserDocument(next) {
  this.email = this.email.trim().toLowerCase();
  this.employeeCode = this.employeeCode.trim().toUpperCase();

  if (this.phone) {
    this.phone = this.phone.trim();
  }

  if (this.employeeNumber) {
    this.employeeNumber = this.employeeNumber.trim().toUpperCase();
  }

  this.firstName = this.firstName.trim();

  if (this.lastName) {
    this.lastName = this.lastName.trim();
  }

  this.displayName =
    this.displayName.trim() ||
    [this.firstName, this.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  next();
});

userSchema.pre("findOneAndUpdate", function normalizeUserUpdate(next) {
  const update = this.getUpdate() as Record<string, unknown>;

  const $set =
    typeof update.$set === "object" &&
    update.$set !== null
      ? (update.$set as Record<string, unknown>)
      : update;

  if (typeof $set.email === "string") {
    $set.email = $set.email.trim().toLowerCase();
  }

  if (typeof $set.employeeCode === "string") {
    $set.employeeCode = $set.employeeCode.trim().toUpperCase();
  }

  if (typeof $set.employeeNumber === "string") {
    $set.employeeNumber = $set.employeeNumber.trim().toUpperCase();
  }

  if (typeof $set.phone === "string") {
    $set.phone = $set.phone.trim();
  }

  if (typeof $set.firstName === "string") {
    $set.firstName = $set.firstName.trim();
  }

  if (typeof $set.lastName === "string") {
    $set.lastName = $set.lastName.trim();
  }

  if (typeof $set.displayName === "string") {
    $set.displayName = $set.displayName.trim();
  }

  if (update.$set) {
    update.$set = $set;
  }

  this.setUpdate(update);

  next();
});

userSchema.statics.findByIdActive = function findByIdActive(
  userId: Types.ObjectId,
) {
  return this.findOne({
    _id: userId,
    status: "ACTIVE",
    isLoginEnabled: true,
    isLocked: false,
  });
};

userSchema.statics.findByEmail = function findByEmail(email: string) {
  return this.findOne({
    email: email.trim().toLowerCase(),
  }).select("+passwordHash");
};

userSchema.statics.findByPhone = function findByPhone(phone: string) {
  return this.findOne({
    phone: phone.trim(),
  }).select("+passwordHash");
};

userSchema.statics.findByEmployeeCode = function findByEmployeeCode(
  employeeCode: string,
) {
  return this.findOne({
    employeeCode: employeeCode.trim().toUpperCase(),
  });
};

userSchema.statics.findByEmployeeNumber = function findByEmployeeNumber(
  employeeNumber: string,
) {
  return this.findOne({
    employeeNumber: employeeNumber.trim().toUpperCase(),
  });
};

userSchema.statics.existsByEmail = async function existsByEmail(
  email: string,
  excludeUserId?: Types.ObjectId,
) {
  const filter: Record<string, unknown> = {
    email: email.trim().toLowerCase(),
  };

  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  return Boolean(await this.exists(filter));
};

userSchema.statics.existsByPhone = async function existsByPhone(
  phone: string,
  excludeUserId?: Types.ObjectId,
) {
  const filter: Record<string, unknown> = {
    phone: phone.trim(),
  };

  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  return Boolean(await this.exists(filter));
};

userSchema.statics.existsByEmployeeCode =
  async function existsByEmployeeCode(
    employeeCode: string,
    excludeUserId?: Types.ObjectId,
  ) {
    const filter: Record<string, unknown> = {
      employeeCode: employeeCode.trim().toUpperCase(),
    };

    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    return Boolean(await this.exists(filter));
  };

userSchema.statics.existsByEmployeeNumber =
  async function existsByEmployeeNumber(
    employeeNumber: string,
    excludeUserId?: Types.ObjectId,
  ) {
    const filter: Record<string, unknown> = {
      employeeNumber: employeeNumber.trim().toUpperCase(),
    };

    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    return Boolean(await this.exists(filter));
  };

userSchema.index({
  status: 1,
  isLoginEnabled: 1,
  isLocked: 1,
});

userSchema.index({
  branchId: 1,
  status: 1,
});

userSchema.index({
  departmentId: 1,
  status: 1,
});

userSchema.index({
  roleId: 1,
  status: 1,
});

userSchema.index({
  "branches.branchId": 1,
  status: 1,
});

userSchema.index({
  createdAt: -1,
});

userSchema.index({
  lastLoginAt: -1,
});

export const UserModel = model<UserEntity, UserModel>(
  "User",
  userSchema,
);

export function isUserDocument(
  value: unknown,
): value is UserDocument {
  return (
    value instanceof UserModel ||
    Boolean(
      value &&
        typeof value === "object" &&
        "_id" in value &&
        "email" in value &&
        "employeeCode" in value,
    )
  );
}

export function isUserObjectId(
  value: unknown,
): value is Types.ObjectId {
  return value instanceof Types.ObjectId;
}

export default UserModel;
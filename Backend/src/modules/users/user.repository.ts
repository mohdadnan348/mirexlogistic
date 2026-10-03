import { Types } from "mongoose";

import { UserModel, type UserDocument } from "./user.model";
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserEntity,
  UserFilters,
  UserListQuery,
} from "./user.types";

export interface UserListResult {
  items: UserDocument[];
  total: number;
}

export interface CreateUserRepositoryInput
  extends Omit<CreateUserInput, "password"> {
  passwordHash: string;
}

export interface UpdateUserRepositoryInput
  extends Omit<UpdateUserInput, "updatedBy"> {
  updatedBy?: Types.ObjectId;
}

export interface UserRepository {
  createUser(input: CreateUserRepositoryInput): Promise<UserDocument>;

  findUserById(
    userId: Types.ObjectId,
    includePasswordHash?: boolean,
  ): Promise<UserDocument | null>;

  findUserByEmail(
    email: string,
    includePasswordHash?: boolean,
  ): Promise<UserDocument | null>;

  findUserByPhone(
    phone: string,
    includePasswordHash?: boolean,
  ): Promise<UserDocument | null>;

  findUserByEmployeeCode(
    employeeCode: string,
  ): Promise<UserDocument | null>;

  findUserByEmployeeNumber(
    employeeNumber: string,
  ): Promise<UserDocument | null>;

  findActiveUserById(
    userId: Types.ObjectId,
  ): Promise<UserDocument | null>;

  findAllUsers(
    filters?: UserFilters,
    query?: UserListQuery,
  ): Promise<UserListResult>;

  findUsers(
    filters?: UserFilters,
    query?: UserListQuery,
  ): Promise<UserListResult>;

  updateUser(
    userId: Types.ObjectId,
    input: UpdateUserRepositoryInput,
  ): Promise<UserDocument | null>;

  updateUserStatus(
    userId: Types.ObjectId,
    input: UpdateUserStatusInput,
  ): Promise<UserDocument | null>;

  updateLoginState(
    userId: Types.ObjectId,
    isLoginEnabled: boolean,
    updatedBy?: Types.ObjectId,
  ): Promise<UserDocument | null>;

  updateLockState(
    userId: Types.ObjectId,
    isLocked: boolean,
    lockedUntil?: Date,
    updatedBy?: Types.ObjectId,
  ): Promise<UserDocument | null>;

  updateLoginActivity(
    userId: Types.ObjectId,
    input: {
      lastLoginAt?: Date;
      lastActivityAt?: Date;
      lastLoginIp?: string;
      failedLoginAttempts?: number;
      isLocked?: boolean;
      lockedUntil?: Date;
    },
  ): Promise<UserDocument | null>;

  incrementFailedLoginAttempts(
    userId: Types.ObjectId,
  ): Promise<UserDocument | null>;

  resetFailedLoginAttempts(
    userId: Types.ObjectId,
  ): Promise<UserDocument | null>;

  updatePassword(
    userId: Types.ObjectId,
    passwordHash: string,
    updatedBy?: Types.ObjectId,
  ): Promise<UserDocument | null>;

  updateEmailVerification(
    userId: Types.ObjectId,
    verified: boolean,
  ): Promise<UserDocument | null>;

  updatePhoneVerification(
    userId: Types.ObjectId,
    verified: boolean,
  ): Promise<UserDocument | null>;

  updateTwoFactorStatus(
    userId: Types.ObjectId,
    enabled: boolean,
  ): Promise<UserDocument | null>;

  existsByEmail(
    email: string,
    excludeUserId?: Types.ObjectId,
  ): Promise<boolean>;

  existsByPhone(
    phone: string,
    excludeUserId?: Types.ObjectId,
  ): Promise<boolean>;

  existsByEmployeeCode(
    employeeCode: string,
    excludeUserId?: Types.ObjectId,
  ): Promise<boolean>;

  existsByEmployeeNumber(
    employeeNumber: string,
    excludeUserId?: Types.ObjectId,
  ): Promise<boolean>;

  findUsersByRole(
    roleId: Types.ObjectId,
    includeInactive?: boolean,
  ): Promise<UserDocument[]>;

  findUsersByBranch(
    branchId: Types.ObjectId,
    includeInactive?: boolean,
  ): Promise<UserDocument[]>;

  findUsersByDepartment(
    departmentId: Types.ObjectId,
    includeInactive?: boolean,
  ): Promise<UserDocument[]>;

  countUsers(filters?: UserFilters): Promise<number>;

  getUserStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    locked: number;
    loginEnabled: number;
    loginDisabled: number;
    verifiedEmail: number;
    verifiedPhone: number;
  }>;

  deleteUser(
    userId: Types.ObjectId,
    deletedBy?: Types.ObjectId,
  ): Promise<boolean>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.trim();
}

function normalizeEmployeeCode(employeeCode: string): string {
  return employeeCode.trim().toUpperCase();
}

function normalizeEmployeeNumber(employeeNumber: string): string {
  return employeeNumber.trim().toUpperCase();
}

function buildUserFilter(
  filters: UserFilters = {},
): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filters.employeeCode) {
    query.employeeCode = normalizeEmployeeCode(filters.employeeCode);
  }

  if (filters.email) {
    query.email = normalizeEmail(filters.email);
  }

  if (filters.phone) {
    query.phone = normalizePhone(filters.phone);
  }

  if (filters.firstName) {
    query.firstName = {
      $regex: escapeRegex(filters.firstName.trim()),
      $options: "i",
    };
  }

  if (filters.lastName) {
    query.lastName = {
      $regex: escapeRegex(filters.lastName.trim()),
      $options: "i",
    };
  }

  if (filters.roleId) {
    query.roleId = filters.roleId;
  }

  if (filters.departmentId) {
    query.departmentId = filters.departmentId;
  }

  if (filters.branchId) {
    query.$or = [
      {
        branchId: filters.branchId,
      },
      {
        "branches.branchId": filters.branchId,
      },
    ];
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.employeeType) {
    query.employeeType = filters.employeeType;
  }

  if (filters.accountType) {
    query.accountType = filters.accountType;
  }

  if (filters.dataScope) {
    query.dataScope = filters.dataScope;
  }

  if (typeof filters.isLoginEnabled === "boolean") {
    query.isLoginEnabled = filters.isLoginEnabled;
  }

  if (typeof filters.isLocked === "boolean") {
    query.isLocked = filters.isLocked;
  }

  if (filters.search?.trim()) {
    const search = escapeRegex(filters.search.trim());

    const searchConditions = [
      {
        employeeCode: {
          $regex: search,
          $options: "i",
        },
      },
      {
        employeeNumber: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
      {
        phone: {
          $regex: search,
          $options: "i",
        },
      },
      {
        firstName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        lastName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        displayName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        designation: {
          $regex: search,
          $options: "i",
        },
      },
    ];

    if (query.$or) {
      query.$and = [
        {
          $or: query.$or,
        },
        {
          $or: searchConditions,
        },
      ];

      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  return query;
}

function buildSort(
  query: UserListQuery = {},
): Record<string, 1 | -1> {
  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  return {
    [sortBy]: sortOrder,
  };
}

function getPagination(query: UserListQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function createUser(
  input: CreateUserRepositoryInput,
): Promise<UserDocument> {
  const user = new UserModel({
    employeeCode:
      input.employeeCode ??
      `EMP-${Date.now().toString().slice(-8)}`,

    email: input.email,
    phone: input.phone,

    passwordHash: input.passwordHash,

    firstName: input.firstName,
    lastName: input.lastName,

    avatarUrl: input.avatarUrl,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,

    employeeType: input.employeeType ?? "FULL_TIME",
    accountType: input.accountType ?? "EMPLOYEE",

    designation: input.designation,
    employeeNumber: input.employeeNumber,

    roleId: input.roleId,
    roleIds: input.roleIds ?? [input.roleId],

    departmentId: input.departmentId,

    branches: input.branches,

    branchId:
      input.branchId ??
      input.branches.find((branch) => branch.isPrimary)?.branchId,

    dataScope: input.dataScope ?? "BRANCH",

    status: input.status ?? "ACTIVE",
    isLoginEnabled: input.isLoginEnabled ?? true,

    notificationPreferences: {
      inApp: input.notificationPreferences?.inApp ?? true,
      email: input.notificationPreferences?.email ?? true,
      sms: input.notificationPreferences?.sms ?? false,
      whatsapp: input.notificationPreferences?.whatsapp ?? false,
    },

    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  });

  return user.save();
}

async function findUserById(
  userId: Types.ObjectId,
  includePasswordHash = false,
): Promise<UserDocument | null> {
  const query = UserModel.findById(userId);

  if (includePasswordHash) {
    query.select("+passwordHash");
  }

  return query.exec();
}

async function findUserByEmail(
  email: string,
  includePasswordHash = false,
): Promise<UserDocument | null> {
  if (includePasswordHash) {
    return UserModel.findByEmail(normalizeEmail(email));
  }

  return UserModel.findOne({
    email: normalizeEmail(email),
  }).exec();
}

async function findUserByPhone(
  phone: string,
  includePasswordHash = false,
): Promise<UserDocument | null> {
  if (includePasswordHash) {
    return UserModel.findByPhone(normalizePhone(phone));
  }

  return UserModel.findOne({
    phone: normalizePhone(phone),
  }).exec();
}

async function findUserByEmployeeCode(
  employeeCode: string,
): Promise<UserDocument | null> {
  return UserModel.findByEmployeeCode(
    normalizeEmployeeCode(employeeCode),
  );
}

async function findUserByEmployeeNumber(
  employeeNumber: string,
): Promise<UserDocument | null> {
  return UserModel.findByEmployeeNumber(
    normalizeEmployeeNumber(employeeNumber),
  );
}

async function findActiveUserById(
  userId: Types.ObjectId,
): Promise<UserDocument | null> {
  return UserModel.findByIdActive(userId);
}

async function findUsers(
  filters: UserFilters = {},
  query: UserListQuery = {},
): Promise<UserListResult> {
  const filter = buildUserFilter(filters);
  const { page, limit, skip } = getPagination(query);
  const sort = buildSort(query);

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec(),

    UserModel.countDocuments(filter).exec(),
  ]);

  return {
    items,
    total,
  };
}

async function findAllUsers(
  filters: UserFilters = {},
  query: UserListQuery = {},
): Promise<UserListResult> {
  return findUsers(filters, query);
}

async function updateUser(
  userId: Types.ObjectId,
  input: UpdateUserRepositoryInput,
): Promise<UserDocument | null> {
  const update: Record<string, unknown> = {
    ...input,
  };

  delete update.updatedBy;

  if (input.updatedBy) {
    update.updatedBy = input.updatedBy;
  }

  if (input.branches) {
    const primaryBranch =
      input.branches.find((branch) => branch.isPrimary);

    if (primaryBranch) {
      update.branchId = primaryBranch.branchId;
    }
  }

  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updateUserStatus(
  userId: Types.ObjectId,
  input: UpdateUserStatusInput,
): Promise<UserDocument | null> {
  const update: Record<string, unknown> = {
    status: input.status,
    updatedBy: input.updatedBy,
  };

  if (input.status !== "LOCKED") {
    update.isLocked = false;
    update.lockedUntil = undefined;
  }

  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updateLoginState(
  userId: Types.ObjectId,
  isLoginEnabled: boolean,
  updatedBy?: Types.ObjectId,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        isLoginEnabled,
        updatedBy,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updateLockState(
  userId: Types.ObjectId,
  isLocked: boolean,
  lockedUntil?: Date,
  updatedBy?: Types.ObjectId,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        isLocked,
        lockedUntil: isLocked ? lockedUntil : undefined,
        status: isLocked ? "LOCKED" : "ACTIVE",
        updatedBy,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updateLoginActivity(
  userId: Types.ObjectId,
  input: {
    lastLoginAt?: Date;
    lastActivityAt?: Date;
    lastLoginIp?: string;
    failedLoginAttempts?: number;
    isLocked?: boolean;
    lockedUntil?: Date;
  },
): Promise<UserDocument | null> {
  const update: Record<string, unknown> = {};

  if (input.lastLoginAt !== undefined) {
    update.lastLoginAt = input.lastLoginAt;
    update["security.lastLoginAt"] = input.lastLoginAt;
  }

  if (input.lastActivityAt !== undefined) {
    update.lastActivityAt = input.lastActivityAt;
  }

  if (input.lastLoginIp !== undefined) {
    update["security.lastLoginIp"] = input.lastLoginIp;
  }

  if (input.failedLoginAttempts !== undefined) {
    update.failedLoginAttempts = Math.max(
      0,
      input.failedLoginAttempts,
    );
  }

  if (input.isLocked !== undefined) {
    update.isLocked = input.isLocked;
  }

  if (input.lockedUntil !== undefined) {
    update.lockedUntil = input.lockedUntil;
  }

  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function incrementFailedLoginAttempts(
  userId: Types.ObjectId,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
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

async function resetFailedLoginAttempts(
  userId: Types.ObjectId,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: undefined,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updatePassword(
  userId: Types.ObjectId,
  passwordHash: string,
  updatedBy?: Types.ObjectId,
): Promise<UserDocument | null> {
  const now = new Date();

  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        passwordHash,
        updatedBy,
        "security.passwordChangedAt": now,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("+passwordHash")
    .exec();
}

async function updateEmailVerification(
  userId: Types.ObjectId,
  verified: boolean,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        "security.emailVerified": verified,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updatePhoneVerification(
  userId: Types.ObjectId,
  verified: boolean,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        "security.phoneVerified": verified,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function updateTwoFactorStatus(
  userId: Types.ObjectId,
  enabled: boolean,
): Promise<UserDocument | null> {
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        "security.twoFactorEnabled": enabled,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

async function existsByEmail(
  email: string,
  excludeUserId?: Types.ObjectId,
): Promise<boolean> {
  return UserModel.existsByEmail(
    normalizeEmail(email),
    excludeUserId,
  );
}

async function existsByPhone(
  phone: string,
  excludeUserId?: Types.ObjectId,
): Promise<boolean> {
  return UserModel.existsByPhone(
    normalizePhone(phone),
    excludeUserId,
  );
}

async function existsByEmployeeCode(
  employeeCode: string,
  excludeUserId?: Types.ObjectId,
): Promise<boolean> {
  return UserModel.existsByEmployeeCode(
    normalizeEmployeeCode(employeeCode),
    excludeUserId,
  );
}

async function existsByEmployeeNumber(
  employeeNumber: string,
  excludeUserId?: Types.ObjectId,
): Promise<boolean> {
  return UserModel.existsByEmployeeNumber(
    normalizeEmployeeNumber(employeeNumber),
    excludeUserId,
  );
}

async function findUsersByRole(
  roleId: Types.ObjectId,
  includeInactive = false,
): Promise<UserDocument[]> {
  const filter: Record<string, unknown> = {
    $or: [
      {
        roleId,
      },
      {
        roleIds: roleId,
      },
    ],
  };

  if (!includeInactive) {
    filter.status = "ACTIVE";
  }

  return UserModel.find(filter)
    .sort({
      displayName: 1,
    })
    .exec();
}

async function findUsersByBranch(
  branchId: Types.ObjectId,
  includeInactive = false,
): Promise<UserDocument[]> {
  const filter: Record<string, unknown> = {
    $or: [
      {
        branchId,
      },
      {
        "branches.branchId": branchId,
      },
    ],
  };

  if (!includeInactive) {
    filter.status = "ACTIVE";
  }

  return UserModel.find(filter)
    .sort({
      displayName: 1,
    })
    .exec();
}

async function findUsersByDepartment(
  departmentId: Types.ObjectId,
  includeInactive = false,
): Promise<UserDocument[]> {
  const filter: Record<string, unknown> = {
    departmentId,
  };

  if (!includeInactive) {
    filter.status = "ACTIVE";
  }

  return UserModel.find(filter)
    .sort({
      displayName: 1,
    })
    .exec();
}

async function countUsers(
  filters: UserFilters = {},
): Promise<number> {
  return UserModel.countDocuments(
    buildUserFilter(filters),
  ).exec();
}

async function getUserStatistics() {
  const [
    total,
    active,
    inactive,
    suspended,
    locked,
    loginEnabled,
    loginDisabled,
    verifiedEmail,
    verifiedPhone,
  ] = await Promise.all([
    UserModel.countDocuments({}).exec(),

    UserModel.countDocuments({
      status: "ACTIVE",
    }).exec(),

    UserModel.countDocuments({
      status: "INACTIVE",
    }).exec(),

    UserModel.countDocuments({
      status: "SUSPENDED",
    }).exec(),

    UserModel.countDocuments({
      status: "LOCKED",
    }).exec(),

    UserModel.countDocuments({
      isLoginEnabled: true,
    }).exec(),

    UserModel.countDocuments({
      isLoginEnabled: false,
    }).exec(),

    UserModel.countDocuments({
      "security.emailVerified": true,
    }).exec(),

    UserModel.countDocuments({
      "security.phoneVerified": true,
    }).exec(),
  ]);

  return {
    total,
    active,
    inactive,
    suspended,
    locked,
    loginEnabled,
    loginDisabled,
    verifiedEmail,
    verifiedPhone,
  };
}

async function deleteUser(
  userId: Types.ObjectId,
  deletedBy?: Types.ObjectId,
): Promise<boolean> {
  const result = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        status: "INACTIVE",
        isLoginEnabled: false,
        isLocked: false,
        lockedUntil: undefined,
        updatedBy: deletedBy,
      },
    },
    {
      new: false,
      runValidators: true,
    },
  ).exec();

  return Boolean(result);
}

export const userRepository: UserRepository = {
  createUser,

  findUserById,
  findUserByEmail,
  findUserByPhone,
  findUserByEmployeeCode,
  findUserByEmployeeNumber,
  findActiveUserById,

  findAllUsers,
  findUsers,

  updateUser,
  updateUserStatus,
  updateLoginState,
  updateLockState,
  updateLoginActivity,

  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,

  updatePassword,
  updateEmailVerification,
  updatePhoneVerification,
  updateTwoFactorStatus,

  existsByEmail,
  existsByPhone,
  existsByEmployeeCode,
  existsByEmployeeNumber,

  findUsersByRole,
  findUsersByBranch,
  findUsersByDepartment,

  countUsers,
  getUserStatistics,

  deleteUser,
};

export {
  createUser,
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findUserByEmployeeCode,
  findUserByEmployeeNumber,
  findActiveUserById,
  findAllUsers,
  findUsers,
  updateUser,
  updateUserStatus,
  updateLoginState,
  updateLockState,
  updateLoginActivity,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  updatePassword,
  updateEmailVerification,
  updatePhoneVerification,
  updateTwoFactorStatus,
  existsByEmail,
  existsByPhone,
  existsByEmployeeCode,
  existsByEmployeeNumber,
  findUsersByRole,
  findUsersByBranch,
  findUsersByDepartment,
  countUsers,
  getUserStatistics,
  deleteUser,
};

export type { UserEntity };
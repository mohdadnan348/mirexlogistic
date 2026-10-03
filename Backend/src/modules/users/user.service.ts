import { Types } from "mongoose";

import { hashPassword, comparePassword } from "../../utils/password";
import { isValidObjectId } from "../../utils/object-id";

import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserAuthProfile,
  UserDataScope,
  UserEntity,
  UserFilters,
  UserListQuery,
  UserListResponse,
  UserResponse,
  UserStatistics,
} from "./user.types";

import {
  userRepository,
  type CreateUserRepositoryInput,
} from "./user.repository";

import {
  createUserValidator,
  updateUserValidator,
  updateUserPasswordValidator,
  userIdValidator,
  userStatusValidator,
  userListQueryValidator,
  assignUserRolesValidator,
  assignUserBranchesValidator,
} from "./user.validator";

export class UserServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code = "USER_SERVICE_ERROR",
    statusCode = 400,
  ) {
    super(message);

    this.name = "UserServiceError";
    this.code = code;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, UserServiceError.prototype);
  }
}

function toObjectId(
  value: string | Types.ObjectId,
): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (!isValidObjectId(value)) {
    throw new UserServiceError(
      "Invalid user ID.",
      "INVALID_USER_ID",
      400,
    );
  }

  return new Types.ObjectId(value);
}

function normalizeUserResponse(
  user: UserEntity,
): UserResponse {
  return {
    id: user._id.toString(),

    employeeCode: user.employeeCode,

    email: user.email,
    phone: user.phone,

    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,

    avatarUrl: user.avatarUrl,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,

    employeeType: user.employeeType,
    accountType: user.accountType,

    designation: user.designation,
    employeeNumber: user.employeeNumber,

    roleId: user.roleId.toString(),

    roleIds: user.roleIds.map(
      (roleId) => roleId.toString(),
    ),

    branches: user.branches.map(
      (branch) => ({
        branchId: branch.branchId.toString(),
        isPrimary: branch.isPrimary,
      }),
    ),

    branchId: user.branchId?.toString(),

    dataScope: user.dataScope,

    status: user.status,

    isLoginEnabled: user.isLoginEnabled,
    isLocked: user.isLocked,

    lockedUntil: user.lockedUntil,
    failedLoginAttempts: user.failedLoginAttempts,

    notificationPreferences: {
      inApp: user.notificationPreferences.inApp,
      email: user.notificationPreferences.email,
      sms: user.notificationPreferences.sms,
      whatsapp:
        user.notificationPreferences.whatsapp,
    },

    security: {
      twoFactorEnabled:
        user.security.twoFactorEnabled,

      emailVerified:
        user.security.emailVerified,

      phoneVerified:
        user.security.phoneVerified,
    },

    lastLoginAt: user.lastLoginAt,
    lastActivityAt: user.lastActivityAt,

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,

    createdBy: user.createdBy?.toString(),
    updatedBy: user.updatedBy?.toString(),
  };
}

function normalizeUserAuthProfile(
  user: UserEntity,
): UserAuthProfile {
  return {
    id: user._id.toString(),

    email: user.email,
    phone: user.phone,

    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,

    roleId: user.roleId.toString(),

    roleIds: user.roleIds.map(
      (roleId) => roleId.toString(),
    ),

    branchId: user.branchId?.toString(),
    departmentId:
      user.departmentId?.toString(),

    dataScope: user.dataScope,

    status: user.status,
    isLoginEnabled: user.isLoginEnabled,
    isLocked: user.isLocked,

    security: {
      twoFactorEnabled:
        user.security.twoFactorEnabled,

      emailVerified:
        user.security.emailVerified,

      phoneVerified:
        user.security.phoneVerified,
    },
  };
}

function normalizePagination(
  page: number,
  limit: number,
  total: number,
): Pick<
  UserListResponse,
  "page" | "limit" | "total" | "totalPages"
> {
  return {
    page,
    limit,
    total,
    totalPages:
      limit > 0
        ? Math.ceil(total / limit)
        : 0,
  };
}

function handleDuplicateKeyError(
  error: unknown,
): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    const duplicateError = error as {
      keyPattern?: Record<string, unknown>;
    };

    const duplicateFields = Object.keys(
      duplicateError.keyPattern ?? {},
    );

    if (duplicateFields.includes("email")) {
      throw new UserServiceError(
        "A user with this email already exists.",
        "EMAIL_ALREADY_EXISTS",
        409,
      );
    }

    if (duplicateFields.includes("phone")) {
      throw new UserServiceError(
        "A user with this phone number already exists.",
        "PHONE_ALREADY_EXISTS",
        409,
      );
    }

    if (
      duplicateFields.includes(
        "employeeCode",
      )
    ) {
      throw new UserServiceError(
        "A user with this employee code already exists.",
        "EMPLOYEE_CODE_ALREADY_EXISTS",
        409,
      );
    }

    if (
      duplicateFields.includes(
        "employeeNumber",
      )
    ) {
      throw new UserServiceError(
        "A user with this employee number already exists.",
        "EMPLOYEE_NUMBER_ALREADY_EXISTS",
        409,
      );
    }

    throw new UserServiceError(
      "A user with the provided unique information already exists.",
      "USER_ALREADY_EXISTS",
      409,
    );
  }

  throw error;
}

async function ensureUniqueUserFields(
  input: {
    email?: string;
    phone?: string;
    employeeCode?: string;
    employeeNumber?: string;
  },
  excludeUserId?: Types.ObjectId,
): Promise<void> {
  if (input.email) {
    const exists =
      await userRepository.existsByEmail(
        input.email,
        excludeUserId,
      );

    if (exists) {
      throw new UserServiceError(
        "A user with this email already exists.",
        "EMAIL_ALREADY_EXISTS",
        409,
      );
    }
  }

  if (input.phone) {
    const exists =
      await userRepository.existsByPhone(
        input.phone,
        excludeUserId,
      );

    if (exists) {
      throw new UserServiceError(
        "A user with this phone number already exists.",
        "PHONE_ALREADY_EXISTS",
        409,
      );
    }
  }

  if (input.employeeCode) {
    const exists =
      await userRepository.existsByEmployeeCode(
        input.employeeCode,
        excludeUserId,
      );

    if (exists) {
      throw new UserServiceError(
        "A user with this employee code already exists.",
        "EMPLOYEE_CODE_ALREADY_EXISTS",
        409,
      );
    }
  }

  if (input.employeeNumber) {
    const exists =
      await userRepository.existsByEmployeeNumber(
        input.employeeNumber,
        excludeUserId,
      );

    if (exists) {
      throw new UserServiceError(
        "A user with this employee number already exists.",
        "EMPLOYEE_NUMBER_ALREADY_EXISTS",
        409,
      );
    }
  }
}

async function createUserService(
  input: CreateUserInput,
): Promise<UserResponse> {
  const parsed =
    createUserValidator.parse(input);

  await ensureUniqueUserFields({
    email: parsed.email,
    phone: parsed.phone,
    employeeCode:
      parsed.employeeCode,
    employeeNumber:
      parsed.employeeNumber,
  });

  const passwordHash =
    await hashPassword(parsed.password);

  const repositoryInput: CreateUserRepositoryInput =
    {
      employeeCode:
        parsed.employeeCode,

      email: parsed.email,
      phone: parsed.phone,

      passwordHash,

      firstName: parsed.firstName,
      lastName: parsed.lastName,

      avatarUrl: parsed.avatarUrl,
      gender: parsed.gender,
      dateOfBirth:
        parsed.dateOfBirth,

      employeeType:
        parsed.employeeType,
      accountType:
        parsed.accountType,

      designation:
        parsed.designation,
      employeeNumber:
        parsed.employeeNumber,

      roleId: toObjectId(
        parsed.roleId,
      ),

      roleIds: (
        parsed.roleIds?.length
          ? parsed.roleIds
          : [parsed.roleId]
      ).map(toObjectId),

      departmentId:
        parsed.departmentId
          ? toObjectId(
              parsed.departmentId,
            )
          : undefined,

      branches:
        parsed.branches.map(
          (branch) => ({
            branchId: toObjectId(
              branch.branchId,
            ),
            isPrimary:
              branch.isPrimary,
          }),
        ),

      branchId: parsed.branchId
        ? toObjectId(
            parsed.branchId,
          )
        : undefined,

      dataScope:
        parsed.dataScope,

      status: parsed.status,

      isLoginEnabled:
        parsed.isLoginEnabled,

      notificationPreferences:
        parsed.notificationPreferences,

      createdBy: undefined,
    };

  try {
    const user =
      await userRepository.createUser(
        repositoryInput,
      );

    return normalizeUserResponse(
      user,
    );
  } catch (error) {
    handleDuplicateKeyError(error);
  }
}

async function getUserByIdService(
  userId: string,
): Promise<UserResponse> {
  const parsed =
    userIdValidator.parse({
      userId,
    });

  const user =
    await userRepository.findUserById(
      toObjectId(parsed.userId),
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    user,
  );
}

async function getUserByEmailService(
  email: string,
): Promise<UserResponse> {
  const user =
    await userRepository.findUserByEmail(
      email,
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    user,
  );
}

async function getUserByPhoneService(
  phone: string,
): Promise<UserResponse> {
  const user =
    await userRepository.findUserByPhone(
      phone,
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    user,
  );
}

async function getUserByEmployeeCodeService(
  employeeCode: string,
): Promise<UserResponse> {
  const user =
    await userRepository.findUserByEmployeeCode(
      employeeCode,
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    user,
  );
}

async function getUserAuthProfileService(
  userId: string,
): Promise<UserAuthProfile> {
  const parsed =
    userIdValidator.parse({
      userId,
    });

  const user =
    await userRepository.findUserById(
      toObjectId(parsed.userId),
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserAuthProfile(
    user,
  );
}

/**
 * Converts string-based query ObjectId filters
 * into MongoDB ObjectIds before repository access.
 */
async function listUsersService(
  query: UserListQuery = {},
): Promise<UserListResponse> {
  const parsed =
    userListQueryValidator.parse(
      query,
    );

  const {
    page,
    limit,
    sortBy,
    sortOrder,
    roleId,
    branchId,
    departmentId,
    ...filters
  } = parsed;

  const normalizedFilters: UserFilters =
    {
      ...filters,

      roleId: roleId
        ? new Types.ObjectId(
            roleId,
          )
        : undefined,

      branchId: branchId
        ? new Types.ObjectId(
            branchId,
          )
        : undefined,

      departmentId:
        departmentId
          ? new Types.ObjectId(
              departmentId,
            )
          : undefined,
    };

  const result =
    await userRepository.findUsers(
      normalizedFilters,
      {
        page,
        limit,
        sortBy,
        sortOrder,
      },
    );

  const pagination =
    normalizePagination(
      page,
      limit,
      result.total,
    );

  return {
    items: result.items.map(
      normalizeUserResponse,
    ),
    ...pagination,
  };
}

async function findUsersService(
  filters: UserFilters = {},
  query: UserListQuery = {},
): Promise<UserListResponse> {
  return listUsersService({
    ...query,

    employeeCode:
      filters.employeeCode,
    email: filters.email,
    phone: filters.phone,
    firstName:
      filters.firstName,
    lastName:
      filters.lastName,
    status: filters.status,
    employeeType:
      filters.employeeType,
    accountType:
      filters.accountType,
    dataScope:
      filters.dataScope,
    search: filters.search,

    roleId: filters.roleId,
    branchId: filters.branchId,
    departmentId: filters.departmentId,
  });
}

async function updateUserService(
  userId: string,
  input: UpdateUserInput,
  updatedBy?: string,
): Promise<UserResponse> {
  const parsedId =
    userIdValidator.parse({
      userId,
    });

  const parsed =
    updateUserValidator.parse(
      input,
    );

  const id = toObjectId(
    parsedId.userId,
  );

  const existing =
    await userRepository.findUserById(
      id,
    );

  if (!existing) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  await ensureUniqueUserFields(
    {
      email: parsed.email,
      phone: parsed.phone,
      employeeNumber:
        parsed.employeeNumber,
    },
    id,
  );

  const updateData = {
    ...parsed,

    roleId: parsed.roleId
      ? toObjectId(
          parsed.roleId,
        )
      : undefined,

    roleIds:
      parsed.roleIds?.map(
        toObjectId,
      ),

    departmentId:
      parsed.departmentId
        ? toObjectId(
            parsed.departmentId,
          )
        : undefined,

    branches:
      parsed.branches?.map(
        (branch) => ({
          branchId:
            toObjectId(
              branch.branchId,
            ),
          isPrimary:
            branch.isPrimary,
        }),
      ),

    branchId: parsed.branchId
      ? toObjectId(
          parsed.branchId,
        )
      : undefined,

    updatedBy: updatedBy
      ? toObjectId(
          updatedBy,
        )
      : undefined,
  };

  try {
    const updated =
      await userRepository.updateUser(
        id,
        updateData,
      );

    if (!updated) {
      throw new UserServiceError(
        "User could not be updated.",
        "USER_UPDATE_FAILED",
        500,
      );
    }

    return normalizeUserResponse(
      updated,
    );
  } catch (error) {
    if (
      error instanceof
      UserServiceError
    ) {
      throw error;
    }

    handleDuplicateKeyError(
      error,
    );
  }
}

async function updateUserStatusService(
  userId: string,
  input: UpdateUserStatusInput,
  updatedBy?: string,
): Promise<UserResponse> {
  const parsedId =
    userIdValidator.parse({
      userId,
    });

  const parsedStatus =
    userStatusValidator.parse(
      input,
    );

  const id = toObjectId(
    parsedId.userId,
  );

  const existing =
    await userRepository.findUserById(
      id,
    );

  if (!existing) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  const result =
    await userRepository.updateUserStatus(
      id,
      {
        status:
          parsedStatus.status,

        updatedBy: updatedBy
          ? toObjectId(
              updatedBy,
            )
          : undefined,
      },
    );

  if (!result) {
    throw new UserServiceError(
      "User status could not be updated.",
      "USER_STATUS_UPDATE_FAILED",
      500,
    );
  }

  return normalizeUserResponse(
    result,
  );
}

async function enableUserLoginService(
  userId: string,
  updatedBy?: string,
): Promise<UserResponse> {
  return updateLoginStateService(
    userId,
    true,
    updatedBy,
  );
}

async function disableUserLoginService(
  userId: string,
  updatedBy?: string,
): Promise<UserResponse> {
  return updateLoginStateService(
    userId,
    false,
    updatedBy,
  );
}

async function updateLoginStateService(
  userId: string,
  isLoginEnabled: boolean,
  updatedBy?: string,
): Promise<UserResponse> {
  const parsedId =
    userIdValidator.parse({
      userId,
    });

  const result =
    await userRepository.updateLoginState(
      toObjectId(
        parsedId.userId,
      ),
      isLoginEnabled,
      updatedBy
        ? toObjectId(
            updatedBy,
          )
        : undefined,
    );

  if (!result) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    result,
  );
}

async function lockUserService(
  userId: string,
  lockedUntil?: Date,
  updatedBy?: string,
): Promise<UserResponse> {
  const parsedId =
    userIdValidator.parse({
      userId,
    });

  const result =
    await userRepository.updateLockState(
      toObjectId(
        parsedId.userId,
      ),
      true,
      lockedUntil,
      updatedBy
        ? toObjectId(
            updatedBy,
          )
        : undefined,
    );

  if (!result) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    result,
  );
}

async function unlockUserService(
  userId: string,
  updatedBy?: string,
): Promise<UserResponse> {
  const parsedId =
    userIdValidator.parse({
      userId,
    });

  const result =
    await userRepository.updateLockState(
      toObjectId(
        parsedId.userId,
      ),
      false,
      undefined,
      updatedBy
        ? toObjectId(
            updatedBy,
          )
        : undefined,
    );

  if (!result) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    result,
  );
}

async function updateUserPasswordService(
  userId: string,
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
  updatedBy?: string,
): Promise<UserResponse> {
  const parsed =
    updateUserPasswordValidator.parse(
      input,
    );

  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const user =
    await userRepository.findUserById(
      id,
      true,
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  if (!user.passwordHash) {
    throw new UserServiceError(
      "User password is not available.",
      "PASSWORD_HASH_NOT_AVAILABLE",
      500,
    );
  }

  const currentPasswordMatches =
    await comparePassword(
      parsed.currentPassword,
      user.passwordHash,
    );

  if (!currentPasswordMatches) {
    throw new UserServiceError(
      "Current password is incorrect.",
      "INVALID_CURRENT_PASSWORD",
      400,
    );
  }

  if (
    parsed.currentPassword ===
    parsed.newPassword
  ) {
    throw new UserServiceError(
      "New password must be different from the current password.",
      "PASSWORD_REUSE_NOT_ALLOWED",
      400,
    );
  }

  const passwordHash =
    await hashPassword(
      parsed.newPassword,
    );

  const updated =
    await userRepository.updatePassword(
      id,
      passwordHash,
      updatedBy
        ? toObjectId(
            updatedBy,
          )
        : undefined,
    );

  if (!updated) {
    throw new UserServiceError(
      "Password could not be updated.",
      "PASSWORD_UPDATE_FAILED",
      500,
    );
  }

  return normalizeUserResponse(
    updated,
  );
}

async function assignUserRolesService(
  userId: string,
  input: {
    roleId: string;
    roleIds?: string[];
  },
  updatedBy?: string,
): Promise<UserResponse> {
  const parsed =
    assignUserRolesValidator.parse(
      input,
    );

  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const roleIds = Array.from(
    new Set([
      parsed.roleId,
      ...(parsed.roleIds ?? []),
    ]),
  ).map(toObjectId);

  const updated =
    await userRepository.updateUser(
      id,
      {
        roleId: toObjectId(
          parsed.roleId,
        ),

        roleIds,

        updatedBy: updatedBy
          ? toObjectId(
              updatedBy,
            )
          : undefined,
      },
    );

  if (!updated) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    updated,
  );
}

async function assignUserBranchesService(
  userId: string,
  input: {
    branches: Array<{
      branchId: string;
      isPrimary: boolean;
    }>;
    primaryBranchId?: string;
  },
  updatedBy?: string,
): Promise<UserResponse> {
  const parsed =
    assignUserBranchesValidator.parse(
      input,
    );

  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const branches =
    parsed.branches.map(
      (branch) => ({
        branchId:
          toObjectId(
            branch.branchId,
          ),

        isPrimary:
          parsed.primaryBranchId
            ? branch.branchId ===
              parsed.primaryBranchId
            : branch.isPrimary,
      }),
    );

  const primaryBranch =
    branches.find(
      (branch) =>
        branch.isPrimary,
    );

  const updated =
    await userRepository.updateUser(
      id,
      {
        branches,

        branchId:
          primaryBranch?.branchId,

        updatedBy: updatedBy
          ? toObjectId(
              updatedBy,
            )
          : undefined,
      },
    );

  if (!updated) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    updated,
  );
}

async function updateEmailVerificationService(
  userId: string,
  verified: boolean,
): Promise<UserResponse> {
  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const updated =
    await userRepository.updateEmailVerification(
      id,
      verified,
    );

  if (!updated) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    updated,
  );
}

async function updatePhoneVerificationService(
  userId: string,
  verified: boolean,
): Promise<UserResponse> {
  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const updated =
    await userRepository.updatePhoneVerification(
      id,
      verified,
    );

  if (!updated) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    updated,
  );
}

async function updateTwoFactorStatusService(
  userId: string,
  enabled: boolean,
): Promise<UserResponse> {
  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const updated =
    await userRepository.updateTwoFactorStatus(
      id,
      enabled,
    );

  if (!updated) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  return normalizeUserResponse(
    updated,
  );
}

async function findUsersByRoleService(
  roleId: string,
  includeInactive = false,
): Promise<UserResponse[]> {
  const id = toObjectId(
    roleId,
  );

  const users =
    await userRepository.findUsersByRole(
      id,
      includeInactive,
    );

  return users.map(
    normalizeUserResponse,
  );
}

async function findUsersByBranchService(
  branchId: string,
  includeInactive = false,
): Promise<UserResponse[]> {
  const id = toObjectId(
    branchId,
  );

  const users =
    await userRepository.findUsersByBranch(
      id,
      includeInactive,
    );

  return users.map(
    normalizeUserResponse,
  );
}

async function findUsersByDepartmentService(
  departmentId: string,
  includeInactive = false,
): Promise<UserResponse[]> {
  const id = toObjectId(
    departmentId,
  );

  const users =
    await userRepository.findUsersByDepartment(
      id,
      includeInactive,
    );

  return users.map(
    normalizeUserResponse,
  );
}

async function getUserStatisticsService(): Promise<UserStatistics> {
  const statistics =
    await userRepository.getUserStatistics();

  return {
    ...statistics,

    byStatus: {
      ACTIVE: statistics.active,
      INACTIVE: statistics.inactive,
      SUSPENDED: statistics.suspended,
      LOCKED: statistics.locked,
    },

    byRole: {},
    byBranch: {},
    byDepartment: {},
  };
}

async function deleteUserService(
  userId: string,
  deletedBy?: string,
): Promise<void> {
  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const user =
    await userRepository.findUserById(
      id,
    );

  if (!user) {
    throw new UserServiceError(
      "User not found.",
      "USER_NOT_FOUND",
      404,
    );
  }

  const deleted =
    await userRepository.deleteUser(
      id,
      deletedBy
        ? toObjectId(
            deletedBy,
          )
        : undefined,
    );

  if (!deleted) {
    throw new UserServiceError(
      "User could not be deactivated.",
      "USER_DELETE_FAILED",
      500,
    );
  }
}

async function userHasDataScopeService(
  userId: string,
  scope: UserDataScope,
): Promise<boolean> {
  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const user =
    await userRepository.findActiveUserById(
      id,
    );

  if (!user) {
    return false;
  }

  if (user.dataScope === "GLOBAL") {
    return true;
  }

  return user.dataScope === scope;
}

async function isUserActiveService(
  userId: string,
): Promise<boolean> {
  const id = toObjectId(
    userIdValidator.parse({
      userId,
    }).userId,
  );

  const user =
    await userRepository.findActiveUserById(
      id,
    );

  return Boolean(user);
}

export const userService = {
  createUser:
    createUserService,

  getUserById:
    getUserByIdService,

  getUserByEmail:
    getUserByEmailService,

  getUserByPhone:
    getUserByPhoneService,

  getUserByEmployeeCode:
    getUserByEmployeeCodeService,

  getUserAuthProfile:
    getUserAuthProfileService,

  listUsers:
    listUsersService,

  findUsers:
    findUsersService,

  updateUser:
    updateUserService,

  updateUserStatus:
    updateUserStatusService,

  enableUserLogin:
    enableUserLoginService,

  disableUserLogin:
    disableUserLoginService,

  updateLoginState:
    updateLoginStateService,

  lockUser:
    lockUserService,

  unlockUser:
    unlockUserService,

  updateUserPassword:
    updateUserPasswordService,

  assignUserRoles:
    assignUserRolesService,

  assignUserBranches:
    assignUserBranchesService,

  updateEmailVerification:
    updateEmailVerificationService,

  updatePhoneVerification:
    updatePhoneVerificationService,

  updateTwoFactorStatus:
    updateTwoFactorStatusService,

  findUsersByRole:
    findUsersByRoleService,

  findUsersByBranch:
    findUsersByBranchService,

  findUsersByDepartment:
    findUsersByDepartmentService,

  getUserStatistics:
    getUserStatisticsService,

  deleteUser:
    deleteUserService,

  userHasDataScope:
    userHasDataScopeService,

  isUserActive:
    isUserActiveService,
};

export {
  createUserService,
  getUserByIdService,
  getUserByEmailService,
  getUserByPhoneService,
  getUserByEmployeeCodeService,
  getUserAuthProfileService,
  listUsersService,
  findUsersService,
  updateUserService,
  updateUserStatusService,
  enableUserLoginService,
  disableUserLoginService,
  updateLoginStateService,
  lockUserService,
  unlockUserService,
  updateUserPasswordService,
  assignUserRolesService,
  assignUserBranchesService,
  updateEmailVerificationService,
  updatePhoneVerificationService,
  updateTwoFactorStatusService,
  findUsersByRoleService,
  findUsersByBranchService,
  findUsersByDepartmentService,
  getUserStatisticsService,
  deleteUserService,
  userHasDataScopeService,
  isUserActiveService,
};
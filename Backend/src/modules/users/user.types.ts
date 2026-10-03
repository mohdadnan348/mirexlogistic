import type { Types } from "mongoose";

/**
 * User account status.
 */
export type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "LOCKED";

/**
 * User gender.
 */
export type UserGender =
  | "MALE"
  | "FEMALE"
  | "OTHER"
  | "PREFER_NOT_TO_SAY";

/**
 * Data access scope assigned to a user.
 *
 * GLOBAL      → user can access permitted records across branches.
 * BRANCH      → user is restricted to assigned branch(es).
 * DEPARTMENT  → user is restricted to department-level records.
 */
export type UserDataScope =
  | "GLOBAL"
  | "BRANCH"
  | "DEPARTMENT";

/**
 * User employment type.
 */
export type UserEmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "TEMPORARY"
  | "INTERN";

/**
 * User account type.
 */
export type UserAccountType =
  | "EMPLOYEE"
  | "ADMINISTRATOR";

/**
 * User notification preference.
 */
export interface UserNotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

/**
 * User security settings.
 */
export interface UserSecuritySettings {
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
}

/**
 * User assigned branch.
 */
export interface UserBranchAssignment {
  branchId: Types.ObjectId;
  isPrimary: boolean;
}

/**
 * User entity.
 */
export interface UserEntity {
  _id: Types.ObjectId;

  /**
   * Employee/user unique code.
   *
   * Example:
   * EMP-000001
   */
  employeeCode: string;

  /**
   * Login email.
   */
  email: string;

  /**
   * Login phone number.
   */
  phone?: string;

  /**
   * Secure password hash.
   *
   * Plain-text passwords must never be stored.
   */
  passwordHash: string;

  /**
   * Basic identity.
   */
  firstName: string;
  lastName?: string;
  displayName: string;

  /**
   * Optional profile information.
   */
  avatarUrl?: string;
  gender?: UserGender;
  dateOfBirth?: Date;

  /**
   * Organization information.
   */
  employeeType: UserEmploymentType;
  accountType: UserAccountType;
  designation?: string;
  employeeNumber?: string;

  /**
   * Primary role.
   *
   * The role module stores the complete role definition.
   */
  roleId: Types.ObjectId;

  /**
   * Additional roles assigned to the user.
   */
  roleIds: Types.ObjectId[];

  /**
   * Primary department.
   */
  departmentId?: Types.ObjectId;

  /**
   * Branch assignments.
   *
   * A user can belong to one or more branches.
   */
  branches: UserBranchAssignment[];

  /**
   * Primary branch.
   */
  branchId?: Types.ObjectId;

  /**
   * Data visibility scope.
   */
  dataScope: UserDataScope;

  /**
   * Current account status.
   */
  status: UserStatus;

  /**
   * Whether the user can log in.
   */
  isLoginEnabled: boolean;

  /**
   * Whether the account is currently locked.
   */
  isLocked: boolean;

  /**
   * Login lock information.
   */
  lockedUntil?: Date;
  failedLoginAttempts: number;

  /**
   * Communication preferences.
   */
  notificationPreferences: UserNotificationPreferences;

  /**
   * Security information.
   */
  security: UserSecuritySettings;

  /**
   * User activity timestamps.
   */
  lastLoginAt?: Date;
  lastActivityAt?: Date;

  /**
   * Audit fields.
   */
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/**
 * Create-user input.
 */
export interface CreateUserInput {
  employeeCode?: string;

  email: string;
  phone?: string;

  password: string;

  firstName: string;
  lastName?: string;

  avatarUrl?: string;
  gender?: UserGender;
  dateOfBirth?: Date;

  employeeType?: UserEmploymentType;
  accountType?: UserAccountType;

  designation?: string;
  employeeNumber?: string;

  roleId: Types.ObjectId;
  roleIds?: Types.ObjectId[];

  departmentId?: Types.ObjectId;

  branches: UserBranchAssignment[];

  branchId?: Types.ObjectId;

  dataScope?: UserDataScope;

  status?: UserStatus;
  isLoginEnabled?: boolean;

  notificationPreferences?: Partial<UserNotificationPreferences>;

  createdBy?: Types.ObjectId;
}

/**
 * Update-user input.
 *
 * Password changes are handled through dedicated security/auth
 * operations rather than normal profile updates.
 */
export interface UpdateUserInput {
  email?: string;
  phone?: string;

  firstName?: string;
  lastName?: string;
  displayName?: string;

  avatarUrl?: string;
  gender?: UserGender;
  dateOfBirth?: Date;

  employeeType?: UserEmploymentType;
  accountType?: UserAccountType;

  designation?: string;
  employeeNumber?: string;

  roleId?: Types.ObjectId;
  roleIds?: Types.ObjectId[];

  departmentId?: Types.ObjectId;

  branches?: UserBranchAssignment[];
  branchId?: Types.ObjectId;

  dataScope?: UserDataScope;

  isLoginEnabled?: boolean;

  notificationPreferences?: Partial<UserNotificationPreferences>;

  updatedBy?: Types.ObjectId;
}

/**
 * User status update input.
 */
export interface UpdateUserStatusInput {
  status: UserStatus;
  updatedBy?: Types.ObjectId;
}

/**
 * User role assignment input.
 */
export interface AssignUserRolesInput {
  roleId: Types.ObjectId;
  roleIds?: Types.ObjectId[];
  updatedBy?: Types.ObjectId;
}

/**
 * User branch assignment input.
 */
export interface AssignUserBranchesInput {
  branches: UserBranchAssignment[];
  primaryBranchId?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/**
 * User filters.
 */
export interface UserFilters {
  employeeCode?: string;
  email?: string;
  phone?: string;

  firstName?: string;
  lastName?: string;

  roleId?: Types.ObjectId;
  departmentId?: Types.ObjectId;
  branchId?: Types.ObjectId;

  status?: UserStatus;
  employeeType?: UserEmploymentType;
  accountType?: UserAccountType;
  dataScope?: UserDataScope;

  isLoginEnabled?: boolean;
  isLocked?: boolean;

  search?: string;
}

/**
 * User list query.
 */
export interface UserListQuery extends UserFilters {
  page?: number;
  limit?: number;
  sortBy?: keyof UserEntity;
  sortOrder?: "asc" | "desc";
}

/**
 * Safe user response.
 *
 * Password hashes and other authentication secrets are never
 * returned through this interface.
 */
export interface UserResponse {
  id: string;

  employeeCode: string;

  email: string;
  phone?: string;

  firstName: string;
  lastName?: string;
  displayName: string;

  avatarUrl?: string;
  gender?: UserGender;
  dateOfBirth?: Date;

  employeeType: UserEmploymentType;
  accountType: UserAccountType;

  designation?: string;
  employeeNumber?: string;

  roleId: string;
  roleIds: string[];

  departmentId?: string;

  branches: Array<{
    branchId: string;
    isPrimary: boolean;
  }>;

  branchId?: string;

  dataScope: UserDataScope;

  status: UserStatus;

  isLoginEnabled: boolean;
  isLocked: boolean;

  lockedUntil?: Date;
  failedLoginAttempts: number;

  notificationPreferences: UserNotificationPreferences;

  security: {
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
  };

  lastLoginAt?: Date;
  lastActivityAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  createdBy?: string;
  updatedBy?: string;
}

/**
 * Paginated users response.
 */
export interface UserListResponse {
  items: UserResponse[];

  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * User statistics.
 */
export interface UserStatistics {
  total: number;

  active: number;
  inactive: number;
  suspended: number;
  locked: number;

  loginEnabled: number;
  loginDisabled: number;

  verifiedEmail: number;
  verifiedPhone: number;

  byRole: Record<string, number>;
  byBranch: Record<string, number>;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
}

/**
 * User login/account information used by authentication-related
 * services without exposing the password hash.
 */
export interface UserAuthProfile {
  id: string;
  email: string;
  phone?: string;

  firstName: string;
  lastName?: string;
  displayName: string;

  roleId: string;
  roleIds: string[];

  branchId?: string;
  departmentId?: string;

  dataScope: UserDataScope;

  status: UserStatus;
  isLoginEnabled: boolean;
  isLocked: boolean;

  security: {
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

/**
 * User session summary.
 */
export interface UserSessionSummary {
  sessionId: string;
  userId: string;

  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt: Date;

  ipAddress?: string;
  userAgent?: string;

  isCurrent?: boolean;
}

/**
 * User activity summary.
 */
export interface UserActivitySummary {
  userId: string;

  lastLoginAt?: Date;
  lastActivityAt?: Date;

  failedLoginAttempts: number;

  isLocked: boolean;
  lockedUntil?: Date;
}

/**
 * User password update input.
 */
export interface UpdateUserPasswordInput {
  currentPassword: string;
  newPassword: string;
  updatedBy?: Types.ObjectId;
}

/**
 * User account lock input.
 */
export interface LockUserInput {
  lockedUntil?: Date;
  updatedBy?: Types.ObjectId;
}

/**
 * User account unlock input.
 */
export interface UnlockUserInput {
  updatedBy?: Types.ObjectId;
}

/**
 * User deletion input.
 */
export interface DeleteUserInput {
  deletedBy?: Types.ObjectId;
}

/**
 * User permission context.
 *
 * This is useful for RBAC middleware and avoids coupling the
 * middleware directly to the complete User document.
 */
export interface UserPermissionContext {
  userId: string;

  roleId: string;
  roleIds: string[];

  branchId?: string;
  branchIds: string[];

  departmentId?: string;

  dataScope: UserDataScope;

  status: UserStatus;
  isLoginEnabled: boolean;
}

/**
 * User branch access result.
 */
export interface UserBranchAccessResult {
  userId: string;

  allowed: boolean;

  branchId?: string;

  allowedBranchIds: string[];

  dataScope: UserDataScope;
}

/**
 * User account state result.
 */
export interface UserAccountState {
  exists: boolean;
  active: boolean;
  loginEnabled: boolean;
  locked: boolean;
  suspended: boolean;
}
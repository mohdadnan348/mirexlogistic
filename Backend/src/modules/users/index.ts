/**
 * MirexCargo
 * Users Module
 *
 * Central barrel file for the Users module.
 *
 * Module flow:
 *
 * user.types
 *     ↓
 * user.model
 *     ↓
 * user.repository
 *     ↓
 * user.validator
 *     ↓
 * user.service
 *     ↓
 * user.controller
 *     ↓
 * user.routes
 *     ↓
 * index.ts
 */

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

export {
  default as userRoutes,
} from "./user.routes";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type {
  UserStatus,
  UserGender,
  UserDataScope,
  UserEmploymentType,
  UserAccountType,
  UserNotificationPreferences,
  UserSecuritySettings,
  UserBranchAssignment,
  UserEntity,
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
  AssignUserRolesInput,
  AssignUserBranchesInput,
  UserFilters,
  UserListQuery,
  UserResponse,
  UserListResponse,
  UserStatistics,
  UserAuthProfile,
  UserSessionSummary,
  UserActivitySummary,
  UpdateUserPasswordInput,
  LockUserInput,
  UnlockUserInput,
  DeleteUserInput,
  UserPermissionContext,
  UserBranchAccessResult,
  UserAccountState,
} from "./user.types";

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

export {
  UserModel,
  isUserDocument,
  isUserObjectId,
} from "./user.model";

export type {
  UserDocument,
} from "./user.model";

/* -------------------------------------------------------------------------- */
/* Repository                                                                 */
/* -------------------------------------------------------------------------- */

export {
  userRepository,
} from "./user.repository";

export type {
  UserListResult,
  CreateUserRepositoryInput,
  UpdateUserRepositoryInput,
  UserRepository,
} from "./user.repository";

/* -------------------------------------------------------------------------- */
/* Validators                                                                 */
/* -------------------------------------------------------------------------- */

export {
  createUserValidator,
  updateUserValidator,
  userIdValidator,
  userEmployeeCodeValidator,
  userEmployeeNumberValidator,
  userEmailValidator,
  userPhoneValidator,
  userStatusValidator,
  userLoginStateValidator,
  lockUserValidator,
  assignUserRolesValidator,
  assignUserBranchesValidator,
  twoFactorStatusValidator,
  updateUserPasswordValidator,
  userFiltersValidator,
  paginationQuerySchema,
  userListQueryValidator,
  userSearchValidator,
  userExistenceValidator,
  userAccessContextValidator,
} from "./user.validator";

/* -------------------------------------------------------------------------- */
/* Services                                                                   */
/* -------------------------------------------------------------------------- */

export {
  UserServiceError,

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

  userService,
} from "./user.service";
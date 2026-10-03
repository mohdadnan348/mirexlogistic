import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { Types } from "mongoose";

import {
  sendCreated,
  sendNoContent,
  sendSuccess,
  sendUnprocessableEntity,
} from "../../utils/api-response";

import { asyncHandler } from "../../utils/async-handler";

import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "./user.types";

import {
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
  isUserActiveService,
} from "./user.service";

import {
  createUserValidator,
  updateUserValidator,
  updateUserPasswordValidator,
  userIdValidator,
  userStatusValidator,
  userListQueryValidator,
  assignUserRolesValidator,
  assignUserBranchesValidator,
  lockUserValidator,
  twoFactorStatusValidator,
} from "./user.validator";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RequestWithAuth = Request & {
  auth?: {
    user?: {
      id?: string;
      _id?: string;
      userId?: string;
    };
  };
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getRouteParameter(
  value: string | string[] | undefined,
  parameterName: string,
): string {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new UserServiceError(
      `${parameterName} is required.`,
      "INVALID_ROUTE_PARAMETER",
      400,
    );
  }

  return value.trim();
}

function getAuthenticatedUserId(
  request: Request,
): string | undefined {
  const auth = (
    request as RequestWithAuth
  ).auth;

  const user = auth?.user;

  if (!user) {
    return undefined;
  }

  const value =
    user.id ??
    user._id ??
    user.userId;

  if (
    typeof value !== "string" ||
    !Types.ObjectId.isValid(value)
  ) {
    return undefined;
  }

  return value;
}

function getOptionalAuthenticatedUserId(
  request: Request,
): string | undefined {
  return getAuthenticatedUserId(
    request,
  );
}

function getBooleanQueryParameter(
  value:
    | string
    | string[]
    | undefined,
  defaultValue = false,
): boolean {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (
    value === undefined ||
    value === ""
  ) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value.toLowerCase() ===
    "true";
}

function normalizeValidationIssues(
  error: unknown,
): Array<{
  path: (string | number)[];
  message: string;
}> {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return [];
  }

  if (
    "issues" in error &&
    Array.isArray(
      (
        error as {
          issues?: unknown;
        }
      ).issues,
    )
  ) {
    return (
      error as {
        issues: Array<{
          path?: unknown;
          message?: unknown;
        }>;
      }
    ).issues.map((issue) => ({
      path: Array.isArray(issue.path)
        ? issue.path.filter(
            (
              item,
            ): item is
              | string
              | number =>
              typeof item ===
                "string" ||
              typeof item ===
                "number",
          )
        : [],
      message:
        typeof issue.message ===
        "string"
          ? issue.message
          : "Invalid value.",
    }));
  }

  return [];
}

function handleControllerError(
  error: unknown,
  response: Response,
  next: NextFunction,
): void {
  if (
    error instanceof UserServiceError
  ) {
    sendUnprocessableEntity(
      response,
      error.message,
      error.code,
    );
    return;
  }

  next(error);
}

function validateBody<T>(
  validator: {
    parse: (
      value: unknown,
    ) => T;
  },
  request: Request,
  response: Response,
): T | undefined {
  try {
    return validator.parse(
      request.body,
    );
  } catch (error) {
    const issues =
      normalizeValidationIssues(
        error,
      );

    sendUnprocessableEntity(
      response,
      "Validation failed.",
      "VALIDATION_ERROR",
    );

    return undefined;
  }
}

function validateParams<T>(
  validator: {
    parse: (
      value: unknown,
    ) => T;
  },
  request: Request,
  response: Response,
): T | undefined {
  try {
    return validator.parse(
      request.params,
    );
  } catch {
    sendUnprocessableEntity(
      response,
      "Validation failed.",
      "VALIDATION_ERROR",
    );

    return undefined;
  }
}

function validateQuery<T>(
  validator: {
    parse: (
      value: unknown,
    ) => T;
  },
  request: Request,
  response: Response,
): T | undefined {
  try {
    return validator.parse(
      request.query,
    );
  } catch {
    sendUnprocessableEntity(
      response,
      "Validation failed.",
      "VALIDATION_ERROR",
    );

    return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/* Create User                                                                */
/* -------------------------------------------------------------------------- */

export const createUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const parsed =
          validateBody(
            createUserValidator,
            request,
            response,
          );

        if (!parsed) {
          return;
        }

        const createdBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const input: CreateUserInput =
          {
            ...parsed,
            ...(createdBy
              ? {
                  createdBy,
                }
              : {}),
          };

        const user =
          await createUserService(
            input,
          );

        sendCreated(
          response,
          user,
          "User created successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Get User                                                                   */
/* -------------------------------------------------------------------------- */

export const getUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const parsed =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!parsed) {
          return;
        }

        const user =
          await getUserByIdService(
            parsed.userId,
          );

        sendSuccess(
          response,
          user,
          "User retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Current Authenticated User                                                 */
/* -------------------------------------------------------------------------- */

export const getAuthenticatedUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const userId =
          getAuthenticatedUserId(
            request,
          );

        if (!userId) {
          sendUnprocessableEntity(
            response,
            "Authenticated user could not be resolved.",
            "AUTHENTICATED_USER_NOT_FOUND",
          );
          return;
        }

        const user =
          await getUserByIdService(
            userId,
          );

        sendSuccess(
          response,
          user,
          "Authenticated user retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* User Auth Profile                                                          */
/* -------------------------------------------------------------------------- */

export const getUserAuthProfileController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const parsed =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!parsed) {
          return;
        }

        const profile =
          await getUserAuthProfileService(
            parsed.userId,
          );

        sendSuccess(
          response,
          profile,
          "User authentication profile retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Get By Email                                                               */
/* -------------------------------------------------------------------------- */

export const getUserByEmailController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const email =
          typeof request.query
            .email === "string"
            ? request.query.email
            : undefined;

        if (!email) {
          sendUnprocessableEntity(
            response,
            "Email is required.",
            "EMAIL_REQUIRED",
          );
          return;
        }

        const user =
          await getUserByEmailService(
            email,
          );

        sendSuccess(
          response,
          user,
          "User retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Get By Phone                                                               */
/* -------------------------------------------------------------------------- */

export const getUserByPhoneController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const phone =
          typeof request.query
            .phone === "string"
            ? request.query.phone
            : undefined;

        if (!phone) {
          sendUnprocessableEntity(
            response,
            "Phone number is required.",
            "PHONE_REQUIRED",
          );
          return;
        }

        const user =
          await getUserByPhoneService(
            phone,
          );

        sendSuccess(
          response,
          user,
          "User retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Get By Employee Code                                                       */
/* -------------------------------------------------------------------------- */

export const getUserByEmployeeCodeController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const employeeCode =
          getRouteParameter(
            request.params.employeeCode,
            "employeeCode",
          );

        const user =
          await getUserByEmployeeCodeService(
            employeeCode,
          );

        sendSuccess(
          response,
          user,
          "User retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* List Users                                                                 */
/* -------------------------------------------------------------------------- */

export const listUsersController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        /*
         * IMPORTANT:
         * Controller no longer calls userRepository.findUsers().
         *
         * Query → Service → Repository → Model
         *
         * This also prevents string ObjectId filters from reaching
         * the repository directly.
         */
        const parsed =
          validateQuery(
            userListQueryValidator,
            request,
            response,
          );

        if (!parsed) {
          return;
        }

        const result =
          await listUsersService(
            parsed,
          );

        sendSuccess(
          response,
          result,
          "Users retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Search Users                                                               */
/* -------------------------------------------------------------------------- */

export const searchUsersController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const parsed =
          validateQuery(
            userListQueryValidator,
            request,
            response,
          );

        if (!parsed) {
          return;
        }

        const result =
          await listUsersService(
            parsed,
          );

        sendSuccess(
          response,
          result,
          "User search completed successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Update User                                                                */
/* -------------------------------------------------------------------------- */

export const updateUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            updateUserValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const input: UpdateUserInput =
          {
            ...body,
            ...(updatedBy
              ? {
                  updatedBy,
                }
              : {}),
          };

        const user =
          await updateUserService(
            params.userId,
            input,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User updated successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Update User Status                                                         */
/* -------------------------------------------------------------------------- */

export const updateUserStatusController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            userStatusValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await updateUserStatusService(
            params.userId,
            body as UpdateUserStatusInput,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User status updated successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Enable Login                                                               */
/* -------------------------------------------------------------------------- */

export const enableUserLoginController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await enableUserLoginService(
            params.userId,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User login enabled successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Disable Login                                                              */
/* -------------------------------------------------------------------------- */

export const disableUserLoginController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await disableUserLoginService(
            params.userId,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User login disabled successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Lock User                                                                  */
/* -------------------------------------------------------------------------- */

export const lockUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            lockUserValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const lockedUntil =
          body.lockedUntil
            ? new Date(
                body.lockedUntil,
              )
            : undefined;

        const user =
          await lockUserService(
            params.userId,
            lockedUntil,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User locked successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Unlock User                                                                */
/* -------------------------------------------------------------------------- */

export const unlockUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await unlockUserService(
            params.userId,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User unlocked successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Update Password                                                            */
/* -------------------------------------------------------------------------- */

export const updateUserPasswordController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            updateUserPasswordValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await updateUserPasswordService(
            params.userId,
            body,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User password updated successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Assign Roles                                                               */
/* -------------------------------------------------------------------------- */

export const assignUserRolesController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            assignUserRolesValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await assignUserRolesService(
            params.userId,
            body,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User roles assigned successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Assign Branches                                                            */
/* -------------------------------------------------------------------------- */

export const assignUserBranchesController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            assignUserBranchesValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const updatedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        const user =
          await assignUserBranchesService(
            params.userId,
            body,
            updatedBy,
          );

        sendSuccess(
          response,
          user,
          "User branches assigned successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Verify Email                                                               */
/* -------------------------------------------------------------------------- */

export const verifyUserEmailController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const user =
          await updateEmailVerificationService(
            params.userId,
            true,
          );

        sendSuccess(
          response,
          user,
          "User email verified successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Unverify Email                                                             */
/* -------------------------------------------------------------------------- */

export const unverifyUserEmailController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const user =
          await updateEmailVerificationService(
            params.userId,
            false,
          );

        sendSuccess(
          response,
          user,
          "User email verification removed successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Verify Phone                                                               */
/* -------------------------------------------------------------------------- */

export const verifyUserPhoneController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const user =
          await updatePhoneVerificationService(
            params.userId,
            true,
          );

        sendSuccess(
          response,
          user,
          "User phone verified successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Unverify Phone                                                             */
/* -------------------------------------------------------------------------- */

export const unverifyUserPhoneController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const user =
          await updatePhoneVerificationService(
            params.userId,
            false,
          );

        sendSuccess(
          response,
          user,
          "User phone verification removed successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Two Factor Authentication                                                  */
/* -------------------------------------------------------------------------- */

export const updateUserTwoFactorController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const body =
          validateBody(
            twoFactorStatusValidator,
            request,
            response,
          );

        if (!body) {
          return;
        }

        const user =
          await updateTwoFactorStatusService(
            params.userId,
            body.enabled,
          );

        sendSuccess(
          response,
          user,
          body.enabled
            ? "Two-factor authentication enabled successfully."
            : "Two-factor authentication disabled successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Users By Role                                                              */
/* -------------------------------------------------------------------------- */

export const getUsersByRoleController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const roleId =
          getRouteParameter(
            request.params.roleId,
            "roleId",
          );

        const includeInactive =
          getBooleanQueryParameter(
            request.query
              .includeInactive as
              | string
              | string[]
              | undefined,
            false,
          );

        const users =
          await findUsersByRoleService(
            roleId,
            includeInactive,
          );

        sendSuccess(
          response,
          users,
          "Users retrieved by role successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Users By Branch                                                            */
/* -------------------------------------------------------------------------- */

export const getUsersByBranchController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const branchId =
          getRouteParameter(
            request.params.branchId,
            "branchId",
          );

        const includeInactive =
          getBooleanQueryParameter(
            request.query
              .includeInactive as
              | string
              | string[]
              | undefined,
            false,
          );

        const users =
          await findUsersByBranchService(
            branchId,
            includeInactive,
          );

        sendSuccess(
          response,
          users,
          "Users retrieved by branch successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Users By Department                                                        */
/* -------------------------------------------------------------------------- */

export const getUsersByDepartmentController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const departmentId =
          getRouteParameter(
            request.params.departmentId,
            "departmentId",
          );

        const includeInactive =
          getBooleanQueryParameter(
            request.query
              .includeInactive as
              | string
              | string[]
              | undefined,
            false,
          );

        const users =
          await findUsersByDepartmentService(
            departmentId,
            includeInactive,
          );

        sendSuccess(
          response,
          users,
          "Users retrieved by department successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* User Statistics                                                            */
/* -------------------------------------------------------------------------- */

export const getUserStatisticsController =
  asyncHandler(
    async (
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        /*
         * IMPORTANT:
         * Statistics are now completely handled by the service.
         *
         * This fixes the previous UserStatistics mismatch because
         * getUserStatisticsService() returns byStatus as well.
         */
        const statistics =
          await getUserStatisticsService();

        sendSuccess(
          response,
          statistics,
          "User statistics retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Is User Active                                                             */
/* -------------------------------------------------------------------------- */

export const isUserActiveController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const active =
          await isUserActiveService(
            params.userId,
          );

        sendSuccess(
          response,
          {
            userId:
              params.userId,
            active,
          },
          "User activity status retrieved successfully.",
        );
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );

/* -------------------------------------------------------------------------- */
/* Delete User                                                                */
/* -------------------------------------------------------------------------- */

export const deleteUserController =
  asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const params =
          validateParams(
            userIdValidator,
            request,
            response,
          );

        if (!params) {
          return;
        }

        const deletedBy =
          getOptionalAuthenticatedUserId(
            request,
          );

        await deleteUserService(
          params.userId,
          deletedBy,
        );

        sendNoContent(response);
      } catch (error) {
        handleControllerError(
          error,
          response,
          next,
        );
      }
    },
  );
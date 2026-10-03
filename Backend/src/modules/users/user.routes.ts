import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { z, type ZodType } from "zod";

import { asyncHandler } from "../../utils/async-handler";

import {
  assignUserBranchesController,
  assignUserRolesController,
  createUserController,
  deleteUserController,
  disableUserLoginController,
  enableUserLoginController,
  getAuthenticatedUserController,
  getUserAuthProfileController,
  getUserByEmailController,
  getUserByEmployeeCodeController,
  getUserByPhoneController,
  getUserController,
  getUserStatisticsController,
  getUsersByBranchController,
  getUsersByDepartmentController,
  getUsersByRoleController,
  isUserActiveController,
  listUsersController,
  lockUserController,
  searchUsersController,
  unlockUserController,
  unverifyUserEmailController,
  unverifyUserPhoneController,
  updateUserController,
  updateUserPasswordController,
  updateUserStatusController,
  updateUserTwoFactorController,
  verifyUserEmailController,
  verifyUserPhoneController,
} from "./user.controller";

import {
  assignUserBranchesValidator,
  assignUserRolesValidator,
  createUserValidator,
  lockUserValidator,
  updateUserPasswordValidator,
  updateUserValidator,
  userIdValidator,
  userListQueryValidator,
  userStatusValidator,
} from "./user.validator";

const router = Router();

/**
 * --------------------------------------------------------------------------
 * Controller Adapter
 * --------------------------------------------------------------------------
 *
 * The existing user controllers are Express RequestHandlers.
 *
 * asyncHandler expects an async/promise-based handler, so every controller
 * is normalized here before being registered on the router.
 *
 * This keeps:
 *
 * Route
 *   ↓
 * asyncHandler
 *   ↓
 * Controller
 *   ↓
 * Service
 *   ↓
 * Repository
 *
 * intact without modifying controller implementations.
 */
function wrapController(
  controller: RequestHandler,
): RequestHandler {
  return asyncHandler(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      await controller(
        request,
        response,
        next,
      );
    },
  );
}

/**
 * --------------------------------------------------------------------------
 * Validation Helpers
 * --------------------------------------------------------------------------
 *
 * The centralized validation middleware is introduced later in the
 * development order, so this module must remain independently usable.
 */

function validate<T extends ZodType>(
  schema: T,
  source:
    | "body"
    | "query"
    | "params" = "body",
): RequestHandler {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const result = schema.safeParse(
      request[source],
    );

    if (!result.success) {
      response.status(422).json({
        success: false,
        message: "Validation failed.",
        error: {
          code: "VALIDATION_ERROR",
          issues: result.error.issues.map(
            (issue) => ({
              path: issue.path,
              message: issue.message,
              code: issue.code,
            }),
          ),
        },
      });

      return;
    }

    if (source === "body") {
      request.body = result.data;
    } else if (source === "query") {
      Object.assign(
        request.query,
        result.data,
      );
    } else {
      Object.assign(
        request.params,
        result.data,
      );
    }

    next();
  };
}

/**
 * --------------------------------------------------------------------------
 * Combined Validation Helper
 * --------------------------------------------------------------------------
 *
 * Used when a route requires both:
 *
 * - params validation
 * - body validation
 *
 * before reaching the controller.
 */

function validateCombined(
  schemas: Array<{
    source:
      | "body"
      | "query"
      | "params";
    schema: ZodType;
  }>,
): RequestHandler {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    for (const item of schemas) {
      const result =
        item.schema.safeParse(
          request[item.source],
        );

      if (!result.success) {
        response.status(422).json({
          success: false,
          message: "Validation failed.",
          error: {
            code: "VALIDATION_ERROR",
            issues:
              result.error.issues.map(
                (issue) => ({
                  path: issue.path,
                  message: issue.message,
                  code: issue.code,
                }),
              ),
          },
        });

        return;
      }

      if (item.source === "body") {
        request.body = result.data;
      } else if (
        item.source === "query"
      ) {
        Object.assign(
          request.query,
          result.data,
        );
      } else {
        Object.assign(
          request.params,
          result.data,
        );
      }
    }

    next();
  };
}

/**
 * ==========================================================================
 * USER STATISTICS
 * ==========================================================================
 */

/**
 * GET /users/statistics
 *
 * User dashboard/statistics.
 */
router.get(
  "/statistics",
  wrapController(
    getUserStatisticsController,
  ),
);

/**
 * ==========================================================================
 * CURRENT USER
 * ==========================================================================
 */

/**
 * GET /users/me
 *
 * Current authenticated user.
 */
router.get(
  "/me",
  wrapController(
    getAuthenticatedUserController,
  ),
);

/**
 * ==========================================================================
 * USER SEARCH
 * ==========================================================================
 */

/**
 * GET /users/search
 *
 * Search users with filters and pagination.
 *
 * This route must be registered before /:userId.
 */
router.get(
  "/search",
  validate(
    userListQueryValidator,
    "query",
  ),
  wrapController(
    searchUsersController,
  ),
);

/**
 * ==========================================================================
 * USER LOOKUPS
 * ==========================================================================
 */

/**
 * GET /users/by-email
 *
 * Query:
 * ?email=user@example.com
 */
router.get(
  "/by-email",
  wrapController(
    getUserByEmailController,
  ),
);

/**
 * GET /users/by-phone
 *
 * Query:
 * ?phone=+919876543210
 */
router.get(
  "/by-phone",
  wrapController(
    getUserByPhoneController,
  ),
);

/**
 * GET /users/by-employee-code/:employeeCode
 */
router.get(
  "/by-employee-code/:employeeCode",
  wrapController(
    getUserByEmployeeCodeController,
  ),
);

/**
 * GET /users/by-role/:roleId
 */
router.get(
  "/by-role/:roleId",
  wrapController(
    getUsersByRoleController,
  ),
);

/**
 * GET /users/by-branch/:branchId
 */
router.get(
  "/by-branch/:branchId",
  wrapController(
    getUsersByBranchController,
  ),
);

/**
 * GET /users/by-department/:departmentId
 */
router.get(
  "/by-department/:departmentId",
  wrapController(
    getUsersByDepartmentController,
  ),
);

/**
 * ==========================================================================
 * USER AUTH PROFILE
 * ==========================================================================
 */

/**
 * GET /users/:userId/auth-profile
 *
 * Internal authentication/RBAC profile.
 */
router.get(
  "/:userId/auth-profile",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    getUserAuthProfileController,
  ),
);

/**
 * GET /users/:userId/active
 */
router.get(
  "/:userId/active",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    isUserActiveController,
  ),
);

/**
 * ==========================================================================
 * CREATE USER
 * ==========================================================================
 */

/**
 * POST /users
 *
 * Create a new internal user.
 */
router.post(
  "/",
  validate(
    createUserValidator,
    "body",
  ),
  wrapController(
    createUserController,
  ),
);

/**
 * ==========================================================================
 * LIST USERS
 * ==========================================================================
 */

/**
 * GET /users
 *
 * List users with pagination/filtering.
 */
router.get(
  "/",
  validate(
    userListQueryValidator,
    "query",
  ),
  wrapController(
    listUsersController,
  ),
);

/**
 * ==========================================================================
 * GET SINGLE USER
 * ==========================================================================
 */

/**
 * GET /users/:userId
 */
router.get(
  "/:userId",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    getUserController,
  ),
);

/**
 * ==========================================================================
 * UPDATE USER
 * ==========================================================================
 */

/**
 * PATCH /users/:userId
 */
router.patch(
  "/:userId",
  validateCombined([
    {
      source: "params",
      schema: userIdValidator,
    },
    {
      source: "body",
      schema: updateUserValidator,
    },
  ]),
  wrapController(
    updateUserController,
  ),
);

/**
 * ==========================================================================
 * USER STATUS
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/status
 */
router.patch(
  "/:userId/status",
  validateCombined([
    {
      source: "params",
      schema: userIdValidator,
    },
    {
      source: "body",
      schema: userStatusValidator,
    },
  ]),
  wrapController(
    updateUserStatusController,
  ),
);

/**
 * ==========================================================================
 * LOGIN ACCESS
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/login/enable
 */
router.patch(
  "/:userId/login/enable",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    enableUserLoginController,
  ),
);

/**
 * PATCH /users/:userId/login/disable
 */
router.patch(
  "/:userId/login/disable",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    disableUserLoginController,
  ),
);

/**
 * ==========================================================================
 * ACCOUNT LOCKING
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/lock
 */
router.patch(
  "/:userId/lock",
  validateCombined([
    {
      source: "params",
      schema: userIdValidator,
    },
    {
      source: "body",
      schema: lockUserValidator,
    },
  ]),
  wrapController(
    lockUserController,
  ),
);

/**
 * PATCH /users/:userId/unlock
 */
router.patch(
  "/:userId/unlock",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    unlockUserController,
  ),
);

/**
 * ==========================================================================
 * PASSWORD
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/password
 */
router.patch(
  "/:userId/password",
  validateCombined([
    {
      source: "params",
      schema: userIdValidator,
    },
    {
      source: "body",
      schema:
        updateUserPasswordValidator,
    },
  ]),
  wrapController(
    updateUserPasswordController,
  ),
);

/**
 * ==========================================================================
 * ROLE ASSIGNMENT
 * ==========================================================================
 */

/**
 * PUT /users/:userId/roles
 */
router.put(
  "/:userId/roles",
  validateCombined([
    {
      source: "params",
      schema: userIdValidator,
    },
    {
      source: "body",
      schema: assignUserRolesValidator,
    },
  ]),
  wrapController(
    assignUserRolesController,
  ),
);

/**
 * ==========================================================================
 * BRANCH ASSIGNMENT
 * ==========================================================================
 */

/**
 * PUT /users/:userId/branches
 */
router.put(
  "/:userId/branches",
  validateCombined([
    {
      source: "params",
      schema: userIdValidator,
    },
    {
      source: "body",
      schema:
        assignUserBranchesValidator,
    },
  ]),
  wrapController(
    assignUserBranchesController,
  ),
);

/**
 * ==========================================================================
 * EMAIL VERIFICATION
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/email/verify
 */
router.patch(
  "/:userId/email/verify",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    verifyUserEmailController,
  ),
);

/**
 * PATCH /users/:userId/email/unverify
 */
router.patch(
  "/:userId/email/unverify",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    unverifyUserEmailController,
  ),
);

/**
 * ==========================================================================
 * PHONE VERIFICATION
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/phone/verify
 */
router.patch(
  "/:userId/phone/verify",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    verifyUserPhoneController,
  ),
);

/**
 * PATCH /users/:userId/phone/unverify
 */
router.patch(
  "/:userId/phone/unverify",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    unverifyUserPhoneController,
  ),
);

/**
 * ==========================================================================
 * TWO FACTOR AUTHENTICATION
 * ==========================================================================
 */

/**
 * PATCH /users/:userId/two-factor
 */
router.patch(
  "/:userId/two-factor",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    updateUserTwoFactorController,
  ),
);

/**
 * ==========================================================================
 * DELETE USER
 * ==========================================================================
 */

/**
 * DELETE /users/:userId
 *
 * Soft-deactivates the user account.
 */
router.delete(
  "/:userId",
  validate(
    userIdValidator,
    "params",
  ),
  wrapController(
    deleteUserController,
  ),
);

export default router;
import { Router, type RequestHandler } from "express";
import type { ZodType } from "zod";

import { asyncHandler } from "../../utils/async-handler";

import {
  createRoleValidator,
  roleCodeValidator,
  roleIdValidator,
  roleListQueryValidator,
  roleNameValidator,
  rolePermissionsValidator,
  roleStatusValidator,
  updateRoleValidator,
} from "./role.validator";

import {
  createRoleController,
  deleteRoleController,
  getRoleByCodeController,
  getRoleController,
  getRoleStatisticsController,
  listRolesController,
  replaceRolePermissionsController,
  updateRoleController,
  updateRoleStatusController,
} from "./role.controller";

/* -------------------------------------------------------------------------- */
/*                         Validation Middleware                              */
/* -------------------------------------------------------------------------- */

/**
 * Local Zod adapter is intentionally kept here because the centralized
 * validation middleware is introduced later in the development order.
 *
 * This middleware validates the complete request input:
 * body + params + query.
 */
function validate<TSchema extends ZodType>(
  schema: TSchema,
): RequestHandler {
  return (request, response, next) => {
    const validationInput = {
      ...(request.body ?? {}),
      ...(request.params ?? {}),
      ...(request.query ?? {}),
    };

    const result =
      schema.safeParse(validationInput);

    if (!result.success) {
      response.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: result.error.issues.map(
          (issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          }),
        ),
      });

      return;
    }

    request.body = result.data;

    next();
  };
}

/* -------------------------------------------------------------------------- */
/*                                Router                                      */
/* -------------------------------------------------------------------------- */

const router = Router();

/* -------------------------------------------------------------------------- */
/*                              Statistics                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /roles/statistics
 *
 * Returns aggregate role statistics.
 */
router.get(
  "/statistics",
  asyncHandler(
    getRoleStatisticsController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                              List Roles                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /roles
 *
 * Supports:
 * - pagination
 * - sorting
 * - code filtering
 * - name filtering
 * - access level filtering
 * - scope filtering
 * - status filtering
 * - system/custom role filtering
 */
router.get(
  "/",
  validate(roleListQueryValidator),
  asyncHandler(listRolesController),
);

/* -------------------------------------------------------------------------- */
/*                            Get Role By Code                                */
/* -------------------------------------------------------------------------- */

/**
 * GET /roles/code/:code
 */
router.get(
  "/code/:code",
  validate(roleCodeValidator),
  asyncHandler(
    getRoleByCodeController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                              Get Role                                      */
/* -------------------------------------------------------------------------- */

/**
 * GET /roles/:roleId
 */
router.get(
  "/:roleId",
  validate(roleIdValidator),
  asyncHandler(getRoleController),
);

/* -------------------------------------------------------------------------- */
/*                              Create Role                                   */
/* -------------------------------------------------------------------------- */

/**
 * POST /roles
 */
router.post(
  "/",
  validate(createRoleValidator),
  asyncHandler(
    createRoleController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                              Update Role                                   */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /roles/:roleId
 */
router.patch(
  "/:roleId",
  validate(updateRoleValidator),
  asyncHandler(
    updateRoleController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                           Update Role Status                               */
/* -------------------------------------------------------------------------- */

/**
 * PATCH /roles/:roleId/status
 */
router.patch(
  "/:roleId/status",
  validate(roleStatusValidator),
  asyncHandler(
    updateRoleStatusController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                         Replace Permissions                                */
/* -------------------------------------------------------------------------- */

/**
 * PUT /roles/:roleId/permissions
 */
router.put(
  "/:roleId/permissions",
  validate(rolePermissionsValidator),
  asyncHandler(
    replaceRolePermissionsController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                              Delete Role                                   */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /roles/:roleId
 */
router.delete(
  "/:roleId",
  validate(roleIdValidator),
  asyncHandler(
    deleteRoleController,
  ),
);

/* -------------------------------------------------------------------------- */
/*                                Export                                      */
/* -------------------------------------------------------------------------- */

export default router;
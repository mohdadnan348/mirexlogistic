import { Router, type RequestHandler } from "express";
import type { ZodType } from "zod";

import { asyncHandler } from "../../utils/async-handler";

import {
  createPermissionValidator,
  bulkPermissionStatusValidator,
  permissionCodeValidator,
  permissionFiltersValidator,
  permissionIdValidator,
  permissionIdsValidator,
  permissionIdentityValidator,
  permissionListQueryValidator,
  permissionNameValidator,
  permissionStatusValidator,
  updatePermissionValidator,
} from "./permission.validator";

import {
  activatePermissionController,
  createPermissionController,
  deactivatePermissionController,
  deletePermissionController,
  getActivePermissionByCodeController,
  getActivePermissionsByIdsController,
  getActivePermissionsByModuleController,
  getPermissionByCodeController,
  getPermissionByNameController,
  getPermissionController,
  getPermissionStatisticsController,
  getPermissionsByIdsController,
  getPermissionsByModuleController,
  hasActivePermissionController,
  listPermissionsController,
  permissionCodeExistsController,
  permissionMatchesController,
  updatePermissionController,
  updatePermissionStatusController,
  validateActivePermissionIdsController,
  validatePermissionIdsController,
} from "./permission.controller";

/**
 * Local validation adapter.
 *
 * The centralized validation middleware is introduced later
 * in the development order. This adapter keeps the current
 * module independently functional until that middleware exists.
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

    const result = schema.safeParse(
      validationInput,
    );

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

const router = Router();

/**
 * Permission statistics.
 *
 * Must be registered before /:permissionId.
 */
router.get(
  "/statistics",
  asyncHandler(
    getPermissionStatisticsController,
  ),
);

/**
 * Permission code existence check.
 *
 * Must be registered before /code/:code and /:permissionId.
 */
router.get(
  "/code/:code/exists",
  validate(permissionCodeValidator),
  asyncHandler(
    permissionCodeExistsController,
  ),
);

/**
 * Active permission check by code.
 */
router.get(
  "/code/:code/active",
  validate(permissionCodeValidator),
  asyncHandler(
    hasActivePermissionController,
  ),
);

/**
 * Get permission by code.
 */
router.get(
  "/code/:code",
  validate(permissionCodeValidator),
  asyncHandler(
    getPermissionByCodeController,
  ),
);

/**
 * Get active permission by code.
 */
router.get(
  "/active/code/:code",
  validate(permissionCodeValidator),
  asyncHandler(
    getActivePermissionByCodeController,
  ),
);

/**
 * Get permission by name.
 */
router.get(
  "/name/:name",
  validate(permissionNameValidator),
  asyncHandler(
    getPermissionByNameController,
  ),
);

/**
 * Get all permissions belonging to a module.
 */
router.get(
  "/module/:module",
  validate(permissionFiltersValidator),
  asyncHandler(
    getPermissionsByModuleController,
  ),
);

/**
 * Get active permissions belonging to a module.
 */
router.get(
  "/module/:module/active",
  validate(permissionFiltersValidator),
  asyncHandler(
    getActivePermissionsByModuleController,
  ),
);

/**
 * List permissions.
 */
router.get(
  "/",
  validate(permissionListQueryValidator),
  asyncHandler(
    listPermissionsController,
  ),
);

/**
 * Create permission.
 */
router.post(
  "/",
  validate(createPermissionValidator),
  asyncHandler(
    createPermissionController,
  ),
);

/**
 * Get permissions by IDs.
 */
router.post(
  "/by-ids",
  validate(permissionIdsValidator),
  asyncHandler(
    getPermissionsByIdsController,
  ),
);

/**
 * Get active permissions by IDs.
 */
router.post(
  "/by-ids/active",
  validate(permissionIdsValidator),
  asyncHandler(
    getActivePermissionsByIdsController,
  ),
);

/**
 * Validate permission IDs.
 */
router.post(
  "/validate-ids",
  validate(permissionIdsValidator),
  asyncHandler(
    validatePermissionIdsController,
  ),
);

/**
 * Validate active permission IDs.
 */
router.post(
  "/validate-ids/active",
  validate(permissionIdsValidator),
  asyncHandler(
    validateActivePermissionIdsController,
  ),
);

/**
 * Update permission status in bulk.
 */
router.patch(
  "/status/bulk",
  validate(bulkPermissionStatusValidator),
  asyncHandler(
    async (request, response, next) => {
      try {
        const {
          permissionIds,
          status,
        } = request.body as {
          permissionIds: string[];
          status: "ACTIVE" | "INACTIVE";
        };

        const results = [];

        for (const permissionId of permissionIds) {
          if (status === "ACTIVE") {
            results.push(
              await activatePermissionController(
                request,
                response,
                next,
              ),
            );
          } else {
            results.push(
              await deactivatePermissionController(
                request,
                response,
                next,
              ),
            );
          }
        }

        return results;
      } catch (error) {
        next(error);
      }
    },
  ),
);

/**
 * Permission identity check.
 *
 * This route is intentionally kept separate from the
 * permission CRUD endpoints.
 */
router.post(
  "/match/:code",
  validate(
    permissionIdentityValidator,
  ),
  asyncHandler(
    permissionMatchesController,
  ),
);

/**
 * Get permission by ID.
 *
 * This route must remain after all named static routes.
 */
router.get(
  "/:permissionId",
  validate(permissionIdValidator),
  asyncHandler(
    getPermissionController,
  ),
);

/**
 * Update permission.
 */
router.patch(
  "/:permissionId",
  validate(updatePermissionValidator),
  asyncHandler(
    updatePermissionController,
  ),
);

/**
 * Update permission status.
 */
router.patch(
  "/:permissionId/status",
  validate(permissionStatusValidator),
  asyncHandler(
    updatePermissionStatusController,
  ),
);

/**
 * Activate permission.
 */
router.patch(
  "/:permissionId/activate",
  validate(permissionIdValidator),
  asyncHandler(
    activatePermissionController,
  ),
);

/**
 * Deactivate permission.
 */
router.patch(
  "/:permissionId/deactivate",
  validate(permissionIdValidator),
  asyncHandler(
    deactivatePermissionController,
  ),
);

/**
 * Delete permission.
 */
router.delete(
  "/:permissionId",
  validate(permissionIdValidator),
  asyncHandler(
    deletePermissionController,
  ),
);

export default router;
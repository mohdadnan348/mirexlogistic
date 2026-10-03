import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import {
  sendCreated,
  sendNoContent,
  sendSuccess,
} from "../../utils/api-response";

import type {
  PermissionListQuery,
  PermissionStatus,
} from "./permission.types";

import {
  PermissionServiceError,
  activatePermissionService,
  createPermissionService,
  deactivatePermissionService,
  deletePermissionService,
  findActivePermissionsByModuleService,
  findPermissionsByModuleService,
  getActivePermissionByCodeService,
  getActivePermissionsByIdsService,
  getPermissionByCodeService,
  getPermissionByIdService,
  getPermissionByNameService,
  getPermissionsByIdsService,
  getPermissionStatisticsService,
  hasActivePermissionService,
  listPermissionsService,
  permissionCodeExistsService,
  permissionMatchesService,
  updatePermissionService,
  updatePermissionStatusService,
  validateActivePermissionIdsService,
  validatePermissionIdsService,
} from "./permission.service";

import type {
  CreatePermissionValidatorInput,
  UpdatePermissionValidatorInput,
} from "./permission.validator";

/**
 * Resolve the authenticated user's ObjectId.
 *
 * The global AuthContext exposes the authenticated user through
 * request.auth.user and the user identifier through user.id.
 */
function getAuthenticatedUserId(
  request: Request,
): Types.ObjectId | undefined {
  const userId = request.auth?.user?.id;

  if (!userId) {
    return undefined;
  }

  if (!Types.ObjectId.isValid(userId)) {
    return undefined;
  }

  return new Types.ObjectId(userId);
}

/**
 * Normalize an Express route parameter.
 */
function getRouteParameter(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/**
 * Handle permission service errors consistently.
 */
function handlePermissionControllerError(
  error: unknown,
  response: Response,
  next: NextFunction,
): void {
  if (!(error instanceof PermissionServiceError)) {
    next(error);
    return;
  }

  const payload: Record<string, unknown> = {
    success: false,
    message: error.message,
    code: error.code,
  };

  if (error.details !== undefined) {
    payload.details = error.details;
  }

  response.status(error.statusCode).json(payload);
}

/**
 * Create permission.
 */
export async function createPermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      request.body as CreatePermissionValidatorInput;

    const permission =
      await createPermissionService({
        ...input,
        createdBy: getAuthenticatedUserId(request),
      });

    sendCreated(
      response,
      permission,
      "Permission created successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get permission by ID.
 */
export async function getPermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionId = getRouteParameter(
      request.params.permissionId,
    );

    if (!permissionId) {
      response.status(400).json({
        success: false,
        message: "Permission ID is required.",
        code: "INVALID_PERMISSION_ID",
      });
      return;
    }

    const permission =
      await getPermissionByIdService(permissionId);

    sendSuccess(
      response,
      permission,
      "Permission retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get permission by code.
 */
export async function getPermissionByCodeController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = getRouteParameter(
      request.params.code,
    );

    if (!code) {
      response.status(400).json({
        success: false,
        message: "Permission code is required.",
        code: "INVALID_PERMISSION_CODE",
      });
      return;
    }

    const permission =
      await getPermissionByCodeService(code);

    sendSuccess(
      response,
      permission,
      "Permission retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get active permission by code.
 */
export async function getActivePermissionByCodeController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = getRouteParameter(
      request.params.code,
    );

    if (!code) {
      response.status(400).json({
        success: false,
        message: "Permission code is required.",
        code: "INVALID_PERMISSION_CODE",
      });
      return;
    }

    const permission =
      await getActivePermissionByCodeService(code);

    sendSuccess(
      response,
      permission,
      "Active permission retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get permission by name.
 */
export async function getPermissionByNameController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const name = getRouteParameter(
      request.params.name,
    );

    if (!name) {
      response.status(400).json({
        success: false,
        message: "Permission name is required.",
        code: "INVALID_PERMISSION_NAME",
      });
      return;
    }

    const permission =
      await getPermissionByNameService(name);

    sendSuccess(
      response,
      permission,
      "Permission retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * List permissions.
 */
export async function listPermissionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      request.body as PermissionListQuery;

    const result =
      await listPermissionsService(query);

    sendSuccess(
      response,
      {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      "Permissions retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Update permission.
 */
export async function updatePermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionId = getRouteParameter(
      request.params.permissionId,
    );

    if (!permissionId) {
      response.status(400).json({
        success: false,
        message: "Permission ID is required.",
        code: "INVALID_PERMISSION_ID",
      });
      return;
    }

    const input =
      request.body as UpdatePermissionValidatorInput;

    const permission =
      await updatePermissionService(
        permissionId,
        {
          ...input,
          updatedBy:
            getAuthenticatedUserId(request),
        },
      );

    sendSuccess(
      response,
      permission,
      "Permission updated successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Update permission status.
 */
export async function updatePermissionStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionId = getRouteParameter(
      request.params.permissionId,
    );

    if (!permissionId) {
      response.status(400).json({
        success: false,
        message: "Permission ID is required.",
        code: "INVALID_PERMISSION_ID",
      });
      return;
    }

    const status =
      request.body.status as PermissionStatus;

    const permission =
      await updatePermissionStatusService(
        permissionId,
        status,
        getAuthenticatedUserId(request),
      );

    sendSuccess(
      response,
      permission,
      "Permission status updated successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Activate permission.
 */
export async function activatePermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionId = getRouteParameter(
      request.params.permissionId,
    );

    if (!permissionId) {
      response.status(400).json({
        success: false,
        message: "Permission ID is required.",
        code: "INVALID_PERMISSION_ID",
      });
      return;
    }

    const permission =
      await activatePermissionService(
        permissionId,
        getAuthenticatedUserId(request),
      );

    sendSuccess(
      response,
      permission,
      "Permission activated successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Deactivate permission.
 */
export async function deactivatePermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionId = getRouteParameter(
      request.params.permissionId,
    );

    if (!permissionId) {
      response.status(400).json({
        success: false,
        message: "Permission ID is required.",
        code: "INVALID_PERMISSION_ID",
      });
      return;
    }

    const permission =
      await deactivatePermissionService(
        permissionId,
        getAuthenticatedUserId(request),
      );

    sendSuccess(
      response,
      permission,
      "Permission deactivated successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Delete permission.
 */
export async function deletePermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionId = getRouteParameter(
      request.params.permissionId,
    );

    if (!permissionId) {
      response.status(400).json({
        success: false,
        message: "Permission ID is required.",
        code: "INVALID_PERMISSION_ID",
      });
      return;
    }

    await deletePermissionService(permissionId);

    sendNoContent(response);
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get permission statistics.
 */
export async function getPermissionStatisticsController(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const statistics =
      await getPermissionStatisticsService();

    sendSuccess(
      response,
      statistics,
      "Permission statistics retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get permissions by module.
 */
export async function getPermissionsByModuleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const module = getRouteParameter(
      request.params.module,
    );

    if (!module) {
      response.status(400).json({
        success: false,
        message: "Permission module is required.",
        code: "INVALID_PERMISSION_MODULE",
      });
      return;
    }

    const permissions =
      await findPermissionsByModuleService(
        module as Parameters<
          typeof findPermissionsByModuleService
        >[0],
      );

    sendSuccess(
      response,
      permissions,
      "Module permissions retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get active permissions by module.
 */
export async function getActivePermissionsByModuleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const module = getRouteParameter(
      request.params.module,
    );

    if (!module) {
      response.status(400).json({
        success: false,
        message: "Permission module is required.",
        code: "INVALID_PERMISSION_MODULE",
      });
      return;
    }

    const permissions =
      await findActivePermissionsByModuleService(
        module as Parameters<
          typeof findActivePermissionsByModuleService
        >[0],
      );

    sendSuccess(
      response,
      permissions,
      "Active module permissions retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get permissions by IDs.
 */
export async function getPermissionsByIdsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionIds =
      request.body.permissionIds as string[];

    const permissions =
      await getPermissionsByIdsService(
        permissionIds,
      );

    sendSuccess(
      response,
      permissions,
      "Permissions retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Get active permissions by IDs.
 */
export async function getActivePermissionsByIdsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionIds =
      request.body.permissionIds as string[];

    const permissions =
      await getActivePermissionsByIdsService(
        permissionIds,
      );

    sendSuccess(
      response,
      permissions,
      "Active permissions retrieved successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Validate permission IDs.
 */
export async function validatePermissionIdsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionIds =
      request.body.permissionIds as string[];

    const valid =
      await validatePermissionIdsService(
        permissionIds,
      );

    sendSuccess(
      response,
      {
        valid,
        permissionIds,
      },
      valid
        ? "All permission IDs are valid."
        : "One or more permission IDs are invalid.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Validate active permission IDs.
 */
export async function validateActivePermissionIdsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const permissionIds =
      request.body.permissionIds as string[];

    const valid =
      await validateActivePermissionIdsService(
        permissionIds,
      );

    sendSuccess(
      response,
      {
        valid,
        permissionIds,
      },
      valid
        ? "All permission IDs are active and valid."
        : "One or more permission IDs are inactive or invalid.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Check whether a permission code exists.
 */
export async function permissionCodeExistsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = getRouteParameter(
      request.params.code,
    );

    if (!code) {
      response.status(400).json({
        success: false,
        message: "Permission code is required.",
        code: "INVALID_PERMISSION_CODE",
      });
      return;
    }

    const exists =
      await permissionCodeExistsService(code);

    sendSuccess(
      response,
      {
        code: code.toUpperCase(),
        exists,
      },
      "Permission code availability checked successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Check whether a permission is active.
 */
export async function hasActivePermissionController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = getRouteParameter(
      request.params.code,
    );

    if (!code) {
      response.status(400).json({
        success: false,
        message: "Permission code is required.",
        code: "INVALID_PERMISSION_CODE",
      });
      return;
    }

    const active =
      await hasActivePermissionService(code);

    sendSuccess(
      response,
      {
        code: code.toUpperCase(),
        active,
      },
      "Permission status checked successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}

/**
 * Check permission module/action/scope combination.
 */
export async function permissionMatchesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = getRouteParameter(
      request.params.code,
    );

    if (!code) {
      response.status(400).json({
        success: false,
        message: "Permission code is required.",
        code: "INVALID_PERMISSION_CODE",
      });
      return;
    }

    const {
      module,
      action,
      scope,
    } = request.body;

    const matches =
      await permissionMatchesService(
        code,
        module,
        action,
        scope,
      );

    sendSuccess(
      response,
      {
        code: code.toUpperCase(),
        module,
        action,
        scope,
        matches,
      },
      "Permission match checked successfully.",
    );
  } catch (error) {
    handlePermissionControllerError(
      error,
      response,
      next,
    );
  }
}
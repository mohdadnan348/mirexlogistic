import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import {
  sendCreated,
  sendNoContent,
  sendSuccess,
  sendUnprocessableEntity,
} from "../../utils/api-response";

import {
  createRoleService,
  deleteRoleService,
  getRoleByCodeService,
  getRoleByIdService,
  getRoleStatisticsService,
  listRolesService,
  replaceRolePermissionsService,
  updateRoleService,
  updateRoleStatusService,
  RoleServiceError,
} from "./role.service";

import type {
  CreateRoleInput,
  RoleEntity,
  RoleListQuery,
  RolePermission,
  RoleStatus,
  UpdateRoleInput,
} from "./role.types";

/* -------------------------------------------------------------------------- */
/*                              Controller Helpers                            */
/* -------------------------------------------------------------------------- */

function getAuthenticatedUserId(
  request: Request,
): Types.ObjectId | undefined {
  const auth = request.auth;

  if (!auth?.user?.id) {
    return undefined;
  }

  const userId = auth.user.id;

  if (!Types.ObjectId.isValid(userId)) {
    return undefined;
  }

  return new Types.ObjectId(userId);
}

function getRoleId(
  request: Request,
): string | undefined {
  const value = request.params.roleId;

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getRoleCode(
  request: Request,
): string | undefined {
  const value = request.params.code;

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function handleControllerError(
  error: unknown,
  response: Response,
  next: NextFunction,
): void {
  if (error instanceof RoleServiceError) {
    sendUnprocessableEntity(
      response,
      error.message,
      error.code,
    );
    return;
  }

  next(error);
}

function parseBoolean(
  value: unknown,
): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

function parseNumber(
  value: unknown,
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

/* -------------------------------------------------------------------------- */
/*                              Create Role                                   */
/* -------------------------------------------------------------------------- */

export async function createRoleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body =
      request.body as CreateRoleInput;

    const input: CreateRoleInput = {
      ...body,
      createdBy:
        getAuthenticatedUserId(request),
    };

    const role =
      await createRoleService(input);

    sendCreated(
      response,
      role,
      "Role created successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Get Role                                      */
/* -------------------------------------------------------------------------- */

export async function getRoleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = getRoleId(request);

    if (!roleId) {
      sendUnprocessableEntity(
        response,
        "Role ID is required.",
        "ROLE_ID_REQUIRED",
      );
      return;
    }

    const role =
      await getRoleByIdService(roleId);

    sendSuccess(
      response,
      role,
      "Role retrieved successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            Get Role By Code                                */
/* -------------------------------------------------------------------------- */

export async function getRoleByCodeController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const code = getRoleCode(request);

    if (!code) {
      sendUnprocessableEntity(
        response,
        "Role code is required.",
        "ROLE_CODE_REQUIRED",
      );
      return;
    }

    const role =
      await getRoleByCodeService(code);

    sendSuccess(
      response,
      role,
      "Role retrieved successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              List Roles                                    */
/* -------------------------------------------------------------------------- */

export async function listRolesController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query =
      request.query as Record<
        string,
        unknown
      >;

    const sortBy =
      typeof query.sortBy === "string"
        ? query.sortBy as keyof RoleEntity
        : undefined;

    const filters: RoleListQuery = {
      page: parseNumber(query.page),
      limit: parseNumber(query.limit),

      sortBy,

      sortOrder:
        query.sortOrder === "asc" ||
        query.sortOrder === "desc"
          ? query.sortOrder
          : undefined,

      code:
        typeof query.code === "string"
          ? query.code
          : undefined,

      name:
        typeof query.name === "string"
          ? query.name
          : undefined,

      accessLevel:
        typeof query.accessLevel === "string"
          ? query.accessLevel as RoleListQuery["accessLevel"]
          : undefined,

      scope:
        typeof query.scope === "string"
          ? query.scope as RoleListQuery["scope"]
          : undefined,

      status:
        typeof query.status === "string"
          ? query.status as RoleListQuery["status"]
          : undefined,

      isSystemRole:
        parseBoolean(
          query.isSystemRole,
        ),
    };

    const result =
      await listRolesService(filters);

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
      "Roles retrieved successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Update Role                                   */
/* -------------------------------------------------------------------------- */

export async function updateRoleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = getRoleId(request);

    if (!roleId) {
      sendUnprocessableEntity(
        response,
        "Role ID is required.",
        "ROLE_ID_REQUIRED",
      );
      return;
    }

    const body =
      request.body as UpdateRoleInput;

    const input: UpdateRoleInput = {
      ...body,
      updatedBy:
        getAuthenticatedUserId(request),
    };

    const role =
      await updateRoleService(
        roleId,
        input,
      );

    sendSuccess(
      response,
      role,
      "Role updated successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                           Update Role Status                               */
/* -------------------------------------------------------------------------- */

export async function updateRoleStatusController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = getRoleId(request);

    if (!roleId) {
      sendUnprocessableEntity(
        response,
        "Role ID is required.",
        "ROLE_ID_REQUIRED",
      );
      return;
    }

    const body = request.body as {
      status?: RoleStatus;
    };

    if (
      body.status !== "ACTIVE" &&
      body.status !== "INACTIVE"
    ) {
      sendUnprocessableEntity(
        response,
        "Status must be ACTIVE or INACTIVE.",
        "INVALID_ROLE_STATUS",
      );
      return;
    }

    const role =
      await updateRoleStatusService(
        roleId,
        body.status,
        getAuthenticatedUserId(request),
      );

    sendSuccess(
      response,
      role,
      "Role status updated successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         Replace Permissions                                */
/* -------------------------------------------------------------------------- */

export async function replaceRolePermissionsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = getRoleId(request);

    if (!roleId) {
      sendUnprocessableEntity(
        response,
        "Role ID is required.",
        "ROLE_ID_REQUIRED",
      );
      return;
    }

    const body = request.body as {
      permissions?: RolePermission[];
    };

    if (!Array.isArray(body.permissions)) {
      sendUnprocessableEntity(
        response,
        "Permissions must be an array.",
        "INVALID_PERMISSIONS",
      );
      return;
    }

    const role =
      await replaceRolePermissionsService(
        roleId,
        body.permissions,
        getAuthenticatedUserId(request),
      );

    sendSuccess(
      response,
      role,
      "Role permissions updated successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Delete Role                                   */
/* -------------------------------------------------------------------------- */

export async function deleteRoleController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roleId = getRoleId(request);

    if (!roleId) {
      sendUnprocessableEntity(
        response,
        "Role ID is required.",
        "ROLE_ID_REQUIRED",
      );
      return;
    }

    await deleteRoleService(roleId);

    sendNoContent(response);
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                           Role Statistics                                  */
/* -------------------------------------------------------------------------- */

export async function getRoleStatisticsController(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const statistics =
      await getRoleStatisticsService();

    sendSuccess(
      response,
      statistics,
      "Role statistics retrieved successfully.",
    );
  } catch (error) {
    handleControllerError(
      error,
      response,
      next,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Controller Object                             */
/* -------------------------------------------------------------------------- */

export const roleController = {
  createRole:
    createRoleController,

  getRole:
    getRoleController,

  getRoleByCode:
    getRoleByCodeController,

  listRoles:
    listRolesController,

  updateRole:
    updateRoleController,

  updateRoleStatus:
    updateRoleStatusController,

  replaceRolePermissions:
    replaceRolePermissionsController,

  deleteRole:
    deleteRoleController,

  getRoleStatistics:
    getRoleStatisticsController,
};
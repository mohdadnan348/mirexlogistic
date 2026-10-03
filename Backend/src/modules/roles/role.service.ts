import { Types } from "mongoose";

import {
  createRole,
  deleteRole,
  findAllRoles,
  findRoleByCode,
  findRoleById,
  findRoleByName,
  findRoles,
  getRoleStatistics,
  replaceRolePermissions,
  updateRole,
  updateRoleStatus,
} from "./role.repository";

import type {
  CreateRoleInput,
  RoleFilters,
  RoleListQuery,
  RolePermission,
  RoleResponse,
  RoleStatus,
  UpdateRoleInput,
} from "./role.types";

/* -------------------------------------------------------------------------- */
/*                              Service Errors                                */
/* -------------------------------------------------------------------------- */

export class RoleServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    code: string,
    message: string,
    statusCode = 400,
  ) {
    super(message);

    this.name = "RoleServiceError";
    this.code = code;
    this.statusCode = statusCode;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Helpers                                       */
/* -------------------------------------------------------------------------- */

function normalizeObjectId(
  value: Types.ObjectId | string,
  fieldName = "roleId",
): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (!Types.ObjectId.isValid(value)) {
    throw new RoleServiceError(
      "INVALID_OBJECT_ID",
      `${fieldName} is invalid.`,
      400,
    );
  }

  return new Types.ObjectId(value);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeName(name: string): string {
  return name.trim();
}

function toRoleResponse(
  role: {
    _id: Types.ObjectId;
    code: string;
    name: string;
    description?: string;
    accessLevel: RoleResponse["accessLevel"];
    scope: RoleResponse["scope"];
    status: RoleResponse["status"];
    permissions: RolePermission[];
    isSystemRole: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
  },
): RoleResponse {
  return {
    id: role._id.toString(),

    code: role.code,
    name: role.name,
    description: role.description,

    accessLevel: role.accessLevel,
    scope: role.scope,
    status: role.status,

    permissions: role.permissions,

    isSystemRole: role.isSystemRole,

    createdAt: role.createdAt,
    updatedAt: role.updatedAt,

    createdBy: role.createdBy?.toString(),
    updatedBy: role.updatedBy?.toString(),
  };
}

/* -------------------------------------------------------------------------- */
/*                              Create Role                                   */
/* -------------------------------------------------------------------------- */

export async function createRoleService(
  input: CreateRoleInput,
): Promise<RoleResponse> {
  const code = normalizeCode(input.code);
  const name = normalizeName(input.name);

  const existingCode = await findRoleByCode(code);

  if (existingCode) {
    throw new RoleServiceError(
      "ROLE_CODE_ALREADY_EXISTS",
      `Role with code "${code}" already exists.`,
      409,
    );
  }

  const existingName = await findRoleByName(name);

  if (existingName) {
    throw new RoleServiceError(
      "ROLE_NAME_ALREADY_EXISTS",
      `Role with name "${name}" already exists.`,
      409,
    );
  }

  if (input.isSystemRole === true) {
    throw new RoleServiceError(
      "SYSTEM_ROLE_CREATION_RESTRICTED",
      "System roles cannot be created through the normal role management flow.",
      403,
    );
  }

  const role = await createRole({
    ...input,
    code,
    name,
  });

  return toRoleResponse(role);
}

/* -------------------------------------------------------------------------- */
/*                               Get Role                                     */
/* -------------------------------------------------------------------------- */

export async function getRoleByIdService(
  roleId: Types.ObjectId | string,
): Promise<RoleResponse> {
  const normalizedRoleId = normalizeObjectId(roleId);

  const role = await findRoleById(normalizedRoleId);

  if (!role) {
    throw new RoleServiceError(
      "ROLE_NOT_FOUND",
      "Role not found.",
      404,
    );
  }

  return toRoleResponse(role);
}

/* -------------------------------------------------------------------------- */
/*                             Get Role By Code                               */
/* -------------------------------------------------------------------------- */

export async function getRoleByCodeService(
  code: string,
): Promise<RoleResponse> {
  const normalizedCode = normalizeCode(code);

  const role = await findRoleByCode(normalizedCode);

  if (!role) {
    throw new RoleServiceError(
      "ROLE_NOT_FOUND",
      `Role with code "${normalizedCode}" was not found.`,
      404,
    );
  }

  return toRoleResponse(role);
}

/* -------------------------------------------------------------------------- */
/*                              List Roles                                    */
/* -------------------------------------------------------------------------- */

export async function listRolesService(
  query: RoleListQuery = {},
): Promise<{
  items: RoleResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const result = await findRoles(query);

  const page =
    query.page && query.page > 0
      ? Math.floor(query.page)
      : 1;

  const limit =
    query.limit && query.limit > 0
      ? Math.min(Math.floor(query.limit), 100)
      : 20;

  return {
    items: result.items.map(toRoleResponse),
    total: result.total,
    page,
    limit,
    totalPages:
      result.total === 0
        ? 0
        : Math.ceil(result.total / limit),
  };
}

/* -------------------------------------------------------------------------- */
/*                            Find Roles                                      */
/* -------------------------------------------------------------------------- */

export async function findRolesService(
  filters: RoleFilters = {},
): Promise<RoleResponse[]> {
  const roles = await findAllRoles(filters);

  return roles.map(toRoleResponse);
}

/* -------------------------------------------------------------------------- */
/*                              Update Role                                   */
/* -------------------------------------------------------------------------- */

export async function updateRoleService(
  roleId: Types.ObjectId | string,
  input: UpdateRoleInput,
): Promise<RoleResponse> {
  const normalizedRoleId = normalizeObjectId(roleId);

  const existingRole = await findRoleById(
    normalizedRoleId,
  );

  if (!existingRole) {
    throw new RoleServiceError(
      "ROLE_NOT_FOUND",
      "Role not found.",
      404,
    );
  }

  if (existingRole.isSystemRole) {
    throw new RoleServiceError(
      "SYSTEM_ROLE_UPDATE_RESTRICTED",
      "System roles cannot be modified through the normal role management flow.",
      403,
    );
  }

  if (typeof input.name !== "undefined") {
    const name = normalizeName(input.name);

    const existingName =
      await findRoleByName(name);

    if (
      existingName &&
      !existingName._id.equals(
        normalizedRoleId,
      )
    ) {
      throw new RoleServiceError(
        "ROLE_NAME_ALREADY_EXISTS",
        `Role with name "${name}" already exists.`,
        409,
      );
    }
  }

  const updatedRole = await updateRole(
    normalizedRoleId,
    input,
  );

  if (!updatedRole) {
    throw new RoleServiceError(
      "ROLE_UPDATE_FAILED",
      "Role could not be updated.",
      500,
    );
  }

  return toRoleResponse(updatedRole);
}

/* -------------------------------------------------------------------------- */
/*                             Update Status                                  */
/* -------------------------------------------------------------------------- */

export async function updateRoleStatusService(
  roleId: Types.ObjectId | string,
  status: RoleStatus,
  updatedBy?: Types.ObjectId,
): Promise<RoleResponse> {
  const normalizedRoleId = normalizeObjectId(roleId);

  const existingRole = await findRoleById(
    normalizedRoleId,
  );

  if (!existingRole) {
    throw new RoleServiceError(
      "ROLE_NOT_FOUND",
      "Role not found.",
      404,
    );
  }

  if (existingRole.isSystemRole) {
    throw new RoleServiceError(
      "SYSTEM_ROLE_STATUS_RESTRICTED",
      "System role status cannot be changed through the normal role management flow.",
      403,
    );
  }

  if (
    existingRole.status === status
  ) {
    return toRoleResponse(existingRole);
  }

  const updatedRole =
    await updateRoleStatus(
      normalizedRoleId,
      status,
      updatedBy,
    );

  if (!updatedRole) {
    throw new RoleServiceError(
      "ROLE_STATUS_UPDATE_FAILED",
      "Role status could not be updated.",
      500,
    );
  }

  return toRoleResponse(updatedRole);
}

/* -------------------------------------------------------------------------- */
/*                         Replace Permissions                                */
/* -------------------------------------------------------------------------- */

export async function replaceRolePermissionsService(
  roleId: Types.ObjectId | string,
  permissions: RolePermission[],
  updatedBy?: Types.ObjectId,
): Promise<RoleResponse> {
  const normalizedRoleId = normalizeObjectId(roleId);

  const existingRole = await findRoleById(
    normalizedRoleId,
  );

  if (!existingRole) {
    throw new RoleServiceError(
      "ROLE_NOT_FOUND",
      "Role not found.",
      404,
    );
  }

  if (existingRole.isSystemRole) {
    throw new RoleServiceError(
      "SYSTEM_ROLE_PERMISSION_UPDATE_RESTRICTED",
      "Permissions of a system role cannot be modified through the normal role management flow.",
      403,
    );
  }

  const permissionMap = new Map<
    string,
    RolePermission
  >();

  for (const permission of permissions) {
    const permissionId =
      permission.permissionId.toString();

    if (!permissionMap.has(permissionId)) {
      permissionMap.set(
        permissionId,
        permission,
      );
    }
  }

  const uniquePermissions = Array.from(
    permissionMap.values(),
  );

  const updatedRole =
    await replaceRolePermissions(
      normalizedRoleId,
      uniquePermissions,
      updatedBy,
    );

  if (!updatedRole) {
    throw new RoleServiceError(
      "ROLE_PERMISSION_UPDATE_FAILED",
      "Role permissions could not be updated.",
      500,
    );
  }

  return toRoleResponse(updatedRole);
}

/* -------------------------------------------------------------------------- */
/*                              Delete Role                                   */
/* -------------------------------------------------------------------------- */

export async function deleteRoleService(
  roleId: Types.ObjectId | string,
): Promise<{
  message: string;
  roleId: string;
}> {
  const normalizedRoleId = normalizeObjectId(roleId);

  const existingRole = await findRoleById(
    normalizedRoleId,
  );

  if (!existingRole) {
    throw new RoleServiceError(
      "ROLE_NOT_FOUND",
      "Role not found.",
      404,
    );
  }

  if (existingRole.isSystemRole) {
    throw new RoleServiceError(
      "SYSTEM_ROLE_DELETE_RESTRICTED",
      "System roles cannot be deleted.",
      403,
    );
  }

  const deletedRole =
    await deleteRole(normalizedRoleId);

  if (!deletedRole) {
    throw new RoleServiceError(
      "ROLE_DELETE_FAILED",
      "Role could not be deleted.",
      500,
    );
  }

  return {
    message: "Role deleted successfully.",
    roleId: normalizedRoleId.toString(),
  };
}

/* -------------------------------------------------------------------------- */
/*                           Role Statistics                                  */
/* -------------------------------------------------------------------------- */

export async function getRoleStatisticsService(): Promise<{
  total: number;
  active: number;
  inactive: number;
  systemRoles: number;
  customRoles: number;
}> {
  return getRoleStatistics();
}

/* -------------------------------------------------------------------------- */
/*                           Permission Check                                 */
/* -------------------------------------------------------------------------- */

export function roleHasPermission(
  role: {
    permissions?: RolePermission[];
  },
  permissionCode: string,
): boolean {
  const normalizedCode =
    permissionCode.trim().toLowerCase();

  if (!normalizedCode) {
    return false;
  }

  return (role.permissions ?? []).some(
    (permission) =>
      permission.code.trim().toLowerCase() ===
      normalizedCode,
  );
}

/* -------------------------------------------------------------------------- */
/*                              Service Object                                */
/* -------------------------------------------------------------------------- */

export const roleService = {
  createRole: createRoleService,
  getRoleById: getRoleByIdService,
  getRoleByCode: getRoleByCodeService,
  listRoles: listRolesService,
  findRoles: findRolesService,
  updateRole: updateRoleService,
  updateRoleStatus: updateRoleStatusService,
  replaceRolePermissions:
    replaceRolePermissionsService,
  deleteRole: deleteRoleService,
  getRoleStatistics:
    getRoleStatisticsService,
  roleHasPermission,
};
import { Types } from "mongoose";

import type {
  CreatePermissionInput,
  PermissionAction,
  PermissionEntity,
  PermissionFilters,
  PermissionListQuery,
  PermissionListResponse,
  PermissionModule,
  PermissionResponse,
  PermissionScope,
  PermissionStatistics,
  PermissionStatus,
  UpdatePermissionInput,
} from "./permission.types";

import {
  createPermission,
  deletePermission,
  findActivePermissionByCode,
  findActivePermissionsByIds,
  findPermissionByCode,
  findPermissionById,
  findPermissionByIdValue,
  findPermissionByIdentity,
  findPermissionByName,
  findPermissions,
  findPermissionsByIds,
  findPermissionsByModule,
  getPermissionStatistics,
  permissionCodeExists,
  updatePermission,
  updatePermissionStatus,
} from "./permission.repository";

/**
 * Standard service error for permission operations.
 */
export class PermissionServiceError extends Error {
  public readonly code: string;

  public readonly statusCode: number;

  public readonly details?: unknown;

  public constructor(
    message: string,
    code: string,
    statusCode = 400,
    details?: unknown,
  ) {
    super(message);

    this.name = "PermissionServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}

/**
 * Create permission service input.
 */
export interface CreatePermissionServiceInput
  extends CreatePermissionInput {
  createdBy?: Types.ObjectId;
}

/**
 * Update permission service input.
 */
export interface UpdatePermissionServiceInput
  extends UpdatePermissionInput {
  updatedBy?: Types.ObjectId;
}

/**
 * Convert MongoDB permission document into API response.
 */
function toPermissionResponse(
  permission: PermissionEntity,
): PermissionResponse {
  return {
    id: permission._id.toString(),
    code: permission.code,
    name: permission.name,
    description: permission.description,
    module: permission.module,
    action: permission.action,
    scope: permission.scope,
    status: permission.status,
    isSystemPermission: permission.isSystemPermission,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
    createdBy: permission.createdBy?.toString(),
    updatedBy: permission.updatedBy?.toString(),
  };
}

/**
 * Normalize a permission identifier.
 */
function normalizePermissionId(
  permissionId: string | Types.ObjectId,
): Types.ObjectId {
  if (permissionId instanceof Types.ObjectId) {
    return permissionId;
  }

  if (!Types.ObjectId.isValid(permissionId)) {
    throw new PermissionServiceError(
      "Invalid permission ID.",
      "INVALID_PERMISSION_ID",
      400,
    );
  }

  return new Types.ObjectId(permissionId);
}

/**
 * Normalize a list of permission identifiers.
 */
function normalizePermissionIds(
  permissionIds: Array<string | Types.ObjectId>,
): Types.ObjectId[] {
  const result: Types.ObjectId[] = [];
  const seen = new Set<string>();

  for (const permissionId of permissionIds) {
    const normalized =
      normalizePermissionId(permissionId);

    const key = normalized.toString();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

/**
 * Create a new permission.
 */
export async function createPermissionService(
  input: CreatePermissionServiceInput,
): Promise<PermissionResponse> {
  const code = input.code.trim().toUpperCase();

  const existingByCode =
    await findPermissionByCode(code);

  if (existingByCode) {
    throw new PermissionServiceError(
      "A permission with this code already exists.",
      "PERMISSION_CODE_ALREADY_EXISTS",
      409,
    );
  }

  const existingByIdentity =
    await findPermissionByIdentity(
      input.module,
      input.action,
      input.scope ?? "GLOBAL",
    );

  if (existingByIdentity) {
    throw new PermissionServiceError(
      "A permission with the same module, action and scope already exists.",
      "PERMISSION_IDENTITY_ALREADY_EXISTS",
      409,
    );
  }

  const permission = await createPermission({
    ...input,
    code,
    name: input.name.trim(),
    description: input.description?.trim(),
  });

  return toPermissionResponse(permission);
}

/**
 * Get a permission by ID.
 */
export async function getPermissionByIdService(
  permissionId: string | Types.ObjectId,
): Promise<PermissionResponse> {
  const normalizedId =
    normalizePermissionId(permissionId);

  const permission =
    await findPermissionById(normalizedId);

  if (!permission) {
    throw new PermissionServiceError(
      "Permission not found.",
      "PERMISSION_NOT_FOUND",
      404,
    );
  }

  return toPermissionResponse(permission);
}

/**
 * Get a permission by code.
 */
export async function getPermissionByCodeService(
  code: string,
): Promise<PermissionResponse> {
  const normalizedCode =
    code.trim().toUpperCase();

  const permission =
    await findPermissionByCode(normalizedCode);

  if (!permission) {
    throw new PermissionServiceError(
      "Permission not found.",
      "PERMISSION_NOT_FOUND",
      404,
    );
  }

  return toPermissionResponse(permission);
}

/**
 * Get an active permission by code.
 */
export async function getActivePermissionByCodeService(
  code: string,
): Promise<PermissionResponse> {
  const normalizedCode =
    code.trim().toUpperCase();

  const permission =
    await findActivePermissionByCode(
      normalizedCode,
    );

  if (!permission) {
    throw new PermissionServiceError(
      "Active permission not found.",
      "ACTIVE_PERMISSION_NOT_FOUND",
      404,
    );
  }

  return toPermissionResponse(permission);
}

/**
 * Find a permission by name.
 */
export async function getPermissionByNameService(
  name: string,
): Promise<PermissionResponse> {
  const permission =
    await findPermissionByName(name);

  if (!permission) {
    throw new PermissionServiceError(
      "Permission not found.",
      "PERMISSION_NOT_FOUND",
      404,
    );
  }

  return toPermissionResponse(permission);
}

/**
 * List permissions with pagination.
 */
export async function listPermissionsService(
  query: PermissionListQuery = {},
): Promise<PermissionListResponse> {
  const result = await findPermissions(query);

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    Math.max(1, query.limit ?? 20),
    100,
  );

  return {
    items: result.items.map(toPermissionResponse),
    total: result.total,
    page,
    limit,
    totalPages:
      result.total === 0
        ? 0
        : Math.ceil(result.total / limit),
  };
}

/**
 * Find permissions without pagination.
 */
export async function findPermissionsService(
  filters: PermissionFilters = {},
): Promise<PermissionResponse[]> {
  const result = await findPermissions({
    ...filters,
    page: 1,
    limit: 100,
  });

  return result.items.map(toPermissionResponse);
}

/**
 * Find permissions by module.
 */
export async function findPermissionsByModuleService(
  module: PermissionModule,
): Promise<PermissionResponse[]> {
  const permissions =
    await findPermissionsByModule(module);

  return permissions.map(toPermissionResponse);
}

/**
 * Find active permissions by module.
 */
export async function findActivePermissionsByModuleService(
  module: PermissionModule,
): Promise<PermissionResponse[]> {
  const permissions =
    await findPermissionsByModule(module);

  return permissions
    .filter(
      (permission) =>
        permission.status === "ACTIVE",
    )
    .map(toPermissionResponse);
}

/**
 * Update a permission.
 */
export async function updatePermissionService(
  permissionId: string | Types.ObjectId,
  input: UpdatePermissionServiceInput,
): Promise<PermissionResponse> {
  const normalizedId =
    normalizePermissionId(permissionId);

  const existing =
    await findPermissionById(normalizedId);

  if (!existing) {
    throw new PermissionServiceError(
      "Permission not found.",
      "PERMISSION_NOT_FOUND",
      404,
    );
  }

  if (existing.isSystemPermission) {
    throw new PermissionServiceError(
      "System permissions cannot be modified through this operation.",
      "SYSTEM_PERMISSION_PROTECTED",
      403,
    );
  }

  const updated = await updatePermission(
    normalizedId,
    {
      ...input,
      name: input.name?.trim(),
      description:
        input.description !== undefined
          ? input.description.trim()
          : undefined,
    },
  );

  if (!updated) {
    throw new PermissionServiceError(
      "Permission could not be updated.",
      "PERMISSION_UPDATE_FAILED",
      500,
    );
  }

  return toPermissionResponse(updated);
}

/**
 * Update permission status.
 */
export async function updatePermissionStatusService(
  permissionId: string | Types.ObjectId,
  status: PermissionStatus,
  updatedBy?: Types.ObjectId,
): Promise<PermissionResponse> {
  const normalizedId =
    normalizePermissionId(permissionId);

  const existing =
    await findPermissionById(normalizedId);

  if (!existing) {
    throw new PermissionServiceError(
      "Permission not found.",
      "PERMISSION_NOT_FOUND",
      404,
    );
  }

  if (existing.isSystemPermission) {
    throw new PermissionServiceError(
      "System permission status cannot be changed through this operation.",
      "SYSTEM_PERMISSION_PROTECTED",
      403,
    );
  }

  if (existing.status === status) {
    return toPermissionResponse(existing);
  }

  const updated =
    await updatePermissionStatus(
      normalizedId,
      status,
      updatedBy,
    );

  if (!updated) {
    throw new PermissionServiceError(
      "Permission status could not be updated.",
      "PERMISSION_STATUS_UPDATE_FAILED",
      500,
    );
  }

  return toPermissionResponse(updated);
}

/**
 * Activate a permission.
 */
export async function activatePermissionService(
  permissionId: string | Types.ObjectId,
  updatedBy?: Types.ObjectId,
): Promise<PermissionResponse> {
  return updatePermissionStatusService(
    permissionId,
    "ACTIVE",
    updatedBy,
  );
}

/**
 * Deactivate a permission.
 */
export async function deactivatePermissionService(
  permissionId: string | Types.ObjectId,
  updatedBy?: Types.ObjectId,
): Promise<PermissionResponse> {
  return updatePermissionStatusService(
    permissionId,
    "INACTIVE",
    updatedBy,
  );
}

/**
 * Delete a permission.
 */
export async function deletePermissionService(
  permissionId: string | Types.ObjectId,
): Promise<void> {
  const normalizedId =
    normalizePermissionId(permissionId);

  const existing =
    await findPermissionById(normalizedId);

  if (!existing) {
    throw new PermissionServiceError(
      "Permission not found.",
      "PERMISSION_NOT_FOUND",
      404,
    );
  }

  if (existing.isSystemPermission) {
    throw new PermissionServiceError(
      "System permissions cannot be deleted.",
      "SYSTEM_PERMISSION_PROTECTED",
      403,
    );
  }

  await deletePermission(normalizedId);
}

/**
 * Get permission statistics.
 */
export async function getPermissionStatisticsService(): Promise<PermissionStatistics> {
  return getPermissionStatistics();
}

/**
 * Check whether a permission code exists.
 */
export async function permissionCodeExistsService(
  code: string,
  excludeId?: string | Types.ObjectId,
): Promise<boolean> {
  const normalizedExcludeId =
    excludeId === undefined
      ? undefined
      : normalizePermissionId(excludeId);

  return permissionCodeExists(
    code.trim().toUpperCase(),
    normalizedExcludeId,
  );
}

/**
 * Get permissions by IDs.
 */
export async function getPermissionsByIdsService(
  permissionIds: Array<string | Types.ObjectId>,
): Promise<PermissionResponse[]> {
  const normalizedIds =
    normalizePermissionIds(permissionIds);

  const permissions =
    await findPermissionsByIds(
      normalizedIds,
    );

  return permissions.map(toPermissionResponse);
}

/**
 * Get active permissions by IDs.
 */
export async function getActivePermissionsByIdsService(
  permissionIds: Array<string | Types.ObjectId>,
): Promise<PermissionResponse[]> {
  const normalizedIds =
    normalizePermissionIds(permissionIds);

  const permissions =
    await findActivePermissionsByIds(
      normalizedIds,
    );

  return permissions.map(toPermissionResponse);
}

/**
 * Validate that all permission IDs exist.
 */
export async function validatePermissionIdsService(
  permissionIds: Array<string | Types.ObjectId>,
): Promise<boolean> {
  const normalizedIds =
    normalizePermissionIds(permissionIds);

  if (normalizedIds.length === 0) {
    return true;
  }

  const permissions =
    await findPermissionsByIds(
      normalizedIds,
    );

  return permissions.length === normalizedIds.length;
}

/**
 * Validate that all permission IDs exist and are active.
 */
export async function validateActivePermissionIdsService(
  permissionIds: Array<string | Types.ObjectId>,
): Promise<boolean> {
  const normalizedIds =
    normalizePermissionIds(permissionIds);

  if (normalizedIds.length === 0) {
    return true;
  }

  const permissions =
    await findActivePermissionsByIds(
      normalizedIds,
    );

  return permissions.length === normalizedIds.length;
}

/**
 * Check whether a role-like permission code is active.
 *
 * This helper is intended for authorization checks in later
 * modules and keeps permission lookup centralized.
 */
export async function hasActivePermissionService(
  permissionCode: string,
): Promise<boolean> {
  const permission =
    await findActivePermissionByCode(
      permissionCode.trim().toUpperCase(),
    );

  return permission !== null;
}

/**
 * Check whether a permission has a particular module/action/scope.
 */
export async function permissionMatchesService(
  permissionCode: string,
  module: PermissionModule,
  action: PermissionAction,
  scope: PermissionScope,
): Promise<boolean> {
  const permission =
    await findActivePermissionByCode(
      permissionCode.trim().toUpperCase(),
    );

  if (!permission) {
    return false;
  }

  return (
    permission.module === module &&
    permission.action === action &&
    permission.scope === scope
  );
}

/**
 * Permission service facade.
 */
export const permissionService = {
  createPermission: createPermissionService,
  getPermissionById: getPermissionByIdService,
  getPermissionByCode: getPermissionByCodeService,
  getActivePermissionByCode:
    getActivePermissionByCodeService,
  getPermissionByName: getPermissionByNameService,
  listPermissions: listPermissionsService,
  findPermissions: findPermissionsService,
  findPermissionsByModule:
    findPermissionsByModuleService,
  findActivePermissionsByModule:
    findActivePermissionsByModuleService,
  updatePermission: updatePermissionService,
  updatePermissionStatus:
    updatePermissionStatusService,
  activatePermission: activatePermissionService,
  deactivatePermission:
    deactivatePermissionService,
  deletePermission: deletePermissionService,
  getPermissionStatistics:
    getPermissionStatisticsService,
  permissionCodeExists:
    permissionCodeExistsService,
  getPermissionsByIds:
    getPermissionsByIdsService,
  getActivePermissionsByIds:
    getActivePermissionsByIdsService,
  validatePermissionIds:
    validatePermissionIdsService,
  validateActivePermissionIds:
    validateActivePermissionIdsService,
  hasActivePermission:
    hasActivePermissionService,
  permissionMatches:
    permissionMatchesService,
};
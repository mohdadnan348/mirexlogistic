import { Types } from "mongoose";

import {
  PermissionModel,
  type PermissionDocument,
} from "./permission.model";

import type {
  CreatePermissionInput,
  PermissionEntity,
  PermissionFilters,
  PermissionListQuery,
  PermissionStatistics,
  PermissionStatus,
  UpdatePermissionInput,
} from "./permission.types";

/**
 * Result returned by paginated permission queries.
 */
export interface PermissionListResult {
  items: PermissionDocument[];
  total: number;
}

/**
 * Options used internally when creating a permission.
 */
export interface CreatePermissionRepositoryInput
  extends CreatePermissionInput {
  createdBy?: Types.ObjectId;
}

/**
 * Options used internally when updating a permission.
 */
export interface UpdatePermissionRepositoryInput
  extends UpdatePermissionInput {
  updatedBy?: Types.ObjectId;
}

/**
 * Create a new permission.
 */
export async function createPermission(
  input: CreatePermissionRepositoryInput,
): Promise<PermissionDocument> {
  const permission = new PermissionModel({
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    module: input.module,
    action: input.action,
    scope: input.scope ?? "GLOBAL",
    status: input.status ?? "ACTIVE",
    isSystemPermission: input.isSystemPermission ?? false,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  });

  return permission.save();
}

/**
 * Find permission by MongoDB ObjectId.
 */
export async function findPermissionById(
  permissionId: Types.ObjectId,
): Promise<PermissionDocument | null> {
  return PermissionModel.findById(permissionId).exec();
}

/**
 * Find permission by string/ObjectId.
 */
export async function findPermissionByIdValue(
  permissionId: string | Types.ObjectId,
): Promise<PermissionDocument | null> {
  if (permissionId instanceof Types.ObjectId) {
    return findPermissionById(permissionId);
  }

  if (!Types.ObjectId.isValid(permissionId)) {
    return null;
  }

  return findPermissionById(
    new Types.ObjectId(permissionId),
  );
}

/**
 * Find permission by unique code.
 */
export async function findPermissionByCode(
  code: string,
): Promise<PermissionDocument | null> {
  return PermissionModel.findByCode(code);
}

/**
 * Find only an active permission by code.
 */
export async function findActivePermissionByCode(
  code: string,
): Promise<PermissionDocument | null> {
  return PermissionModel.findActiveByCode(code);
}

/**
 * Find permission by name.
 */
export async function findPermissionByName(
  name: string,
): Promise<PermissionDocument | null> {
  return PermissionModel.findOne({
    name: name.trim(),
  }).exec();
}

/**
 * Find permission using its complete identity.
 */
export async function findPermissionByIdentity(
  module: PermissionEntity["module"],
  action: PermissionEntity["action"],
  scope: PermissionEntity["scope"],
): Promise<PermissionDocument | null> {
  return PermissionModel.findOne({
    module,
    action,
    scope,
  }).exec();
}

/**
 * Check whether a permission code already exists.
 */
export async function permissionCodeExists(
  code: string,
  excludeId?: Types.ObjectId,
): Promise<boolean> {
  return PermissionModel.existsByCode(
    code,
    excludeId,
  );
}

/**
 * Find all permissions without pagination.
 */
export async function findAllPermissions(
  filters: PermissionFilters = {},
): Promise<PermissionDocument[]> {
  const query = buildPermissionFilter(filters);

  return PermissionModel.find(query)
    .sort({
      module: 1,
      action: 1,
      scope: 1,
      name: 1,
    })
    .exec();
}

/**
 * Find permissions with pagination and sorting.
 */
export async function findPermissions(
  queryOptions: PermissionListQuery = {},
): Promise<PermissionListResult> {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
    ...filters
  } = queryOptions;

  const query = buildPermissionFilter(filters);

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(
    Math.max(1, limit),
    100,
  );

  const skip = (safePage - 1) * safeLimit;

  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const [items, total] = await Promise.all([
    PermissionModel.find(query)
      .sort({
        [sortBy]: sortDirection,
      })
      .skip(skip)
      .limit(safeLimit)
      .exec(),

    PermissionModel.countDocuments(query).exec(),
  ]);

  return {
    items,
    total,
  };
}

/**
 * Update a permission.
 */
export async function updatePermission(
  permissionId: Types.ObjectId,
  input: UpdatePermissionRepositoryInput,
): Promise<PermissionDocument | null> {
  const update: Partial<PermissionEntity> = {};

  if (input.name !== undefined) {
    update.name = input.name.trim();
  }

  if (input.description !== undefined) {
    update.description =
      input.description.trim() || undefined;
  }

  if (input.scope !== undefined) {
    update.scope = input.scope;
  }

  if (input.status !== undefined) {
    update.status = input.status;
  }

  const updatePayload: Record<string, unknown> = {
    ...update,
    updatedBy: input.updatedBy,
  };

  return PermissionModel.findByIdAndUpdate(
    permissionId,
    {
      $set: updatePayload,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

/**
 * Update permission status.
 */
export async function updatePermissionStatus(
  permissionId: Types.ObjectId,
  status: PermissionStatus,
  updatedBy?: Types.ObjectId,
): Promise<PermissionDocument | null> {
  return PermissionModel.findByIdAndUpdate(
    permissionId,
    {
      $set: {
        status,
        updatedBy,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

/**
 * Activate a permission.
 */
export async function activatePermission(
  permissionId: Types.ObjectId,
  updatedBy?: Types.ObjectId,
): Promise<PermissionDocument | null> {
  return updatePermissionStatus(
    permissionId,
    "ACTIVE",
    updatedBy,
  );
}

/**
 * Deactivate a permission.
 */
export async function deactivatePermission(
  permissionId: Types.ObjectId,
  updatedBy?: Types.ObjectId,
): Promise<PermissionDocument | null> {
  return updatePermissionStatus(
    permissionId,
    "INACTIVE",
    updatedBy,
  );
}

/**
 * Delete a permission permanently.
 *
 * System permissions are protected at the service layer before
 * this repository operation is called.
 */
export async function deletePermission(
  permissionId: Types.ObjectId,
): Promise<PermissionDocument | null> {
  return PermissionModel.findByIdAndDelete(
    permissionId,
  ).exec();
}

/**
 * Get permission statistics.
 */
export async function getPermissionStatistics(): Promise<PermissionStatistics> {
  const [
    total,
    active,
    inactive,
    system,
    custom,
    moduleAggregation,
    actionAggregation,
    scopeAggregation,
  ] = await Promise.all([
    PermissionModel.countDocuments().exec(),

    PermissionModel.countDocuments({
      status: "ACTIVE",
    }).exec(),

    PermissionModel.countDocuments({
      status: "INACTIVE",
    }).exec(),

    PermissionModel.countDocuments({
      isSystemPermission: true,
    }).exec(),

    PermissionModel.countDocuments({
      isSystemPermission: false,
    }).exec(),

    PermissionModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $group: {
          _id: "$module",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]).exec(),

    PermissionModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $group: {
          _id: "$action",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]).exec(),

    PermissionModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $group: {
          _id: "$scope",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]).exec(),
  ]);

  return {
    total,
    active,
    inactive,
    system,
    custom,
    byModule: aggregationToRecord(moduleAggregation),
    byAction: aggregationToRecord(actionAggregation),
    byScope: aggregationToRecord(scopeAggregation),
  };
}

/**
 * Count permissions using filters.
 */
export async function countPermissions(
  filters: PermissionFilters = {},
): Promise<number> {
  const query = buildPermissionFilter(filters);

  return PermissionModel.countDocuments(query).exec();
}

/**
 * Check whether all supplied permission IDs exist.
 */
export async function allPermissionsExist(
  permissionIds: Types.ObjectId[],
): Promise<boolean> {
  const uniqueIds = uniqueObjectIds(permissionIds);

  if (uniqueIds.length === 0) {
    return true;
  }

  const count = await PermissionModel.countDocuments({
    _id: {
      $in: uniqueIds,
    },
  }).exec();

  return count === uniqueIds.length;
}

/**
 * Find permissions by a list of IDs.
 */
export async function findPermissionsByIds(
  permissionIds: Types.ObjectId[],
): Promise<PermissionDocument[]> {
  const uniqueIds = uniqueObjectIds(permissionIds);

  if (uniqueIds.length === 0) {
    return [];
  }

  return PermissionModel.find({
    _id: {
      $in: uniqueIds,
    },
  })
    .sort({
      module: 1,
      action: 1,
      scope: 1,
    })
    .exec();
}

/**
 * Find active permissions by a list of IDs.
 */
export async function findActivePermissionsByIds(
  permissionIds: Types.ObjectId[],
): Promise<PermissionDocument[]> {
  const uniqueIds = uniqueObjectIds(permissionIds);

  if (uniqueIds.length === 0) {
    return [];
  }

  return PermissionModel.find({
    _id: {
      $in: uniqueIds,
    },
    status: "ACTIVE",
  })
    .sort({
      module: 1,
      action: 1,
      scope: 1,
    })
    .exec();
}

/**
 * Find permissions belonging to a module.
 */
export async function findPermissionsByModule(
  module: PermissionEntity["module"],
): Promise<PermissionDocument[]> {
  return PermissionModel.find({
    module,
  })
    .sort({
      action: 1,
      scope: 1,
      name: 1,
    })
    .exec();
}

/**
 * Find active permissions belonging to a module.
 */
export async function findActivePermissionsByModule(
  module: PermissionEntity["module"],
): Promise<PermissionDocument[]> {
  return PermissionModel.find({
    module,
    status: "ACTIVE",
  })
    .sort({
      action: 1,
      scope: 1,
      name: 1,
    })
    .exec();
}

/**
 * Build MongoDB filter from public permission filters.
 */
function buildPermissionFilter(
  filters: PermissionFilters,
): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filters.code) {
    query.code = {
      $regex: escapeRegex(filters.code.trim()),
      $options: "i",
    };
  }

  if (filters.name) {
    query.name = {
      $regex: escapeRegex(filters.name.trim()),
      $options: "i",
    };
  }

  if (filters.module) {
    query.module = filters.module;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.scope) {
    query.scope = filters.scope;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.isSystemPermission !== undefined) {
    query.isSystemPermission =
      filters.isSystemPermission;
  }

  if (filters.search) {
    const search = escapeRegex(filters.search.trim());

    query.$or = [
      {
        code: {
          $regex: search,
          $options: "i",
        },
      },
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  return query;
}

/**
 * Convert Mongo aggregation results to a Record.
 */
function aggregationToRecord(
  aggregation: Array<{
    _id: string;
    count: number;
  }>,
): Record<string, number> {
  return aggregation.reduce<Record<string, number>>(
    (result, item) => {
      result[item._id] = item.count;
      return result;
    },
    {},
  );
}

/**
 * Remove duplicate ObjectIds while preserving order.
 */
function uniqueObjectIds(
  ids: Types.ObjectId[],
): Types.ObjectId[] {
  const seen = new Set<string>();
  const result: Types.ObjectId[] = [];

  for (const id of ids) {
    const key = id.toString();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(id);
  }

  return result;
}

/**
 * Escape user-provided text before using it in a MongoDB regex.
 */
function escapeRegex(value: string): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

/**
 * Permission repository facade.
 */
export const permissionRepository = {
  createPermission,
  findPermissionById,
  findPermissionByIdValue,
  findPermissionByCode,
  findActivePermissionByCode,
  findPermissionByName,
  findPermissionByIdentity,
  permissionCodeExists,
  findAllPermissions,
  findPermissions,
  updatePermission,
  updatePermissionStatus,
  activatePermission,
  deactivatePermission,
  deletePermission,
  getPermissionStatistics,
  countPermissions,
  allPermissionsExist,
  findPermissionsByIds,
  findActivePermissionsByIds,
  findPermissionsByModule,
  findActivePermissionsByModule,
};
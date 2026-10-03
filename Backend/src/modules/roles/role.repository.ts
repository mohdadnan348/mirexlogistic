import {
  Types,
} from "mongoose";

import {
  RoleModel,
  type RoleDocument,
} from "./role.model";

import type {
  CreateRoleInput,
  RoleFilters,
  RoleListQuery,
  RolePermission,
  RoleStatus,
  UpdateRoleInput,
} from "./role.types";

/* -------------------------------------------------------------------------- */
/*                              Repository Types                             */
/* -------------------------------------------------------------------------- */

export interface RoleListResult {
  items: RoleDocument[];
  total: number;
}

/* -------------------------------------------------------------------------- */
/*                              Create Role                                   */
/* -------------------------------------------------------------------------- */

export async function createRole(
  input: CreateRoleInput,
): Promise<RoleDocument> {
  const permissions: RolePermission[] = (input.permissions ?? []).map(
    (permissionId) => ({
      permissionId,
      code: "",
      module: "",
      action: "",
    }),
  );

  const role = new RoleModel({
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    description: input.description?.trim(),
    accessLevel: input.accessLevel,
    scope: input.scope,
    status: input.status ?? "ACTIVE",
    permissions,
    isSystemRole: input.isSystemRole ?? false,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  });

  return role.save();
}

/* -------------------------------------------------------------------------- */
/*                               Find By ID                                   */
/* -------------------------------------------------------------------------- */

export async function findRoleById(
  roleId: Types.ObjectId | string,
): Promise<RoleDocument | null> {
  if (!Types.ObjectId.isValid(roleId)) {
    return null;
  }

  return RoleModel.findById(roleId).exec();
}

/* -------------------------------------------------------------------------- */
/*                              Find By Code                                  */
/* -------------------------------------------------------------------------- */

export async function findRoleByCode(
  code: string,
): Promise<RoleDocument | null> {
  return RoleModel.findOne({
    code: code.trim().toUpperCase(),
  }).exec();
}

/* -------------------------------------------------------------------------- */
/*                            Find By Name                                    */
/* -------------------------------------------------------------------------- */

export async function findRoleByName(
  name: string,
): Promise<RoleDocument | null> {
  return RoleModel.findOne({
    name: name.trim(),
  }).exec();
}

/* -------------------------------------------------------------------------- */
/*                            Find All Roles                                  */
/* -------------------------------------------------------------------------- */

export async function findAllRoles(
  filters: RoleFilters = {},
): Promise<RoleDocument[]> {
  const query: Record<string, unknown> = {};

  if (filters.code) {
    query.code = filters.code.trim().toUpperCase();
  }

  if (filters.name) {
    query.name = filters.name.trim();
  }

  if (filters.accessLevel) {
    query.accessLevel = filters.accessLevel;
  }

  if (filters.scope) {
    query.scope = filters.scope;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (typeof filters.isSystemRole === "boolean") {
    query.isSystemRole = filters.isSystemRole;
  }

  if (filters.search) {
    const search = filters.search.trim();

    if (search.length > 0) {
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
  }

  return RoleModel.find(query)
    .sort({
      name: 1,
    })
    .exec();
}

/* -------------------------------------------------------------------------- */
/*                              List Roles                                    */
/* -------------------------------------------------------------------------- */

export async function findRoles(
  queryOptions: RoleListQuery = {},
): Promise<RoleListResult> {
  const {
    page = 1,
    limit = 20,
    sortBy = "name",
    sortOrder = "asc",
    ...filters
  } = queryOptions;

  const query: Record<string, unknown> = {};

  if (filters.code) {
    query.code = filters.code.trim().toUpperCase();
  }

  if (filters.name) {
    query.name = filters.name.trim();
  }

  if (filters.accessLevel) {
    query.accessLevel = filters.accessLevel;
  }

  if (filters.scope) {
    query.scope = filters.scope;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (typeof filters.isSystemRole === "boolean") {
    query.isSystemRole = filters.isSystemRole;
  }

  if (filters.search) {
    const search = filters.search.trim();

    if (search.length > 0) {
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
  }

  const safePage =
    Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1;

  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), 100)
      : 20;

  const skip = (safePage - 1) * safeLimit;

  const sortDirection = sortOrder === "desc" ? -1 : 1;

  const [items, total] = await Promise.all([
    RoleModel.find(query)
      .sort({
        [sortBy]: sortDirection,
      })
      .skip(skip)
      .limit(safeLimit)
      .exec(),

    RoleModel.countDocuments(query).exec(),
  ]);

  return {
    items,
    total,
  };
}

/* -------------------------------------------------------------------------- */
/*                             Update Role                                    */
/* -------------------------------------------------------------------------- */

export async function updateRole(
  roleId: Types.ObjectId | string,
  input: UpdateRoleInput,
): Promise<RoleDocument | null> {
  if (!Types.ObjectId.isValid(roleId)) {
    return null;
  }

  const update: Record<string, unknown> = {};

  if (typeof input.name !== "undefined") {
    update.name = input.name.trim();
  }

  if (typeof input.description !== "undefined") {
    update.description = input.description.trim();
  }

  if (typeof input.accessLevel !== "undefined") {
    update.accessLevel = input.accessLevel;
  }

  if (typeof input.scope !== "undefined") {
    update.scope = input.scope;
  }

  if (typeof input.status !== "undefined") {
    update.status = input.status;
  }

  if (typeof input.permissions !== "undefined") {
    update.permissions = input.permissions.map(
      (permissionId) => ({
        permissionId,
        code: "",
        module: "",
        action: "",
      }),
    );
  }

  if (typeof input.updatedBy !== "undefined") {
    update.updatedBy = input.updatedBy;
  }

  return RoleModel.findByIdAndUpdate(
    roleId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

/* -------------------------------------------------------------------------- */
/*                              Update Status                                 */
/* -------------------------------------------------------------------------- */

export async function updateRoleStatus(
  roleId: Types.ObjectId | string,
  status: RoleStatus,
  updatedBy?: Types.ObjectId,
): Promise<RoleDocument | null> {
  if (!Types.ObjectId.isValid(roleId)) {
    return null;
  }

  const update: {
    status: RoleStatus;
    updatedBy?: Types.ObjectId;
  } = {
    status,
  };

  if (updatedBy) {
    update.updatedBy = updatedBy;
  }

  return RoleModel.findByIdAndUpdate(
    roleId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

/* -------------------------------------------------------------------------- */
/*                           Assign Permissions                               */
/* -------------------------------------------------------------------------- */

export async function replaceRolePermissions(
  roleId: Types.ObjectId | string,
  permissions: RolePermission[],
  updatedBy?: Types.ObjectId,
): Promise<RoleDocument | null> {
  if (!Types.ObjectId.isValid(roleId)) {
    return null;
  }

  const update: Record<string, unknown> = {
    permissions,
  };

  if (updatedBy) {
    update.updatedBy = updatedBy;
  }

  return RoleModel.findByIdAndUpdate(
    roleId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

/* -------------------------------------------------------------------------- */
/*                              Delete Role                                   */
/* -------------------------------------------------------------------------- */

export async function deleteRole(
  roleId: Types.ObjectId | string,
): Promise<RoleDocument | null> {
  if (!Types.ObjectId.isValid(roleId)) {
    return null;
  }

  return RoleModel.findByIdAndDelete(roleId).exec();
}

/* -------------------------------------------------------------------------- */
/*                         Count Role Statistics                              */
/* -------------------------------------------------------------------------- */

export async function getRoleStatistics(): Promise<{
  total: number;
  active: number;
  inactive: number;
  systemRoles: number;
  customRoles: number;
}> {
  const [
    total,
    active,
    inactive,
    systemRoles,
    customRoles,
  ] = await Promise.all([
    RoleModel.countDocuments().exec(),

    RoleModel.countDocuments({
      status: "ACTIVE",
    }).exec(),

    RoleModel.countDocuments({
      status: "INACTIVE",
    }).exec(),

    RoleModel.countDocuments({
      isSystemRole: true,
    }).exec(),

    RoleModel.countDocuments({
      isSystemRole: false,
    }).exec(),
  ]);

  return {
    total,
    active,
    inactive,
    systemRoles,
    customRoles,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Repository Object                               */
/* -------------------------------------------------------------------------- */

export const roleRepository = {
  createRole,
  findRoleById,
  findRoleByCode,
  findRoleByName,
  findAllRoles,
  findRoles,
  updateRole,
  updateRoleStatus,
  replaceRolePermissions,
  deleteRole,
  getRoleStatistics,
};
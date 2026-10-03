import type { Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/*                               Role Status                                  */
/* -------------------------------------------------------------------------- */

export type RoleStatus =
  | "ACTIVE"
  | "INACTIVE";

/* -------------------------------------------------------------------------- */
/*                              Role Access Level                             */
/* -------------------------------------------------------------------------- */

export type RoleAccessLevel =
  | "SYSTEM"
  | "ADMIN"
  | "MANAGEMENT"
  | "OPERATIONAL"
  | "READ_ONLY";

/* -------------------------------------------------------------------------- */
/*                                Role Scope                                  */
/* -------------------------------------------------------------------------- */

export type RoleScope =
  | "GLOBAL"
  | "BRANCH"
  | "DEPARTMENT";

/* -------------------------------------------------------------------------- */
/*                              Role Permission                               */
/* -------------------------------------------------------------------------- */

export interface RolePermission {
  permissionId: Types.ObjectId;
  code: string;
  module: string;
  action: string;
}

/* -------------------------------------------------------------------------- */
/*                               Role Entity                                  */
/* -------------------------------------------------------------------------- */

export interface RoleEntity {
  _id: Types.ObjectId;

  code: string;
  name: string;
  description?: string;

  accessLevel: RoleAccessLevel;
  scope: RoleScope;
  status: RoleStatus;

  permissions: RolePermission[];

  isSystemRole: boolean;

  createdAt: Date;
  updatedAt: Date;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/* -------------------------------------------------------------------------- */
/*                              Create Role                                   */
/* -------------------------------------------------------------------------- */

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string;

  accessLevel: RoleAccessLevel;
  scope: RoleScope;
  status?: RoleStatus;

  permissions?: Types.ObjectId[];

  isSystemRole?: boolean;

  createdBy?: Types.ObjectId;
}

/* -------------------------------------------------------------------------- */
/*                              Update Role                                   */
/* -------------------------------------------------------------------------- */

export interface UpdateRoleInput {
  name?: string;
  description?: string;

  accessLevel?: RoleAccessLevel;
  scope?: RoleScope;
  status?: RoleStatus;

  permissions?: Types.ObjectId[];

  updatedBy?: Types.ObjectId;
}

/* -------------------------------------------------------------------------- */
/*                              Role Filters                                  */
/* -------------------------------------------------------------------------- */

export interface RoleFilters {
  code?: string;
  name?: string;

  accessLevel?: RoleAccessLevel;
  scope?: RoleScope;
  status?: RoleStatus;

  isSystemRole?: boolean;

  search?: string;
}

/* -------------------------------------------------------------------------- */
/*                             Role List Query                                */
/* -------------------------------------------------------------------------- */

export interface RoleListQuery extends RoleFilters {
  page?: number;
  limit?: number;

  sortBy?: keyof RoleEntity;
  sortOrder?: "asc" | "desc";
}

/* -------------------------------------------------------------------------- */
/*                            Role Permission Input                           */
/* -------------------------------------------------------------------------- */

export interface AssignRolePermissionInput {
  roleId: Types.ObjectId;
  permissionIds: Types.ObjectId[];
  updatedBy?: Types.ObjectId;
}

/* -------------------------------------------------------------------------- */
/*                            Role Response                                   */
/* -------------------------------------------------------------------------- */

export interface RoleResponse {
  id: string;

  code: string;
  name: string;
  description?: string;

  accessLevel: RoleAccessLevel;
  scope: RoleScope;
  status: RoleStatus;

  permissions: RolePermission[];

  isSystemRole: boolean;

  createdAt: Date;
  updatedAt: Date;

  createdBy?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/*                           Role List Response                               */
/* -------------------------------------------------------------------------- */

export interface RoleListResponse {
  items: RoleResponse[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* -------------------------------------------------------------------------- */
/*                             Role Statistics                                */
/* -------------------------------------------------------------------------- */

export interface RoleStatistics {
  total: number;
  active: number;
  inactive: number;
  systemRoles: number;
  customRoles: number;
}
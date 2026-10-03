import type { Types } from "mongoose";

/**
 * Permission status.
 */
export type PermissionStatus = "ACTIVE" | "INACTIVE";

/**
 * Permission scope.
 *
 * GLOBAL     → permission can be used across the complete system.
 * BRANCH     → permission is restricted to a branch.
 * DEPARTMENT → permission is restricted to a department.
 */
export type PermissionScope = "GLOBAL" | "BRANCH" | "DEPARTMENT";

/**
 * Permission action.
 */
export type PermissionAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "LIST"
  | "EXPORT"
  | "IMPORT"
  | "APPROVE"
  | "REJECT"
  | "ASSIGN"
  | "UNASSIGN"
  | "MANAGE";

/**
 * Permission module.
 */
export type PermissionModule =
  | "DASHBOARD"
  | "CUSTOMER"
  | "CONTACT"
  | "LEAD"
  | "ENQUIRY"
  | "QUOTATION"
  | "BOOKING"
  | "SHIPMENT"
  | "SERVICE"
  | "TRACKING"
  | "TASK"
  | "NOTIFICATION"
  | "INVOICE"
  | "PAYMENT"
  | "VENDOR"
  | "REPORT"
  | "MASTER"
  | "USER"
  | "ROLE"
  | "PERMISSION"
  | "BRANCH"
  | "DEPARTMENT"
  | "AUDIT"
  | "SETTINGS";

/**
 * Permission entity.
 */
export interface PermissionEntity {
  _id: Types.ObjectId;

  /**
   * Unique permission code.
   *
   * Example:
   * SHIPMENT_CREATE
   * SHIPMENT_READ
   * SHIPMENT_UPDATE
   */
  code: string;

  /**
   * Human-readable permission name.
   */
  name: string;

  /**
   * Permission description.
   */
  description?: string;

  /**
   * Logical module to which the permission belongs.
   */
  module: PermissionModule;

  /**
   * Action allowed by this permission.
   */
  action: PermissionAction;

  /**
   * Scope at which the permission applies.
   */
  scope: PermissionScope;

  /**
   * Current permission status.
   */
  status: PermissionStatus;

  /**
   * Indicates whether this permission is a system permission.
   *
   * System permissions cannot normally be removed or modified
   * through standard administrative operations.
   */
  isSystemPermission: boolean;

  /**
   * Audit information.
   */
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/**
 * Input used to create a permission.
 */
export interface CreatePermissionInput {
  code: string;
  name: string;
  description?: string;
  module: PermissionModule;
  action: PermissionAction;
  scope?: PermissionScope;
  status?: PermissionStatus;
  isSystemPermission?: boolean;
}

/**
 * Input used to update a permission.
 *
 * The code and module/action identity are intentionally not required
 * because an existing permission may be updated without changing
 * its identity.
 */
export interface UpdatePermissionInput {
  name?: string;
  description?: string;
  scope?: PermissionScope;
  status?: PermissionStatus;
}

/**
 * Permission filters.
 */
export interface PermissionFilters {
  code?: string;
  name?: string;
  module?: PermissionModule;
  action?: PermissionAction;
  scope?: PermissionScope;
  status?: PermissionStatus;
  isSystemPermission?: boolean;
  search?: string;
}

/**
 * Permission list query.
 */
export interface PermissionListQuery extends PermissionFilters {
  page?: number;
  limit?: number;
  sortBy?: keyof PermissionEntity;
  sortOrder?: "asc" | "desc";
}

/**
 * Permission response returned by API services.
 */
export interface PermissionResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: PermissionModule;
  action: PermissionAction;
  scope: PermissionScope;
  status: PermissionStatus;
  isSystemPermission: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Paginated permission response.
 */
export interface PermissionListResponse {
  items: PermissionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Permission statistics.
 */
export interface PermissionStatistics {
  total: number;
  active: number;
  inactive: number;
  system: number;
  custom: number;
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  byScope: Record<string, number>;
}

/**
 * Bulk permission status update input.
 */
export interface BulkPermissionStatusInput {
  permissionIds: Types.ObjectId[];
  status: PermissionStatus;
}

/**
 * Permission code validation result.
 */
export interface PermissionCodeValidationResult {
  valid: boolean;
  code: string;
  module?: PermissionModule;
  action?: PermissionAction;
}
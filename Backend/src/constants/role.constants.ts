export const ROLE_CONSTANTS = Object.freeze({
  CODES: Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    MANAGER: "MANAGER",
    SALES: "SALES",
    OPERATIONS: "OPERATIONS",
    DOCUMENTATION: "DOCUMENTATION",
    FINANCE: "FINANCE",
    WAREHOUSE_TRANSPORT: "WAREHOUSE_TRANSPORT",
    VIEWER: "VIEWER",
  }),

  NAMES: Object.freeze({
    SUPER_ADMIN: "Super Admin",
    MANAGER: "Manager",
    SALES: "Sales / CRM",
    OPERATIONS: "Operations",
    DOCUMENTATION: "Documentation / Customs",
    FINANCE: "Finance",
    WAREHOUSE_TRANSPORT: "Warehouse / Transport",
    VIEWER: "Viewer / Auditor",
  }),

  SYSTEM_ROLES: Object.freeze([
    "SUPER_ADMIN",
    "MANAGER",
    "SALES",
    "OPERATIONS",
    "DOCUMENTATION",
    "FINANCE",
    "WAREHOUSE_TRANSPORT",
    "VIEWER",
  ] as const),

  PERMISSION_POLICY: Object.freeze({
    SUPER_ADMIN_WILDCARD: "*",
    ALLOW_INHERITANCE: false,
    REQUIRE_EXPLICIT_PERMISSION: true,
  }),

  ACCESS_LEVELS: Object.freeze({
    FULL: "FULL",
    MANAGEMENT: "MANAGEMENT",
    SALES: "SALES",
    OPERATIONS: "OPERATIONS",
    DOCUMENTATION: "DOCUMENTATION",
    FINANCE: "FINANCE",
    WAREHOUSE: "WAREHOUSE",
    READ_ONLY: "READ_ONLY",
  }),

  STATUS: Object.freeze({
    ACTIVE: "active",
    INACTIVE: "inactive",
  }),

  EVENTS: Object.freeze({
    CREATED: "role:created",
    UPDATED: "role:updated",
    DELETED: "role:deleted",
    ACTIVATED: "role:activated",
    DEACTIVATED: "role:deactivated",
    PERMISSIONS_UPDATED: "role:permissions-updated",
    ASSIGNED: "role:assigned",
    REVOKED: "role:revoked",
  }),

  ERROR_CODES: Object.freeze({
    ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
    ROLE_ALREADY_EXISTS: "ROLE_ALREADY_EXISTS",
    INVALID_ROLE: "INVALID_ROLE",
    SYSTEM_ROLE_PROTECTED: "SYSTEM_ROLE_PROTECTED",
    ROLE_IN_USE: "ROLE_IN_USE",
    ROLE_REQUIRED: "ROLE_REQUIRED",
    ROLE_PERMISSION_REQUIRED: "ROLE_PERMISSION_REQUIRED",
    CANNOT_DELETE_SUPER_ADMIN: "CANNOT_DELETE_SUPER_ADMIN",
    CANNOT_MODIFY_SYSTEM_ROLE: "CANNOT_MODIFY_SYSTEM_ROLE",
  }),

  VALIDATION: Object.freeze({
    MIN_CODE_LENGTH: 2,
    MAX_CODE_LENGTH: 50,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
  }),
} as const);

export type RoleCode =
  (typeof ROLE_CONSTANTS.CODES)[keyof typeof ROLE_CONSTANTS.CODES];

export type RoleName =
  (typeof ROLE_CONSTANTS.NAMES)[keyof typeof ROLE_CONSTANTS.NAMES];

export type RoleAccessLevel =
  (typeof ROLE_CONSTANTS.ACCESS_LEVELS)[keyof typeof ROLE_CONSTANTS.ACCESS_LEVELS];

export type RoleStatus =
  (typeof ROLE_CONSTANTS.STATUS)[keyof typeof ROLE_CONSTANTS.STATUS];

export type RoleEvent =
  (typeof ROLE_CONSTANTS.EVENTS)[keyof typeof ROLE_CONSTANTS.EVENTS];

export type RoleErrorCode =
  (typeof ROLE_CONSTANTS.ERROR_CODES)[keyof typeof ROLE_CONSTANTS.ERROR_CODES];

export function isSystemRole(roleCode: string): boolean {
  return ROLE_CONSTANTS.SYSTEM_ROLES.includes(
    roleCode as (typeof ROLE_CONSTANTS.SYSTEM_ROLES)[number],
  );
}

export function isValidRoleCode(roleCode: string): roleCode is RoleCode {
  return Object.values(ROLE_CONSTANTS.CODES).includes(
    roleCode as RoleCode,
  );
}

export function getRoleAccessLevel(
  roleCode: RoleCode,
): RoleAccessLevel {
  switch (roleCode) {
    case ROLE_CONSTANTS.CODES.SUPER_ADMIN:
      return ROLE_CONSTANTS.ACCESS_LEVELS.FULL;

    case ROLE_CONSTANTS.CODES.MANAGER:
      return ROLE_CONSTANTS.ACCESS_LEVELS.MANAGEMENT;

    case ROLE_CONSTANTS.CODES.SALES:
      return ROLE_CONSTANTS.ACCESS_LEVELS.SALES;

    case ROLE_CONSTANTS.CODES.OPERATIONS:
      return ROLE_CONSTANTS.ACCESS_LEVELS.OPERATIONS;

    case ROLE_CONSTANTS.CODES.DOCUMENTATION:
      return ROLE_CONSTANTS.ACCESS_LEVELS.DOCUMENTATION;

    case ROLE_CONSTANTS.CODES.FINANCE:
      return ROLE_CONSTANTS.ACCESS_LEVELS.FINANCE;

    case ROLE_CONSTANTS.CODES.WAREHOUSE_TRANSPORT:
      return ROLE_CONSTANTS.ACCESS_LEVELS.WAREHOUSE;

    case ROLE_CONSTANTS.CODES.VIEWER:
      return ROLE_CONSTANTS.ACCESS_LEVELS.READ_ONLY;

    default:
      return ROLE_CONSTANTS.ACCESS_LEVELS.READ_ONLY;
  }
}
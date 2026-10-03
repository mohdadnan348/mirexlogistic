export const PERMISSION_CONSTANTS = Object.freeze({
  WILDCARD: "*",

  SEPARATOR: ":",

  MODULES: Object.freeze({
    DASHBOARD: "dashboard",
    CUSTOMER: "customer",
    CONTACT: "contact",
    LEAD: "lead",
    ENQUIRY: "enquiry",
    QUOTATION: "quotation",
    BOOKING: "booking",
    SHIPMENT: "shipment",
    AIR: "air",
    OCEAN: "ocean",
    LAND: "land",
    COURIER: "courier",
    WAREHOUSE: "warehouse",
    TRANSPORT: "transport",
    CUSTOMS: "customs",
    DOCUMENTATION: "documentation",
    TRACKING: "tracking",
    TASK: "task",
    NOTIFICATION: "notification",
    INVOICE: "invoice",
    PAYMENT: "payment",
    VENDOR: "vendor",
    REPORT: "report",
    MASTER: "master",
    USER: "user",
    ROLE: "role",
    PERMISSION: "permission",
    BRANCH: "branch",
    DEPARTMENT: "department",
    AUDIT: "audit",
    SETTINGS: "settings",
  }),

  ACTIONS: Object.freeze({
    CREATE: "create",
    READ: "read",
    UPDATE: "update",
    DELETE: "delete",
    APPROVE: "approve",
    SEND: "send",
    EXPORT: "export",
  }),

  CODES: Object.freeze({
    DASHBOARD_READ: "dashboard:read",

    CUSTOMER_CREATE: "customer:create",
    CUSTOMER_READ: "customer:read",
    CUSTOMER_UPDATE: "customer:update",
    CUSTOMER_DELETE: "customer:delete",

    CONTACT_CREATE: "contact:create",
    CONTACT_READ: "contact:read",
    CONTACT_UPDATE: "contact:update",
    CONTACT_DELETE: "contact:delete",

    LEAD_CREATE: "lead:create",
    LEAD_READ: "lead:read",
    LEAD_UPDATE: "lead:update",
    LEAD_DELETE: "lead:delete",

    ENQUIRY_CREATE: "enquiry:create",
    ENQUIRY_READ: "enquiry:read",
    ENQUIRY_UPDATE: "enquiry:update",
    ENQUIRY_DELETE: "enquiry:delete",

    QUOTATION_CREATE: "quotation:create",
    QUOTATION_READ: "quotation:read",
    QUOTATION_UPDATE: "quotation:update",
    QUOTATION_DELETE: "quotation:delete",
    QUOTATION_APPROVE: "quotation:approve",
    QUOTATION_SEND: "quotation:send",

    BOOKING_CREATE: "booking:create",
    BOOKING_READ: "booking:read",
    BOOKING_UPDATE: "booking:update",
    BOOKING_DELETE: "booking:delete",
    BOOKING_APPROVE: "booking:approve",

    SHIPMENT_CREATE: "shipment:create",
    SHIPMENT_READ: "shipment:read",
    SHIPMENT_UPDATE: "shipment:update",
    SHIPMENT_DELETE: "shipment:delete",
    SHIPMENT_APPROVE: "shipment:approve",

    AIR_CREATE: "air:create",
    AIR_READ: "air:read",
    AIR_UPDATE: "air:update",
    AIR_DELETE: "air:delete",

    OCEAN_CREATE: "ocean:create",
    OCEAN_READ: "ocean:read",
    OCEAN_UPDATE: "ocean:update",
    OCEAN_DELETE: "ocean:delete",

    LAND_CREATE: "land:create",
    LAND_READ: "land:read",
    LAND_UPDATE: "land:update",
    LAND_DELETE: "land:delete",

    COURIER_CREATE: "courier:create",
    COURIER_READ: "courier:read",
    COURIER_UPDATE: "courier:update",
    COURIER_DELETE: "courier:delete",

    WAREHOUSE_CREATE: "warehouse:create",
    WAREHOUSE_READ: "warehouse:read",
    WAREHOUSE_UPDATE: "warehouse:update",
    WAREHOUSE_DELETE: "warehouse:delete",

    TRANSPORT_CREATE: "transport:create",
    TRANSPORT_READ: "transport:read",
    TRANSPORT_UPDATE: "transport:update",
    TRANSPORT_DELETE: "transport:delete",

    CUSTOMS_CREATE: "customs:create",
    CUSTOMS_READ: "customs:read",
    CUSTOMS_UPDATE: "customs:update",
    CUSTOMS_DELETE: "customs:delete",

    DOCUMENTATION_CREATE: "documentation:create",
    DOCUMENTATION_READ: "documentation:read",
    DOCUMENTATION_UPDATE: "documentation:update",
    DOCUMENTATION_DELETE: "documentation:delete",

    TRACKING_CREATE: "tracking:create",
    TRACKING_READ: "tracking:read",
    TRACKING_UPDATE: "tracking:update",

    TASK_CREATE: "task:create",
    TASK_READ: "task:read",
    TASK_UPDATE: "task:update",
    TASK_DELETE: "task:delete",

    NOTIFICATION_CREATE: "notification:create",
    NOTIFICATION_READ: "notification:read",
    NOTIFICATION_UPDATE: "notification:update",
    NOTIFICATION_DELETE: "notification:delete",

    INVOICE_CREATE: "invoice:create",
    INVOICE_READ: "invoice:read",
    INVOICE_UPDATE: "invoice:update",
    INVOICE_DELETE: "invoice:delete",
    INVOICE_APPROVE: "invoice:approve",
    INVOICE_SEND: "invoice:send",

    PAYMENT_CREATE: "payment:create",
    PAYMENT_READ: "payment:read",
    PAYMENT_UPDATE: "payment:update",
    PAYMENT_DELETE: "payment:delete",
    PAYMENT_APPROVE: "payment:approve",

    VENDOR_CREATE: "vendor:create",
    VENDOR_READ: "vendor:read",
    VENDOR_UPDATE: "vendor:update",
    VENDOR_DELETE: "vendor:delete",

    REPORT_READ: "report:read",
    REPORT_EXPORT: "report:export",

    MASTER_CREATE: "master:create",
    MASTER_READ: "master:read",
    MASTER_UPDATE: "master:update",
    MASTER_DELETE: "master:delete",

    USER_CREATE: "user:create",
    USER_READ: "user:read",
    USER_UPDATE: "user:update",
    USER_DELETE: "user:delete",

    ROLE_CREATE: "role:create",
    ROLE_READ: "role:read",
    ROLE_UPDATE: "role:update",
    ROLE_DELETE: "role:delete",

    PERMISSION_CREATE: "permission:create",
    PERMISSION_READ: "permission:read",
    PERMISSION_UPDATE: "permission:update",
    PERMISSION_DELETE: "permission:delete",

    BRANCH_CREATE: "branch:create",
    BRANCH_READ: "branch:read",
    BRANCH_UPDATE: "branch:update",
    BRANCH_DELETE: "branch:delete",

    DEPARTMENT_CREATE: "department:create",
    DEPARTMENT_READ: "department:read",
    DEPARTMENT_UPDATE: "department:update",
    DEPARTMENT_DELETE: "department:delete",

    AUDIT_READ: "audit:read",
    AUDIT_EXPORT: "audit:export",

    SETTINGS_READ: "settings:read",
    SETTINGS_UPDATE: "settings:update",
  }),

  EVENTS: Object.freeze({
    PERMISSION_CREATED: "permission:created",
    PERMISSION_UPDATED: "permission:updated",
    PERMISSION_DELETED: "permission:deleted",
    PERMISSION_ASSIGNED: "permission:assigned",
    PERMISSION_REVOKED: "permission:revoked",
  }),

  ERROR_CODES: Object.freeze({
    PERMISSION_NOT_FOUND: "PERMISSION_NOT_FOUND",
    PERMISSION_ALREADY_EXISTS: "PERMISSION_ALREADY_EXISTS",
    INVALID_PERMISSION: "INVALID_PERMISSION",
    PERMISSION_REQUIRED: "PERMISSION_REQUIRED",
    INSUFFICIENT_PERMISSION: "INSUFFICIENT_PERMISSION",
    WILDCARD_PERMISSION_REQUIRED: "WILDCARD_PERMISSION_REQUIRED",
  }),
} as const);

export type PermissionModule =
  (typeof PERMISSION_CONSTANTS.MODULES)[keyof typeof PERMISSION_CONSTANTS.MODULES];

export type PermissionAction =
  (typeof PERMISSION_CONSTANTS.ACTIONS)[keyof typeof PERMISSION_CONSTANTS.ACTIONS];

export type PermissionCode =
  (typeof PERMISSION_CONSTANTS.CODES)[keyof typeof PERMISSION_CONSTANTS.CODES];

export type PermissionEvent =
  (typeof PERMISSION_CONSTANTS.EVENTS)[keyof typeof PERMISSION_CONSTANTS.EVENTS];

export type PermissionErrorCode =
  (typeof PERMISSION_CONSTANTS.ERROR_CODES)[keyof typeof PERMISSION_CONSTANTS.ERROR_CODES];

export function buildPermissionCode(
  module: PermissionModule,
  action: PermissionAction,
): string {
  return `${module}${PERMISSION_CONSTANTS.SEPARATOR}${action}`;
}

export function hasWildcardPermission(
  permissions: readonly string[],
): boolean {
  return permissions.includes(PERMISSION_CONSTANTS.WILDCARD);
}

export function hasPermission(
  permissions: readonly string[],
  requiredPermission: string,
): boolean {
  return (
    hasWildcardPermission(permissions) ||
    permissions.includes(requiredPermission)
  );
}
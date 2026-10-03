export const APP_CONSTANTS = Object.freeze({
  APP_NAME: "MirexCargo",

  API: Object.freeze({
    DEFAULT_PREFIX: "/api/v1",
    HEALTH_PATH: "/health",
    AUTH_PATH: "/auth",
    TRACKING_PATH: "/tracking",
  }),

  PAGINATION: Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  }),

  AUTH: Object.freeze({
    ACCESS_TOKEN_TYPE: "Bearer",
    TOKEN_HEADER_NAME: "authorization",
    REFRESH_TOKEN_COOKIE_NAME: "refreshToken",
    ACCESS_TOKEN_COOKIE_NAME: "accessToken",
  }),

  USER: Object.freeze({
    DEFAULT_STATUS: "active",
    MAX_LOGIN_ATTEMPTS: 5,
    LOCK_DURATION_MINUTES: 30,
  }),

  ROLES: Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    MANAGER: "MANAGER",
    SALES: "SALES",
    OPERATIONS: "OPERATIONS",
    DOCUMENTATION: "DOCUMENTATION",
    FINANCE: "FINANCE",
    WAREHOUSE_TRANSPORT: "WAREHOUSE_TRANSPORT",
    VIEWER: "VIEWER",
  }),

  PERMISSIONS: Object.freeze({
    ALL: "*",
    SEPARATOR: ":",
  }),

  STATUS: Object.freeze({
    ACTIVE: "active",
    INACTIVE: "inactive",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
    FAILED: "failed",
    DELETED: "deleted",
  }),

  SHIPMENT: Object.freeze({
    DRAFT: "DRAFT",
    BOOKED: "BOOKED",
    IN_TRANSIT: "IN_TRANSIT",
    CUSTOMS: "CUSTOMS",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
  }),

  SERVICE_TYPES: Object.freeze({
    AIR: "AIR",
    OCEAN: "OCEAN",
    LAND: "LAND",
    COURIER: "COURIER",
    CUSTOMS: "CUSTOMS",
    WAREHOUSE: "WAREHOUSE",
  }),

  CARGO_TYPES: Object.freeze({
    GENERAL: "GENERAL",
    PERISHABLE: "PERISHABLE",
    DANGEROUS: "DANGEROUS",
    FRAGILE: "FRAGILE",
    VALUABLE: "VALUABLE",
  }),

  PACKAGE_TYPES: Object.freeze({
    BOX: "BOX",
    PALLET: "PALLET",
    CRATE: "CRATE",
    BAG: "BAG",
    CARTON: "CARTON",
  }),

  UNITS: Object.freeze({
    KG: "KG",
    MT: "MT",
    CBM: "CBM",
    PCS: "PCS",
    BOX: "BOX",
  }),

  PAYMENT_MODES: Object.freeze({
    CASH: "CASH",
    BANK_TRANSFER: "BANK_TRANSFER",
    CARD: "CARD",
    UPI: "UPI",
    CHEQUE: "CHEQUE",
  }),

  INCOTERMS: Object.freeze({
    EXW: "EXW",
    FOB: "FOB",
    CIF: "CIF",
    CFR: "CFR",
    DAP: "DAP",
    DDP: "DDP",
  }),

  MESSAGES: Object.freeze({
    SUCCESS: "Operation completed successfully.",
    CREATED: "Resource created successfully.",
    UPDATED: "Resource updated successfully.",
    DELETED: "Resource deleted successfully.",
    NOT_FOUND: "Resource not found.",
    UNAUTHORIZED: "Authentication is required.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_FAILED: "Validation failed.",
    INTERNAL_ERROR: "An unexpected error occurred.",
  }),

  SOCKET: Object.freeze({
    JOIN_USER: "socket:join-user",
    LEAVE_USER: "socket:leave-user",
    JOIN_BRANCH: "socket:join-branch",
    LEAVE_BRANCH: "socket:leave-branch",
    JOIN_SHIPMENT: "socket:join-shipment",
    LEAVE_SHIPMENT: "socket:leave-shipment",
  }),

  SOCKET_ROOMS: Object.freeze({
    USER_PREFIX: "user:",
    BRANCH_PREFIX: "branch:",
    SHIPMENT_PREFIX: "shipment:",
  }),

  EVENTS: Object.freeze({
    CREATED: "created",
    UPDATED: "updated",
    DELETED: "deleted",
    APPROVED: "approved",
    REJECTED: "rejected",
    STATUS_CHANGED: "status:changed",
  }),

  FILES: Object.freeze({
    DEFAULT_MAX_SIZE_MB: 10,
    DEFAULT_MAX_SIZE_BYTES: 10 * 1024 * 1024,
    ALLOWED_DOCUMENT_EXTENSIONS: [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".csv",
      ".txt",
    ],
    ALLOWED_IMAGE_EXTENSIONS: [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ],
  }),

  DATE_TIME: Object.freeze({
    DEFAULT_TIMEZONE: "Asia/Kolkata",
    ISO_DATE_FORMAT: "YYYY-MM-DD",
    ISO_DATETIME_FORMAT: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  }),

  DATABASE: Object.freeze({
    COLLECTIONS: Object.freeze({
      USERS: "users",
      ROLES: "roles",
      PERMISSIONS: "permissions",
      BRANCHES: "branches",
      CUSTOMERS: "customers",
      CONTACTS: "contacts",
      LEADS: "leads",
      ENQUIRIES: "enquiries",
      QUOTATIONS: "quotations",
      BOOKINGS: "bookings",
      SHIPMENTS: "shipments",
      INVOICES: "invoices",
      PAYMENTS: "payments",
      VENDORS: "vendors",
      TASKS: "tasks",
      NOTIFICATIONS: "notifications",
      AUDIT_LOGS: "audit_logs",
    }),
  }),
} as const);

export type AppRole =
  (typeof APP_CONSTANTS.ROLES)[keyof typeof APP_CONSTANTS.ROLES];

export type ShipmentStatus =
  (typeof APP_CONSTANTS.SHIPMENT)[keyof typeof APP_CONSTANTS.SHIPMENT];

export type ServiceType =
  (typeof APP_CONSTANTS.SERVICE_TYPES)[keyof typeof APP_CONSTANTS.SERVICE_TYPES];

export type CargoType =
  (typeof APP_CONSTANTS.CARGO_TYPES)[keyof typeof APP_CONSTANTS.CARGO_TYPES];

export type PackageType =
  (typeof APP_CONSTANTS.PACKAGE_TYPES)[keyof typeof APP_CONSTANTS.PACKAGE_TYPES];

export type PaymentMode =
  (typeof APP_CONSTANTS.PAYMENT_MODES)[keyof typeof APP_CONSTANTS.PAYMENT_MODES];

export type Incoterm =
  (typeof APP_CONSTANTS.INCOTERMS)[keyof typeof APP_CONSTANTS.INCOTERMS];
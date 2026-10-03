export const STATUS_CONSTANTS = Object.freeze({
  COMMON: Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    EXPIRED: "EXPIRED",
  }),

  USER: Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
    LOCKED: "LOCKED",
    PENDING: "PENDING",
  }),

  LEAD: Object.freeze({
    NEW: "NEW",
    CONTACTED: "CONTACTED",
    QUALIFIED: "QUALIFIED",
    PROPOSAL: "PROPOSAL",
    NEGOTIATION: "NEGOTIATION",
    CONVERTED: "CONVERTED",
    LOST: "LOST",
    CLOSED: "CLOSED",
  }),

  ENQUIRY: Object.freeze({
    NEW: "NEW",
    IN_PROGRESS: "IN_PROGRESS",
    QUOTED: "QUOTED",
    CONVERTED: "CONVERTED",
    CLOSED: "CLOSED",
    CANCELLED: "CANCELLED",
  }),

  QUOTATION: Object.freeze({
    DRAFT: "DRAFT",
    SENT: "SENT",
    VIEWED: "VIEWED",
    NEGOTIATION: "NEGOTIATION",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
    CONVERTED: "CONVERTED",
    CANCELLED: "CANCELLED",
  }),

  BOOKING: Object.freeze({
    DRAFT: "DRAFT",
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
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

  TASK: Object.freeze({
    TODO: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    ON_HOLD: "ON_HOLD",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  }),

  DOCUMENT: Object.freeze({
    DRAFT: "DRAFT",
    PENDING: "PENDING",
    SUBMITTED: "SUBMITTED",
    VERIFIED: "VERIFIED",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
    ARCHIVED: "ARCHIVED",
  }),

  INVOICE: Object.freeze({
    DRAFT: "DRAFT",
    SENT: "SENT",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    PAID: "PAID",
    OVERDUE: "OVERDUE",
    CANCELLED: "CANCELLED",
    VOID: "VOID",
  }),

  PAYMENT: Object.freeze({
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED",
    PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
    CANCELLED: "CANCELLED",
  }),

  VENDOR: Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    PENDING: "PENDING",
    SUSPENDED: "SUSPENDED",
    BLACKLISTED: "BLACKLISTED",
  }),

  CUSTOMER: Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    PROSPECT: "PROSPECT",
    BLOCKED: "BLOCKED",
  }),

  NOTIFICATION: Object.freeze({
    UNREAD: "UNREAD",
    READ: "READ",
    ARCHIVED: "ARCHIVED",
  }),

  EMAIL: Object.freeze({
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    SENT: "SENT",
    FAILED: "FAILED",
    BOUNCED: "BOUNCED",
  }),

  SMS: Object.freeze({
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    SENT: "SENT",
    FAILED: "FAILED",
    DELIVERED: "DELIVERED",
  }),

  DELIVERY: Object.freeze({
    PENDING: "PENDING",
    ASSIGNED: "ASSIGNED",
    PICKED_UP: "PICKED_UP",
    IN_TRANSIT: "IN_TRANSIT",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    RETURNED: "RETURNED",
  }),

  CUSTOMS: Object.freeze({
    PENDING: "PENDING",
    DOCUMENTATION: "DOCUMENTATION",
    SUBMITTED: "SUBMITTED",
    UNDER_REVIEW: "UNDER_REVIEW",
    CLEARED: "CLEARED",
    HELD: "HELD",
    REJECTED: "REJECTED",
  }),

  WAREHOUSE: Object.freeze({
    RECEIVED: "RECEIVED",
    STORED: "STORED",
    PICKING: "PICKING",
    PACKED: "PACKED",
    DISPATCHED: "DISPATCHED",
    DAMAGED: "DAMAGED",
    RELEASED: "RELEASED",
  }),

  ATTENDANCE: Object.freeze({
    PRESENT: "PRESENT",
    ABSENT: "ABSENT",
    HALF_DAY: "HALF_DAY",
    LATE: "LATE",
    ON_LEAVE: "ON_LEAVE",
    HOLIDAY: "HOLIDAY",
    WEEK_OFF: "WEEK_OFF",
  }),

  LEAVE: Object.freeze({
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
  }),

  JOB: Object.freeze({
    QUEUED: "QUEUED",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
  }),

  SYNC: Object.freeze({
    PENDING: "PENDING",
    SYNCING: "SYNCING",
    SYNCED: "SYNCED",
    FAILED: "FAILED",
  }),
} as const);

export type CommonStatus =
  (typeof STATUS_CONSTANTS.COMMON)[keyof typeof STATUS_CONSTANTS.COMMON];

export type UserStatus =
  (typeof STATUS_CONSTANTS.USER)[keyof typeof STATUS_CONSTANTS.USER];

export type LeadStatus =
  (typeof STATUS_CONSTANTS.LEAD)[keyof typeof STATUS_CONSTANTS.LEAD];

export type EnquiryStatus =
  (typeof STATUS_CONSTANTS.ENQUIRY)[keyof typeof STATUS_CONSTANTS.ENQUIRY];

export type QuotationStatus =
  (typeof STATUS_CONSTANTS.QUOTATION)[keyof typeof STATUS_CONSTANTS.QUOTATION];

export type BookingStatus =
  (typeof STATUS_CONSTANTS.BOOKING)[keyof typeof STATUS_CONSTANTS.BOOKING];

export type ShipmentStatus =
  (typeof STATUS_CONSTANTS.SHIPMENT)[keyof typeof STATUS_CONSTANTS.SHIPMENT];

export type TaskStatus =
  (typeof STATUS_CONSTANTS.TASK)[keyof typeof STATUS_CONSTANTS.TASK];

export type DocumentStatus =
  (typeof STATUS_CONSTANTS.DOCUMENT)[keyof typeof STATUS_CONSTANTS.DOCUMENT];

export type InvoiceStatus =
  (typeof STATUS_CONSTANTS.INVOICE)[keyof typeof STATUS_CONSTANTS.INVOICE];

export type PaymentStatus =
  (typeof STATUS_CONSTANTS.PAYMENT)[keyof typeof STATUS_CONSTANTS.PAYMENT];

export type VendorStatus =
  (typeof STATUS_CONSTANTS.VENDOR)[keyof typeof STATUS_CONSTANTS.VENDOR];

export type CustomerStatus =
  (typeof STATUS_CONSTANTS.CUSTOMER)[keyof typeof STATUS_CONSTANTS.CUSTOMER];

export type NotificationStatus =
  (typeof STATUS_CONSTANTS.NOTIFICATION)[keyof typeof STATUS_CONSTANTS.NOTIFICATION];

export type EmailStatus =
  (typeof STATUS_CONSTANTS.EMAIL)[keyof typeof STATUS_CONSTANTS.EMAIL];

export type SmsStatus =
  (typeof STATUS_CONSTANTS.SMS)[keyof typeof STATUS_CONSTANTS.SMS];

export type DeliveryStatus =
  (typeof STATUS_CONSTANTS.DELIVERY)[keyof typeof STATUS_CONSTANTS.DELIVERY];

export type CustomsStatus =
  (typeof STATUS_CONSTANTS.CUSTOMS)[keyof typeof STATUS_CONSTANTS.CUSTOMS];

export type WarehouseStatus =
  (typeof STATUS_CONSTANTS.WAREHOUSE)[keyof typeof STATUS_CONSTANTS.WAREHOUSE];

export type AttendanceStatus =
  (typeof STATUS_CONSTANTS.ATTENDANCE)[keyof typeof STATUS_CONSTANTS.ATTENDANCE];

export type LeaveStatus =
  (typeof STATUS_CONSTANTS.LEAVE)[keyof typeof STATUS_CONSTANTS.LEAVE];

export type JobStatus =
  (typeof STATUS_CONSTANTS.JOB)[keyof typeof STATUS_CONSTANTS.JOB];

export type SyncStatus =
  (typeof STATUS_CONSTANTS.SYNC)[keyof typeof STATUS_CONSTANTS.SYNC];

export function isValidCommonStatus(
  status: string,
): status is CommonStatus {
  return Object.values(STATUS_CONSTANTS.COMMON).includes(
    status as CommonStatus,
  );
}

export function isValidShipmentStatus(
  status: string,
): status is ShipmentStatus {
  return Object.values(STATUS_CONSTANTS.SHIPMENT).includes(
    status as ShipmentStatus,
  );
}

export function isValidPaymentStatus(
  status: string,
): status is PaymentStatus {
  return Object.values(STATUS_CONSTANTS.PAYMENT).includes(
    status as PaymentStatus,
  );
}

export function isValidInvoiceStatus(
  status: string,
): status is InvoiceStatus {
  return Object.values(STATUS_CONSTANTS.INVOICE).includes(
    status as InvoiceStatus,
  );
}

export function isValidTaskStatus(
  status: string,
): status is TaskStatus {
  return Object.values(STATUS_CONSTANTS.TASK).includes(
    status as TaskStatus,
  );
}

export function isValidDocumentStatus(
  status: string,
): status is DocumentStatus {
  return Object.values(STATUS_CONSTANTS.DOCUMENT).includes(
    status as DocumentStatus,
  );
}
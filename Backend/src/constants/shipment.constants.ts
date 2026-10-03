export const SHIPMENT_CONSTANTS = Object.freeze({
  TYPES: Object.freeze({
    AIR_EXPORT: "AIR_EXPORT",
    AIR_IMPORT: "AIR_IMPORT",
    OCEAN_EXPORT: "OCEAN_EXPORT",
    OCEAN_IMPORT: "OCEAN_IMPORT",
    LAND_EXPORT: "LAND_EXPORT",
    LAND_IMPORT: "LAND_IMPORT",
    COURIER: "COURIER",
  }),

  MODES: Object.freeze({
    AIR: "AIR",
    OCEAN: "OCEAN",
    LAND: "LAND",
    COURIER: "COURIER",
  }),

  STATUS: Object.freeze({
    DRAFT: "DRAFT",
    BOOKED: "BOOKED",
    IN_TRANSIT: "IN_TRANSIT",
    CUSTOMS: "CUSTOMS",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
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

  WEIGHT_UNITS: Object.freeze({
    KG: "KG",
    MT: "MT",
  }),

  VOLUME_UNITS: Object.freeze({
    CBM: "CBM",
  }),

  QUANTITY_UNITS: Object.freeze({
    PCS: "PCS",
    BOX: "BOX",
  }),

  INCOTERMS: Object.freeze({
    EXW: "EXW",
    FOB: "FOB",
    CIF: "CIF",
    CFR: "CFR",
    DAP: "DAP",
    DDP: "DDP",
  }),

  SERVICE_TYPES: Object.freeze({
    AIR: "AIR",
    OCEAN: "OCEAN",
    LAND: "LAND",
    COURIER: "COURIER",
    CUSTOMS: "CUSTOMS",
    WAREHOUSE: "WAREHOUSE",
  }),

  DIRECTIONS: Object.freeze({
    IMPORT: "IMPORT",
    EXPORT: "EXPORT",
  }),

  FCL_LCL: Object.freeze({
    FCL: "FCL",
    LCL: "LCL",
  }),

  CONTAINER_TYPES: Object.freeze({
    "20GP": "20GP",
    "40GP": "40GP",
    "40HC": "40HC",
    "45HC": "45HC",
    "20RF": "20RF",
    "40RF": "40RF",
    "20OT": "20OT",
    "40OT": "40OT",
    "20FR": "20FR",
    "40FR": "40FR",
  }),

  PRIORITY: Object.freeze({
    LOW: "LOW",
    NORMAL: "NORMAL",
    HIGH: "HIGH",
    URGENT: "URGENT",
  }),

  DOCUMENT_STATUS: Object.freeze({
    PENDING: "PENDING",
    SUBMITTED: "SUBMITTED",
    VERIFIED: "VERIFIED",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
  }),

  DELIVERY_STATUS: Object.freeze({
    PENDING: "PENDING",
    ASSIGNED: "ASSIGNED",
    PICKED_UP: "PICKED_UP",
    IN_TRANSIT: "IN_TRANSIT",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    RETURNED: "RETURNED",
  }),

  MILESTONE_TYPES: Object.freeze({
    BOOKED: "BOOKED",
    PICKUP: "PICKUP",
    DEPARTED: "DEPARTED",
    ARRIVED: "ARRIVED",
    CUSTOMS_STARTED: "CUSTOMS_STARTED",
    CUSTOMS_CLEARED: "CUSTOMS_CLEARED",
    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
    DELIVERED: "DELIVERED",
    POD_RECEIVED: "POD_RECEIVED",
  }),

  EVENTS: Object.freeze({
    CREATED: "shipment:created",
    UPDATED: "shipment:updated",
    DELETED: "shipment:deleted",
    BOOKED: "shipment:booked",
    STATUS_CHANGED: "shipment:status:changed",
    MILESTONE_ADDED: "shipment:milestone:added",
    DOCUMENT_ADDED: "shipment:document:added",
    DOCUMENT_UPDATED: "shipment:document:updated",
    DELIVERY_ASSIGNED: "shipment:delivery:assigned",
    DELIVERED: "shipment:delivered",
    CANCELLED: "shipment:cancelled",
  }),

  ERROR_CODES: Object.freeze({
    SHIPMENT_NOT_FOUND: "SHIPMENT_NOT_FOUND",
    SHIPMENT_ALREADY_EXISTS: "SHIPMENT_ALREADY_EXISTS",
    INVALID_SHIPMENT_TYPE: "INVALID_SHIPMENT_TYPE",
    INVALID_SHIPMENT_MODE: "INVALID_SHIPMENT_MODE",
    INVALID_SHIPMENT_STATUS: "INVALID_SHIPMENT_STATUS",
    INVALID_CARGO_TYPE: "INVALID_CARGO_TYPE",
    INVALID_PACKAGE_TYPE: "INVALID_PACKAGE_TYPE",
    INVALID_INCOTERM: "INVALID_INCOTERM",
    INVALID_DIRECTION: "INVALID_DIRECTION",
    INVALID_CONTAINER_TYPE: "INVALID_CONTAINER_TYPE",
    INVALID_PRIORITY: "INVALID_PRIORITY",
    INVALID_WEIGHT: "INVALID_WEIGHT",
    INVALID_VOLUME: "INVALID_VOLUME",
    INVALID_QUANTITY: "INVALID_QUANTITY",
    SHIPMENT_ALREADY_CANCELLED: "SHIPMENT_ALREADY_CANCELLED",
    SHIPMENT_ALREADY_DELIVERED: "SHIPMENT_ALREADY_DELIVERED",
    SHIPMENT_STATUS_TRANSITION_NOT_ALLOWED:
      "SHIPMENT_STATUS_TRANSITION_NOT_ALLOWED",
    MILESTONE_NOT_FOUND: "MILESTONE_NOT_FOUND",
    DOCUMENT_NOT_FOUND: "SHIPMENT_DOCUMENT_NOT_FOUND",
    DOCUMENT_ALREADY_VERIFIED: "DOCUMENT_ALREADY_VERIFIED",
    DELIVERY_NOT_FOUND: "DELIVERY_NOT_FOUND",
  }),

  VALIDATION: Object.freeze({
    SHIPMENT_NUMBER_MIN_LENGTH: 5,
    SHIPMENT_NUMBER_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 2000,

    MAX_PACKAGES_PER_SHIPMENT: 10000,
    MAX_DOCUMENTS_PER_SHIPMENT: 500,
    MAX_MILESTONES_PER_SHIPMENT: 1000,

    MIN_WEIGHT: 0,
    MIN_VOLUME: 0,
    MIN_QUANTITY: 1,
  }),

  NUMBERING: Object.freeze({
    PREFIX: "SHP",
    MIN_SEQUENCE_LENGTH: 6,
  }),

  STATUS_TRANSITIONS: {
    DRAFT: ["BOOKED", "CANCELLED"],
    BOOKED: ["IN_TRANSIT", "CUSTOMS", "CANCELLED"],
    IN_TRANSIT: [
      "CUSTOMS",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ],
    CUSTOMS: [
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "CANCELLED",
    ],
    OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
  } as Record<
    | "DRAFT"
    | "BOOKED"
    | "IN_TRANSIT"
    | "CUSTOMS"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED",
    readonly string[]
  >,
} as const);

export type ShipmentType =
  (typeof SHIPMENT_CONSTANTS.TYPES)[keyof typeof SHIPMENT_CONSTANTS.TYPES];

export type ShipmentMode =
  (typeof SHIPMENT_CONSTANTS.MODES)[keyof typeof SHIPMENT_CONSTANTS.MODES];

export type ShipmentStatus =
  (typeof SHIPMENT_CONSTANTS.STATUS)[keyof typeof SHIPMENT_CONSTANTS.STATUS];

export type ShipmentCargoType =
  (typeof SHIPMENT_CONSTANTS.CARGO_TYPES)[keyof typeof SHIPMENT_CONSTANTS.CARGO_TYPES];

export type ShipmentPackageType =
  (typeof SHIPMENT_CONSTANTS.PACKAGE_TYPES)[keyof typeof SHIPMENT_CONSTANTS.PACKAGE_TYPES];

export type ShipmentIncoterm =
  (typeof SHIPMENT_CONSTANTS.INCOTERMS)[keyof typeof SHIPMENT_CONSTANTS.INCOTERMS];

export type ShipmentDirection =
  (typeof SHIPMENT_CONSTANTS.DIRECTIONS)[keyof typeof SHIPMENT_CONSTANTS.DIRECTIONS];

export type ShipmentPriority =
  (typeof SHIPMENT_CONSTANTS.PRIORITY)[keyof typeof SHIPMENT_CONSTANTS.PRIORITY];

export type ShipmentDocumentStatus =
  (typeof SHIPMENT_CONSTANTS.DOCUMENT_STATUS)[keyof typeof SHIPMENT_CONSTANTS.DOCUMENT_STATUS];

export type ShipmentDeliveryStatus =
  (typeof SHIPMENT_CONSTANTS.DELIVERY_STATUS)[keyof typeof SHIPMENT_CONSTANTS.DELIVERY_STATUS];

export type ShipmentMilestoneType =
  (typeof SHIPMENT_CONSTANTS.MILESTONE_TYPES)[keyof typeof SHIPMENT_CONSTANTS.MILESTONE_TYPES];

export function isValidShipmentStatus(
  status: string,
): status is ShipmentStatus {
  return Object.values(SHIPMENT_CONSTANTS.STATUS).includes(
    status as ShipmentStatus,
  );
}

export function canTransitionShipmentStatus(
  currentStatus: ShipmentStatus,
  nextStatus: ShipmentStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedTransitions =
    SHIPMENT_CONSTANTS.STATUS_TRANSITIONS[currentStatus];

  return allowedTransitions.includes(nextStatus);
}
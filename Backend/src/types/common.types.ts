import type { Types } from "mongoose";

/**
 * Common identifier types.
 */
export type Id = string;

export type MongoId =
  | string
  | Types.ObjectId;

/**
 * Common status values.
 */
export type CommonStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "ARCHIVED"
  | "DELETED";

/**
 * Generic record metadata.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Database entity metadata.
 */
export interface BaseMongoEntity {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

/**
 * Branch-scoped entity.
 */
export interface BranchScopedEntity {
  branchId: string;
}

/**
 * Soft-deletable entity.
 */
export interface SoftDeletableEntity {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

/**
 * Complete common entity representation.
 */
export interface CommonEntity
  extends BaseEntity,
    SoftDeletableEntity {
  status: CommonStatus;
}

/**
 * Generic key-value pair.
 */
export interface KeyValue<
  K extends string = string,
  V = string,
> {
  key: K;
  value: V;
}

/**
 * Select/dropdown option.
 */
export interface SelectOption<
  TValue = string,
> {
  label: string;
  value: TValue;
  disabled?: boolean;
  description?: string;
}

/**
 * Generic label/value option.
 */
export interface LabelValue<
  TValue = string,
> {
  label: string;
  value: TValue;
}

/**
 * Generic API validation error.
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: unknown;
}

/**
 * Generic API error information.
 */
export interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

/**
 * Generic date range.
 */
export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Date range represented as ISO strings.
 */
export interface DateRangeInput {
  from: string;
  to: string;
}

/**
 * Geographic coordinates.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Address representation.
 */
export interface Address {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  countryCode?: string;
  coordinates?: Coordinates;
}

/**
 * Contact information.
 */
export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
}

/**
 * File metadata.
 */
export interface FileInfo {
  id?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  extension?: string;
  size: number;
  url?: string;
  key?: string;
}

/**
 * Audit metadata.
 */
export interface AuditMetadata {
  requestId?: string;
  userId?: string;
  branchId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generic sort direction.
 */
export type SortDirection =
  | "asc"
  | "desc";

/**
 * Generic sorting descriptor.
 */
export interface SortOption {
  field: string;
  direction: SortDirection;
}

/**
 * Generic search parameters.
 */
export interface SearchParams {
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Generic API query parameters.
 */
export interface CommonQueryParams
  extends SearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortDirection;
}

/**
 * Generic ID response.
 */
export interface IdResponse {
  id: string;
}

/**
 * Generic count response.
 */
export interface CountResponse {
  count: number;
}

/**
 * Generic boolean response.
 */
export interface BooleanResponse {
  success: boolean;
}

/**
 * Generic operation result.
 */
export interface OperationResult {
  success: boolean;
  message?: string;
}

/**
 * Generic bulk operation result.
 */
export interface BulkOperationResult {
  matchedCount: number;
  modifiedCount: number;
  failedCount: number;
  errors?: ValidationError[];
}

/**
 * Generic entity reference.
 */
export interface EntityReference {
  id: string;
  name: string;
  code?: string;
}

/**
 * User reference.
 */
export interface UserReference
  extends EntityReference {
  email?: string;
}

/**
 * Branch reference.
 */
export interface BranchReference
  extends EntityReference {
  city?: string;
  country?: string;
}

/**
 * Customer reference.
 */
export interface CustomerReference
  extends EntityReference {
  email?: string;
  phone?: string;
}

/**
 * Shipment reference.
 */
export interface ShipmentReference
  extends EntityReference {
  trackingNumber?: string;
}

/**
 * Generic timestamp information.
 */
export interface TimestampInfo {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generic pagination cursor.
 */
export interface CursorPagination {
  nextCursor?: string;
  previousCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Generic event payload.
 */
export interface EventPayload<
  T = unknown,
> {
  event: string;
  data: T;
  timestamp: Date;
  userId?: string;
  branchId?: string;
}

/**
 * Generic notification payload.
 */
export interface NotificationPayload {
  title: string;
  message: string;
  type?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generic import row.
 */
export interface ImportRow<
  T = Record<string, unknown>,
> {
  rowNumber: number;
  data: T;
  errors?: ValidationError[];
}

/**
 * Generic import result.
 */
export interface ImportResult<
  T = Record<string, unknown>,
> {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  rows: ImportRow<T>[];
}

/**
 * Generic export options.
 */
export interface ExportOptions {
  format:
    | "csv"
    | "xlsx"
    | "pdf";
  fields?: string[];
  fileName?: string;
}

/**
 * Generic filter value.
 */
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | null;

/**
 * Generic filter definition.
 */
export interface Filter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains"
    | "startsWith"
    | "endsWith";
  value: FilterValue;
}

/**
 * Generic status option.
 */
export interface StatusOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Generic API metadata.
 */
export interface ApiMetadata {
  requestId?: string;
  timestamp: string;
  version?: string;
}

/**
 * Generic nullable type.
 */
export type Nullable<T> =
  | T
  | null;

/**
 * Generic optional nullable type.
 */
export type OptionalNullable<T> =
  | T
  | null
  | undefined;

/**
 * Extract non-nullable value.
 */
export type NonNullableValue<T> =
  NonNullable<T>;

/**
 * Convert interface properties to optional.
 */
export type PartialRecord<
  K extends PropertyKey,
  T,
> = Partial<Record<K, T>>;

/**
 * Make selected properties optional.
 */
export type Optional<
  T,
  K extends keyof T,
> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Make selected properties required.
 */
export type RequiredFields<
  T,
  K extends keyof T,
> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Extract keys whose values match a type.
 */
export type KeysOfType<
  T,
  TValue,
> = {
  [K in keyof T]-?: T[K] extends TValue
    ? K
    : never;
}[keyof T];

/**
 * Generic JSON-compatible primitive.
 */
export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

/**
 * Generic JSON-compatible value.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

/**
 * Generic metadata map.
 */
export type Metadata =
  Record<string, unknown>;

/**
 * Convert a MongoDB ObjectId to a string.
 */
export function toIdString(
  value: MongoId,
): string {
  return typeof value === "string"
    ? value
    : value.toString();
}

/**
 * Check whether a value is a non-empty string.
 */
export function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

/**
 * Check whether a value is a valid finite number.
 */
export function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

/**
 * Check whether a value is a valid Date.
 */
export function isValidDateValue(
  value: unknown,
): value is Date {
  return (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  );
}

/**
 * Check whether a value is a plain object.
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}
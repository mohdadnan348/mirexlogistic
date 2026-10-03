export type PaginationPage = number;
export type PaginationLimit = number;
export type PaginationOffset = number;

export type PaginationSortDirection =
  | "asc"
  | "desc";

/**
 * Basic page/limit pagination input.
 */
export interface PaginationParams {
  page?: PaginationPage;
  limit?: PaginationLimit;
}

/**
 * Normalized pagination values used internally.
 */
export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Pagination metadata returned by APIs.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Cursor-based pagination metadata.
 */
export interface CursorPaginationMeta {
  nextCursor?: string;
  previousCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Generic paginated response.
 */
export interface PaginatedResponse<
  T,
> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Cursor-based paginated response.
 */
export interface CursorPaginatedResponse<
  T,
> {
  data: T[];
  meta: CursorPaginationMeta;
}

/**
 * Pagination query parameters.
 */
export interface PaginationQuery
  extends PaginationParams {
  sortBy?: string;
  sortOrder?: PaginationSortDirection;
}

/**
 * Pagination configuration.
 */
export interface PaginationConfig {
  defaultPage: number;
  defaultLimit: number;
  maxLimit: number;
}

/**
 * Pagination calculation result.
 */
export interface PaginationCalculation {
  page: number;
  limit: number;
  skip: number;
  total: number;
  totalPages: number;
}

/**
 * Pagination link information.
 */
export interface PaginationLinks {
  first?: string;
  last?: string;
  previous?: string;
  next?: string;
}

/**
 * Complete pagination information.
 */
export interface PaginationInfo
  extends PaginationMeta {
  links?: PaginationLinks;
}

/**
 * Pagination options used by repository/service
 * methods.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: PaginationSortDirection;
}

/**
 * Pagination result used internally by repositories.
 */
export interface PaginationResult<
  T,
> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Pagination cursor.
 */
export interface PaginationCursor {
  cursor: string;
  direction:
    | "next"
    | "previous";
}

/**
 * Pagination request with cursor support.
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

/**
 * Default pagination configuration.
 */
export const DEFAULT_PAGINATION: Readonly<PaginationConfig> =
  Object.freeze({
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  });

/**
 * Normalize page number.
 */
export function normalizePage(
  page: unknown,
  defaultPage =
    DEFAULT_PAGINATION.defaultPage,
): number {
  const parsed =
    typeof page === "number"
      ? page
      : Number(page);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return defaultPage;
  }

  return Math.floor(parsed);
}

/**
 * Normalize page size.
 */
export function normalizeLimit(
  limit: unknown,
  defaultLimit =
    DEFAULT_PAGINATION.defaultLimit,
  maxLimit =
    DEFAULT_PAGINATION.maxLimit,
): number {
  const parsed =
    typeof limit === "number"
      ? limit
      : Number(limit);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return defaultLimit;
  }

  return Math.min(
    Math.floor(parsed),
    maxLimit,
  );
}

/**
 * Calculate document skip value.
 */
export function calculateSkip(
  page: number,
  limit: number,
): number {
  return Math.max(
    0,
    (page - 1) * limit,
  );
}

/**
 * Calculate total number of pages.
 */
export function calculateTotalPages(
  total: number,
  limit: number,
): number {
  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    limit <= 0
  ) {
    return 0;
  }

  return Math.ceil(total / limit);
}

/**
 * Calculate complete pagination values.
 */
export function calculatePagination(
  total: number,
  options: PaginationOptions = {},
): PaginationCalculation {
  const page = normalizePage(
    options.page,
  );

  const limit = normalizeLimit(
    options.limit,
  );

  const totalPages =
    calculateTotalPages(
      total,
      limit,
    );

  return {
    page,
    limit,
    skip: calculateSkip(
      page,
      limit,
    ),
    total,
    totalPages,
  };
}

/**
 * Create pagination metadata.
 */
export function createPaginationMeta(
  total: number,
  options: PaginationOptions = {},
): PaginationMeta {
  const pagination =
    calculatePagination(
      total,
      options,
    );

  return {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages:
      pagination.totalPages,
    hasNextPage:
      pagination.page <
      pagination.totalPages,
    hasPreviousPage:
      pagination.page > 1,
  };
}

/**
 * Create a paginated response.
 */
export function createPaginatedResponse<
  T,
>(
  data: T[],
  total: number,
  options: PaginationOptions = {},
): PaginatedResponse<T> {
  return {
    data,
    meta: createPaginationMeta(
      total,
      options,
    ),
  };
}

/**
 * Create a repository pagination result.
 */
export function createPaginationResult<
  T,
>(
  items: T[],
  total: number,
  options: PaginationOptions = {},
): PaginationResult<T> {
  const pagination =
    calculatePagination(
      total,
      options,
    );

  return {
    items,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages:
      pagination.totalPages,
  };
}

/**
 * Calculate offset from page/limit.
 */
export function pageToOffset(
  page: number,
  limit: number,
): number {
  return calculateSkip(
    normalizePage(page),
    normalizeLimit(limit),
  );
}

/**
 * Convert offset to page number.
 */
export function offsetToPage(
  offset: number,
  limit: number,
): number {
  const normalizedLimit =
    normalizeLimit(limit);

  if (
    !Number.isFinite(offset) ||
    offset <= 0
  ) {
    return 1;
  }

  return (
    Math.floor(
      offset / normalizedLimit,
    ) + 1
  );
}

/**
 * Validate a page number.
 */
export function isValidPage(
  page: unknown,
): page is number {
  return (
    typeof page === "number" &&
    Number.isInteger(page) &&
    page >= 1
  );
}

/**
 * Validate a limit.
 */
export function isValidLimit(
  limit: unknown,
  maxLimit =
    DEFAULT_PAGINATION.maxLimit,
): limit is number {
  return (
    typeof limit === "number" &&
    Number.isInteger(limit) &&
    limit >= 1 &&
    limit <= maxLimit
  );
}

/**
 * Clamp a page value.
 */
export function clampPage(
  page: number,
): number {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(page),
  );
}

/**
 * Clamp a limit value.
 */
export function clampLimit(
  limit: number,
  maxLimit =
    DEFAULT_PAGINATION.maxLimit,
): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_PAGINATION.defaultLimit;
  }

  return Math.min(
    Math.max(1, Math.floor(limit)),
    maxLimit,
  );
}

/**
 * Get the next page number.
 */
export function getNextPage(
  meta: PaginationMeta,
): number | undefined {
  return meta.hasNextPage
    ? meta.page + 1
    : undefined;
}

/**
 * Get the previous page number.
 */
export function getPreviousPage(
  meta: PaginationMeta,
): number | undefined {
  return meta.hasPreviousPage
    ? meta.page - 1
    : undefined;
}
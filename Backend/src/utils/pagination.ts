export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInteger(
  value: unknown,
  fallback: number,
): number {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

export function normalizePagination(
  params: PaginationParams = {},
  options: PaginationOptions = {},
): NormalizedPagination {
  const defaultPage = parsePositiveInteger(
    options.defaultPage,
    DEFAULT_PAGE,
  );

  const defaultLimit = parsePositiveInteger(
    options.defaultLimit,
    DEFAULT_LIMIT,
  );

  const maxLimit = Math.max(
    defaultLimit,
    parsePositiveInteger(
      options.maxLimit,
      MAX_LIMIT,
    ),
  );

  const page = parsePositiveInteger(
    params.page,
    defaultPage,
  );

  const requestedLimit = parsePositiveInteger(
    params.limit,
    defaultLimit,
  );

  const limit = Math.min(
    requestedLimit,
    maxLimit,
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function getSkip(
  page: number,
  limit: number,
): number {
  const normalizedPage = parsePositiveInteger(
    page,
    DEFAULT_PAGE,
  );

  const normalizedLimit = parsePositiveInteger(
    limit,
    DEFAULT_LIMIT,
  );

  return (normalizedPage - 1) * normalizedLimit;
}

export function getTotalPages(
  total: number,
  limit: number,
): number {
  if (
    !Number.isFinite(total) ||
    total <= 0
  ) {
    return 0;
  }

  if (
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return 0;
  }

  return Math.ceil(total / limit);
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const normalizedPage = parsePositiveInteger(
    page,
    DEFAULT_PAGE,
  );

  const normalizedLimit = parsePositiveInteger(
    limit,
    DEFAULT_LIMIT,
  );

  const normalizedTotal =
    Number.isFinite(total) && total >= 0
      ? Math.floor(total)
      : 0;

  const totalPages = getTotalPages(
    normalizedTotal,
    normalizedLimit,
  );

  const hasNextPage =
    totalPages > 0 &&
    normalizedPage < totalPages;

  const hasPreviousPage =
    normalizedPage > 1 &&
    totalPages > 0;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    total: normalizedTotal,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage
      ? normalizedPage + 1
      : null,
    previousPage: hasPreviousPage
      ? normalizedPage - 1
      : null,
  };
}

export function createPaginatedResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return {
    data,
    meta: createPaginationMeta(
      page,
      limit,
      total,
    ),
  };
}

export function getPaginationFromQuery(
  query: PaginationParams,
  options: PaginationOptions = {},
): NormalizedPagination {
  return normalizePagination(
    {
      page: query.page,
      limit: query.limit,
    },
    options,
  );
}

export function getPageFromOffset(
  offset: number,
  limit: number,
): number {
  const normalizedOffset =
    Number.isFinite(offset) && offset >= 0
      ? Math.floor(offset)
      : 0;

  const normalizedLimit = parsePositiveInteger(
    limit,
    DEFAULT_LIMIT,
  );

  return (
    Math.floor(
      normalizedOffset / normalizedLimit,
    ) + 1
  );
}

export function getOffset(
  page: number,
  limit: number,
): number {
  return getSkip(page, limit);
}

export function isValidPage(
  page: unknown,
): page is number {
  return (
    typeof page === "number" &&
    Number.isInteger(page) &&
    page >= 1
  );
}

export function isValidLimit(
  limit: unknown,
  maxLimit = MAX_LIMIT,
): limit is number {
  return (
    typeof limit === "number" &&
    Number.isInteger(limit) &&
    limit >= 1 &&
    limit <= maxLimit
  );
}

export function clampPage(
  page: number,
  totalPages: number,
): number {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(
    Math.max(1, Math.floor(page)),
    totalPages,
  );
}

export function clampLimit(
  limit: number,
  maxLimit = MAX_LIMIT,
): number {
  return Math.min(
    Math.max(1, Math.floor(limit)),
    maxLimit,
  );
}
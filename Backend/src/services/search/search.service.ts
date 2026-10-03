import type {
  FilterQuery,
  Model,
} from "mongoose";

import {
  logError,
  logInfo,
} from "../../utils/logger";

export interface SearchableModel<
  T extends object,
> {
  model: Model<T>;
  fields: readonly string[];
  name: string;
}

export interface SearchOptions {
  search: string;
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  sort?: Record<string, 1 | -1>;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GlobalSearchItem {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResult {
  items: GlobalSearchItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 200;

function normalizePage(
  page?: number,
): number {
  if (
    page === undefined ||
    !Number.isFinite(page) ||
    page < 1
  ) {
    return DEFAULT_PAGE;
  }

  return Math.floor(page);
}

function normalizeLimit(
  limit?: number,
): number {
  if (
    limit === undefined ||
    !Number.isFinite(limit) ||
    limit < 1
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    Math.floor(limit),
    MAX_LIMIT,
  );
}

function normalizeSearchTerm(
  search: string,
): string {
  if (
    typeof search !== "string"
  ) {
    throw new Error(
      "Search term must be a string",
    );
  }

  const normalized =
    search.trim();

  if (!normalized) {
    throw new Error(
      "Search term is required",
    );
  }

  if (
    normalized.length >
    MAX_SEARCH_LENGTH
  ) {
    throw new Error(
      `Search term cannot exceed ${MAX_SEARCH_LENGTH} characters`,
    );
  }

  return normalized;
}

function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function buildSearchRegex(
  search: string,
): RegExp {
  return new RegExp(
    escapeRegex(search),
    "i",
  );
}

function getNestedValue(
  value: unknown,
  path: string,
): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (current, key) => {
        if (
          current === null ||
          current === undefined
        ) {
          return undefined;
        }

        if (
          typeof current !== "object"
        ) {
          return undefined;
        }

        return (
          current as Record<
            string,
            unknown
          >
        )[key];
      },
      value,
    );
}

function buildSearchQuery<
  T extends object,
>(
  options: SearchOptions,
  fields: readonly string[],
): FilterQuery<T> {
  const search =
    normalizeSearchTerm(
      options.search,
    );

  const regex =
    buildSearchRegex(search);

  const searchFields =
    options.fields?.length
      ? options.fields.filter(
          (field) =>
            fields.includes(field),
        )
      : [...fields];

  if (
    searchFields.length === 0
  ) {
    throw new Error(
      "No valid searchable fields were provided",
    );
  }

  const query: Record<
    string,
    unknown
  > = {
    ...(options.filters ?? {}),
  };

  if (options.branchId) {
    query.branchId =
      options.branchId;
  }

  if (options.status) {
    query.status =
      options.status;
  }

  query.$or =
    searchFields.map(
      (field) => ({
        [field]: regex,
      }),
    );

  return query as FilterQuery<T>;
}

export async function searchModel<
  T extends object,
>(
  searchableModel: SearchableModel<T>,
  options: SearchOptions,
): Promise<SearchResult<T>> {
  const page =
    normalizePage(options.page);

  const limit =
    normalizeLimit(options.limit);

  const skip =
    (page - 1) * limit;

  const query =
    buildSearchQuery(
      options,
      searchableModel.fields,
    );

  try {
    const [
      rawData,
      total,
    ] = await Promise.all([
      searchableModel.model
        .find(query)
        .sort(
          options.sort ?? {
            updatedAt: -1,
          },
        )
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      searchableModel.model
        .countDocuments(query)
        .exec(),
    ]);

    const data =
      rawData as T[];

    const totalPages =
      total > 0
        ? Math.ceil(
            total / limit,
          )
        : 0;

    logInfo(
      "Model search completed",
      {
        model:
          searchableModel.name,
        search:
          options.search,
        total,
        page,
        limit,
      },
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    logError(
      "Model search failed",
      {
        model:
          searchableModel.name,
        search:
          options.search,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    throw error;
  }
}

export async function searchMultipleModels(
  models: readonly SearchableModel<object>[],
  options: SearchOptions,
): Promise<GlobalSearchResult> {
  const page =
    normalizePage(options.page);

  const limit =
    normalizeLimit(options.limit);

  const search =
    normalizeSearchTerm(
      options.search,
    );

  const results =
    await Promise.all(
      models.map(
        async (searchableModel) =>
          searchModel(
            searchableModel,
            {
              ...options,
              search,
              page: 1,
              limit,
            },
          ),
      ),
    );

  const allItems: GlobalSearchItem[] =
    [];

  for (
    let index = 0;
    index < results.length;
    index += 1
  ) {
    const result =
      results[index];

    const model =
      models[index];

    for (
      const document of result.data
    ) {
      const record =
        document as Record<
          string,
          unknown
        >;

      const idValue =
        record.id ??
        record._id;

      if (
        idValue === undefined ||
        idValue === null
      ) {
        continue;
      }

      const title =
        getFirstStringValue(
          record,
          [
            "name",
            "title",
            "companyName",
            "customerName",
            "subject",
            "referenceNumber",
            "code",
          ],
        ) ??
        String(idValue);

      const subtitle =
        getFirstStringValue(
          record,
          [
            "email",
            "phone",
            "description",
            "status",
          ],
        );

      const code =
        getFirstStringValue(
          record,
          [
            "code",
            "referenceNumber",
            "trackingNumber",
            "shipmentNumber",
          ],
        );

      allItems.push({
        type: model.name,
        id: String(idValue),
        title,
        ...(subtitle
          ? {
              subtitle,
            }
          : {}),
        ...(code
          ? {
              code,
            }
          : {}),
      });
    }
  }

  const total =
    allItems.length;

  const start =
    (page - 1) * limit;

  const data =
    allItems.slice(
      start,
      start + limit,
    );

  const totalPages =
    total > 0
      ? Math.ceil(
          total / limit,
        )
      : 0;

  logInfo(
    "Global search completed",
    {
      search,
      models:
        models.map(
          (model) =>
            model.name,
        ),
      total,
      page,
      limit,
    },
  );

  return {
    items: data,
    total,
    page,
    limit,
    totalPages,
  };
}

function getFirstStringValue(
  record: Record<string, unknown>,
  fields: readonly string[],
): string | undefined {
  for (const field of fields) {
    const value =
      getNestedValue(
        record,
        field,
      );

    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim();
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
  }

  return undefined;
}

export function createSearchableModel<
  T extends object,
>(
  model: Model<T>,
  fields: readonly string[],
  name: string,
): SearchableModel<T> {
  if (!name.trim()) {
    throw new Error(
      "Searchable model name is required",
    );
  }

  if (
    !Array.isArray(fields) ||
    fields.length === 0
  ) {
    throw new Error(
      "At least one searchable field is required",
    );
  }

  const normalizedFields =
    Array.from(
      new Set(
        fields
          .map(
            (field) =>
              field.trim(),
          )
          .filter(Boolean),
      ),
    );

  if (
    normalizedFields.length === 0
  ) {
    throw new Error(
      "At least one valid searchable field is required",
    );
  }

  return {
    model,
    fields:
      normalizedFields,
    name: name.trim(),
  };
}

export function isSearchableField(
  searchableModel:
    SearchableModel<object>,
  field: string,
): boolean {
  return searchableModel.fields.includes(
    field,
  );
}

export function getSearchableFields(
  searchableModel:
    SearchableModel<object>,
): string[] {
  return [
    ...searchableModel.fields,
  ];
}
import { z } from "zod";

import type {
  PermissionAction,
  PermissionModule,
  PermissionScope,
  PermissionStatus,
} from "./permission.types";

/**
 * MongoDB ObjectId validation.
 */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-f\d]{24}$/i,
    "Invalid MongoDB ObjectId.",
  );

/**
 * Permission code validation.
 *
 * Examples:
 * CUSTOMER_CREATE
 * SHIPMENT_READ
 * INVOICE_APPROVE
 */
export const permissionCodeSchema = z
  .string()
  .trim()
  .min(2, "Permission code must contain at least 2 characters.")
  .max(
    150,
    "Permission code cannot exceed 150 characters.",
  )
  .regex(
    /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/,
    "Permission code must contain only uppercase letters, numbers and underscores.",
  )
  .transform((value) => value.toUpperCase());

/**
 * Permission name validation.
 */
export const permissionNameSchema = z
  .string()
  .trim()
  .min(2, "Permission name must contain at least 2 characters.")
  .max(
    150,
    "Permission name cannot exceed 150 characters.",
  );

/**
 * Permission description validation.
 */
export const permissionDescriptionSchema = z
  .string()
  .trim()
  .max(
    1000,
    "Permission description cannot exceed 1000 characters.",
  )
  .optional();

/**
 * Permission modules.
 */
export const permissionModuleSchema = z.enum([
  "DASHBOARD",
  "CUSTOMER",
  "CONTACT",
  "LEAD",
  "ENQUIRY",
  "QUOTATION",
  "BOOKING",
  "SHIPMENT",
  "SERVICE",
  "TRACKING",
  "TASK",
  "NOTIFICATION",
  "INVOICE",
  "PAYMENT",
  "VENDOR",
  "REPORT",
  "MASTER",
  "USER",
  "ROLE",
  "PERMISSION",
  "BRANCH",
  "DEPARTMENT",
  "AUDIT",
  "SETTINGS",
]);

/**
 * Permission actions.
 */
export const permissionActionSchema = z.enum([
  "CREATE",
  "READ",
  "UPDATE",
  "DELETE",
  "VIEW",
  "LIST",
  "EXPORT",
  "IMPORT",
  "APPROVE",
  "REJECT",
  "ASSIGN",
  "UNASSIGN",
  "MANAGE",
]);

/**
 * Permission scopes.
 */
export const permissionScopeSchema = z.enum([
  "GLOBAL",
  "BRANCH",
  "DEPARTMENT",
]);

/**
 * Permission statuses.
 */
export const permissionStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

/**
 * Create permission validator.
 */
export const createPermissionValidator = z
  .object({
    code: permissionCodeSchema,

    name: permissionNameSchema,

    description: permissionDescriptionSchema,

    module: permissionModuleSchema,

    action: permissionActionSchema,

    scope: permissionScopeSchema
      .optional()
      .default("GLOBAL"),

    status: permissionStatusSchema
      .optional()
      .default("ACTIVE"),

    isSystemPermission: z
      .boolean()
      .optional()
      .default(false),
  })
  .strict();

/**
 * Update permission validator.
 *
 * Permission identity fields such as code/module/action
 * are intentionally immutable after creation.
 */
export const updatePermissionValidator = z
  .object({
    name: permissionNameSchema.optional(),

    description: permissionDescriptionSchema,

    scope: permissionScopeSchema.optional(),

    status: permissionStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    {
      message:
        "At least one field is required for permission update.",
    },
  );

/**
 * Permission ID validator.
 */
export const permissionIdValidator = z
  .object({
    permissionId: objectIdSchema,
  })
  .strict();

/**
 * Permission code route validator.
 */
export const permissionCodeValidator = z
  .object({
    code: permissionCodeSchema,
  })
  .strict();

/**
 * Permission name validator.
 */
export const permissionNameValidator = z
  .object({
    name: permissionNameSchema,
  })
  .strict();

/**
 * Permission status update validator.
 */
export const permissionStatusValidator = z
  .object({
    permissionId: objectIdSchema,

    status: permissionStatusSchema,
  })
  .strict();

/**
 * Permission filters validator.
 */
export const permissionFiltersValidator = z
  .object({
    code: permissionCodeSchema.optional(),

    name: permissionNameSchema.optional(),

    module: permissionModuleSchema.optional(),

    action: permissionActionSchema.optional(),

    scope: permissionScopeSchema.optional(),

    status: permissionStatusSchema.optional(),

    isSystemPermission: z
      .union([
        z.boolean(),
        z
          .string()
          .trim()
          .transform((value) => {
            if (value === "true") {
              return true;
            }

            if (value === "false") {
              return false;
            }

            return value;
          })
          .pipe(z.boolean()),
      ])
      .optional(),

    search: z
      .string()
      .trim()
      .max(
        200,
        "Search cannot exceed 200 characters.",
      )
      .optional(),
  })
  .strict();

/**
 * Pagination query validator.
 */
export const paginationQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(1_000_000)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    sortBy: z
      .enum([
        "code",
        "name",
        "module",
        "action",
        "scope",
        "status",
        "isSystemPermission",
        "createdAt",
        "updatedAt",
      ])
      .default("createdAt"),

    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc"),
  })
  .strict();

/**
 * Permission list query validator.
 */
export const permissionListQueryValidator =
  permissionFiltersValidator
    .merge(paginationQuerySchema)
    .strict();

/**
 * Bulk permission ID validation.
 */
export const permissionIdsValidator = z
  .object({
    permissionIds: z
      .array(objectIdSchema)
      .min(
        1,
        "At least one permission ID is required.",
      )
      .max(
        500,
        "A maximum of 500 permission IDs is allowed.",
      ),
  })
  .strict();

/**
 * Bulk permission status validator.
 */
export const bulkPermissionStatusValidator = z
  .object({
    permissionIds: z
      .array(objectIdSchema)
      .min(
        1,
        "At least one permission ID is required.",
      )
      .max(
        500,
        "A maximum of 500 permission IDs is allowed.",
      ),

    status: permissionStatusSchema,
  })
  .strict();

/**
 * Permission identity validator.
 */
export const permissionIdentityValidator = z
  .object({
    module: permissionModuleSchema,

    action: permissionActionSchema,

    scope: permissionScopeSchema,
  })
  .strict();

/**
 * Validate a permission ID.
 */
export function validatePermissionId(
  value: string,
): boolean {
  return objectIdSchema.safeParse(value).success;
}

/**
 * Validate a permission code.
 */
export function validatePermissionCode(
  value: string,
): boolean {
  return permissionCodeSchema.safeParse(value).success;
}

/**
 * Validate a permission status.
 */
export function validatePermissionStatus(
  value: string,
): value is PermissionStatus {
  return permissionStatusSchema.safeParse(value)
    .success;
}

/**
 * Validate a permission module.
 */
export function validatePermissionModule(
  value: string,
): value is PermissionModule {
  return permissionModuleSchema.safeParse(value)
    .success;
}

/**
 * Validate a permission action.
 */
export function validatePermissionAction(
  value: string,
): value is PermissionAction {
  return permissionActionSchema.safeParse(value)
    .success;
}

/**
 * Validate a permission scope.
 */
export function validatePermissionScope(
  value: string,
): value is PermissionScope {
  return permissionScopeSchema.safeParse(value)
    .success;
}

/**
 * Parse and normalize a permission code.
 */
export function parsePermissionCode(
  value: string,
): string {
  return permissionCodeSchema.parse(value);
}

/**
 * Type helpers inferred from Zod schemas.
 */
export type CreatePermissionValidatorInput =
  z.infer<typeof createPermissionValidator>;

export type UpdatePermissionValidatorInput =
  z.infer<typeof updatePermissionValidator>;

export type PermissionIdValidatorInput =
  z.infer<typeof permissionIdValidator>;

export type PermissionCodeValidatorInput =
  z.infer<typeof permissionCodeValidator>;

export type PermissionStatusValidatorInput =
  z.infer<typeof permissionStatusValidator>;

export type PermissionFiltersValidatorInput =
  z.infer<typeof permissionFiltersValidator>;

export type PermissionListQueryValidatorInput =
  z.infer<typeof permissionListQueryValidator>;

export type PermissionIdsValidatorInput =
  z.infer<typeof permissionIdsValidator>;

export type BulkPermissionStatusValidatorInput =
  z.infer<typeof bulkPermissionStatusValidator>;

export type PermissionIdentityValidatorInput =
  z.infer<typeof permissionIdentityValidator>;
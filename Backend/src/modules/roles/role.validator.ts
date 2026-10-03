import { z } from "zod";

import type {
  RoleAccessLevel,
  RoleScope,
  RoleStatus,
} from "./role.types";

/* -------------------------------------------------------------------------- */
/*                              Shared Schemas                                */
/* -------------------------------------------------------------------------- */

const objectIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-fA-F0-9]{24}$/,
    "Invalid MongoDB ObjectId.",
  );

const roleCodeSchema = z
  .string()
  .trim()
  .min(2, "Role code must contain at least 2 characters.")
  .max(100, "Role code cannot exceed 100 characters.")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Role code may contain only letters, numbers, underscores and hyphens.",
  )
  .transform((value) => value.toUpperCase());

const roleNameSchema = z
  .string()
  .trim()
  .min(2, "Role name must contain at least 2 characters.")
  .max(150, "Role name cannot exceed 150 characters.");

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, "Description cannot exceed 1000 characters.")
  .optional();

const accessLevelSchema = z.enum([
  "SYSTEM",
  "ADMIN",
  "MANAGEMENT",
  "OPERATIONAL",
  "READ_ONLY",
]) satisfies z.ZodType<RoleAccessLevel>;

const scopeSchema = z.enum([
  "GLOBAL",
  "BRANCH",
  "DEPARTMENT",
]) satisfies z.ZodType<RoleScope>;

const statusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]) satisfies z.ZodType<RoleStatus>;

const permissionIdsSchema = z
  .array(objectIdSchema)
  .max(
    500,
    "A role cannot contain more than 500 permissions.",
  )
  .default([]);

/* -------------------------------------------------------------------------- */
/*                              Create Role                                   */
/* -------------------------------------------------------------------------- */

export const createRoleValidator = z
  .object({
    code: roleCodeSchema,

    name: roleNameSchema,

    description: descriptionSchema,

    accessLevel: accessLevelSchema,

    scope: scopeSchema,

    status: statusSchema
      .optional()
      .default("ACTIVE"),

    permissions: permissionIdsSchema
      .optional(),

    isSystemRole: z
      .boolean()
      .optional()
      .default(false),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                              Update Role                                   */
/* -------------------------------------------------------------------------- */

export const updateRoleValidator = z
  .object({
    name: roleNameSchema.optional(),

    description: descriptionSchema,

    accessLevel: accessLevelSchema.optional(),

    scope: scopeSchema.optional(),

    status: statusSchema.optional(),

    permissions: permissionIdsSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    {
      message:
        "At least one field is required to update a role.",
    },
  );

/* -------------------------------------------------------------------------- */
/*                              Role ID                                       */
/* -------------------------------------------------------------------------- */

export const roleIdValidator = z
  .object({
    roleId: objectIdSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                              Role Code                                     */
/* -------------------------------------------------------------------------- */

export const roleCodeValidator = z
  .object({
    code: roleCodeSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                              Role Name                                     */
/* -------------------------------------------------------------------------- */

export const roleNameValidator = z
  .object({
    name: roleNameSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                              Role Status                                   */
/* -------------------------------------------------------------------------- */

export const roleStatusValidator = z
  .object({
    roleId: objectIdSchema,

    status: statusSchema,
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                         Assign Permissions                                 */
/* -------------------------------------------------------------------------- */

export const rolePermissionsValidator = z
  .object({
    roleId: objectIdSchema,

    permissionIds: z
      .array(objectIdSchema)
      .min(
        1,
        "At least one permission is required.",
      )
      .max(
        500,
        "A role cannot contain more than 500 permissions.",
      ),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                             Role Filters                                   */
/* -------------------------------------------------------------------------- */

export const roleFiltersValidator = z
  .object({
    code: roleCodeSchema.optional(),

    name: roleNameSchema.optional(),

    accessLevel: accessLevelSchema.optional(),

    scope: scopeSchema.optional(),

    status: statusSchema.optional(),

    isSystemRole: z
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
      .min(
        1,
        "Search value cannot be empty.",
      )
      .max(
        150,
        "Search value cannot exceed 150 characters.",
      )
      .optional(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                             Pagination                                     */
/* -------------------------------------------------------------------------- */

const paginationQuerySchema = z.object({
  page: z
    .coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(1),

  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20),

  sortBy: z
    .enum([
      "_id",
      "code",
      "name",
      "accessLevel",
      "scope",
      "status",
      "createdAt",
      "updatedAt",
    ])
    .optional()
    .default("name"),

  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .default("asc"),
});

/* -------------------------------------------------------------------------- */
/*                           Role List Query                                  */
/* -------------------------------------------------------------------------- */

export const roleListQueryValidator =
  roleFiltersValidator
    .merge(paginationQuerySchema)
    .strict();

/* -------------------------------------------------------------------------- */
/*                         Permission Code                                    */
/* -------------------------------------------------------------------------- */

export const permissionCodeValidator = z
  .object({
    code: z
      .string()
      .trim()
      .min(
        2,
        "Permission code must contain at least 2 characters.",
      )
      .max(
        200,
        "Permission code cannot exceed 200 characters.",
      ),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/*                           Utility Validators                               */
/* -------------------------------------------------------------------------- */

export function validateRoleId(
  roleId: string,
): string {
  return objectIdSchema.parse(roleId);
}

export function validateRoleCode(
  code: string,
): string {
  return roleCodeSchema.parse(code);
}

export function validateRoleStatus(
  status: string,
): RoleStatus {
  return statusSchema.parse(status);
}

export function validateRoleAccessLevel(
  accessLevel: string,
): RoleAccessLevel {
  return accessLevelSchema.parse(accessLevel);
}

export function validateRoleScope(
  scope: string,
): RoleScope {
  return scopeSchema.parse(scope);
}

/* -------------------------------------------------------------------------- */
/*                              Type Exports                                  */
/* -------------------------------------------------------------------------- */

export type CreateRoleValidationInput = z.infer<
  typeof createRoleValidator
>;

export type UpdateRoleValidationInput = z.infer<
  typeof updateRoleValidator
>;

export type RoleIdValidationInput = z.infer<
  typeof roleIdValidator
>;

export type RoleStatusValidationInput = z.infer<
  typeof roleStatusValidator
>;

export type RolePermissionsValidationInput =
  z.infer<typeof rolePermissionsValidator>;

export type RoleFiltersValidationInput = z.infer<
  typeof roleFiltersValidator
>;

export type RoleListQueryValidationInput = z.infer<
  typeof roleListQueryValidator
>;
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import mongoose, {
  Types,
} from "mongoose";

import {
  PermissionModel,
} from "../modules/permissions/permission.model";

import type {
  PermissionAction,
  PermissionModule,
  PermissionScope,
} from "../modules/permissions/permission.types";

/**
 * Permission information attached to the request.
 */
export interface PermissionContext {
  permissions: string[];
  codes: string[];
  isGlobal: boolean;
}

/**
 * Extend Express Request with permission context.
 */
declare global {
  namespace Express {
    interface Request {
      permissionContext?: PermissionContext;
    }
  }
}

/**
 * Generic permission requirement.
 */
export interface PermissionRequirement {
  module: PermissionModule | string;
  action: PermissionAction | string;
  scope?: PermissionScope | string;
}

/**
 * Database role permission reference.
 *
 * This mirrors the fields stored by the role module without
 * creating a direct dependency on the role model.
 */
interface RolePermissionReference {
  permissionId?: unknown;
  code?: unknown;
  module?: unknown;
  action?: unknown;
  scope?: unknown;
}

/**
 * Raw role document required by this middleware.
 */
interface RawRoleDocument {
  _id?: Types.ObjectId;
  permissions?: RolePermissionReference[];
  isSystemRole?: boolean;
  scope?: string;
  status?: string;
}

/**
 * Raw user document required by this middleware.
 */
interface RawPermissionUserDocument {
  _id?: Types.ObjectId;
  roleId?: Types.ObjectId | string;
  dataScope?: string;
}

/**
 * Normalize a permission string.
 */
function normalizePermissionCode(
  value: unknown,
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toUpperCase();
}

/**
 * Convert an unknown value into a valid ObjectId.
 */
function toObjectId(
  value: unknown,
): Types.ObjectId | null {
  if (
    value instanceof Types.ObjectId
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  ) {
    return new Types.ObjectId(value);
  }

  return null;
}

/**
 * Build standard permission code.
 *
 * Example:
 *
 * CUSTOMER + READ
 * => CUSTOMER:READ
 *
 * CUSTOMER + READ + BRANCH
 * => CUSTOMER:READ:BRANCH
 */
export function buildPermissionCode(
  module: string,
  action: string,
  scope?: string,
): string {
  const normalizedModule =
    normalizePermissionCode(
      module,
    );

  const normalizedAction =
    normalizePermissionCode(
      action,
    );

  const normalizedScope =
    normalizePermissionCode(
      scope,
    );

  if (
    !normalizedModule ||
    !normalizedAction
  ) {
    return "";
  }

  if (normalizedScope) {
    return `${normalizedModule}:${normalizedAction}:${normalizedScope}`;
  }

  return `${normalizedModule}:${normalizedAction}`;
}

/**
 * Check wildcard permission.
 */
function hasWildcardPermission(
  permissions: Set<string>,
): boolean {
  return (
    permissions.has("*") ||
    permissions.has("*:*") ||
    permissions.has("*:*:*")
  );
}

/**
 * Check whether a permission set contains the
 * requested permission.
 *
 * Supports:
 *
 * CUSTOMER:READ
 * CUSTOMER:READ:BRANCH
 * CUSTOMER:*
 * CUSTOMER:*:BRANCH
 */
export function permissionSetHasPermission(
  permissions: Set<string>,
  code: string,
): boolean {
  const normalizedCode =
    normalizePermissionCode(
      code,
    );

  if (!normalizedCode) {
    return false;
  }

  if (
    hasWildcardPermission(
      permissions,
    )
  ) {
    return true;
  }

  if (
    permissions.has(
      normalizedCode,
    )
  ) {
    return true;
  }

  const parts =
    normalizedCode.split(":");

  if (
    parts.length >= 2
  ) {
    const module =
      parts[0];

    const action =
      parts[1];

    if (
      permissions.has(
        `${module}:*`,
      )
    ) {
      return true;
    }

    if (
      parts.length === 3 &&
      permissions.has(
        `${module}:${action}:*`,
      )
    ) {
      return true;
    }

    if (
      parts.length === 3 &&
      permissions.has(
        `${module}:*:${parts[2]}`,
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Read the current user's database record.
 *
 * We intentionally resolve this from the users collection instead
 * of relying on fields that are not part of AuthenticatedUser.
 */
async function findPermissionUser(
  userId: string,
): Promise<RawPermissionUserDocument | null> {
  const objectId =
    toObjectId(userId);

  if (!objectId) {
    return null;
  }

  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "MongoDB connection is not initialized.",
    );
  }

  const user =
    await database
      .collection<RawPermissionUserDocument>(
        "users",
      )
      .findOne(
        {
          _id: objectId,
        },
        {
          projection: {
            _id: 1,
            roleId: 1,
            dataScope: 1,
          },
        },
      );

  return user;
}

/**
 * Read a role directly from the roles collection.
 *
 * This avoids importing role.model.ts from the middleware and
 * therefore prevents a module-resolution/circular-dependency
 * problem during the incremental project build.
 */
async function findPermissionRole(
  roleId: unknown,
): Promise<RawRoleDocument | null> {
  const objectId =
    toObjectId(roleId);

  if (!objectId) {
    return null;
  }

  const database =
    mongoose.connection.db;

  if (!database) {
    throw new Error(
      "MongoDB connection is not initialized.",
    );
  }

  const role =
    await database
      .collection<RawRoleDocument>(
        "roles",
      )
      .findOne(
        {
          _id: objectId,
        },
        {
          projection: {
            _id: 1,
            permissions: 1,
            isSystemRole: 1,
            scope: 1,
            status: 1,
          },
        },
      );

  return role;
}

/**
 * Resolve the authenticated user's permission context.
 *
 * Permission resolution flow:
 *
 * authenticated user
 *      ↓
 * users collection
 *      ↓
 * roleId
 *      ↓
 * roles collection
 *      ↓
 * permission references
 *      ↓
 * permissions collection
 *      ↓
 * normalized permission codes
 */
async function resolveUserPermissions(
  request: Request,
): Promise<PermissionContext> {
  const authenticatedUser =
    request.auth?.user;

  if (
    !authenticatedUser?.id
  ) {
    return {
      permissions: [],
      codes: [],
      isGlobal: false,
    };
  }

  const user =
    await findPermissionUser(
      authenticatedUser.id,
    );

  if (!user) {
    return {
      permissions: [],
      codes: [],
      isGlobal: false,
    };
  }

  const isGlobal =
    normalizePermissionCode(
      user.dataScope,
    ) === "GLOBAL";

  const roleId =
    user.roleId;

  if (!roleId) {
    return {
      permissions: [],
      codes: [],
      isGlobal,
    };
  }

  const role =
    await findPermissionRole(
      roleId,
    );

  if (!role) {
    return {
      permissions: [],
      codes: [],
      isGlobal,
    };
  }

  /**
   * Inactive roles must not grant permissions.
   */
  if (
    role.status &&
    role.status !== "ACTIVE"
  ) {
    return {
      permissions: [],
      codes: [],
      isGlobal,
    };
  }

  const rolePermissions:
    RolePermissionReference[] =
    Array.isArray(
      role.permissions,
    )
      ? role.permissions
      : [];

  /**
   * Extract permission IDs.
   */
  const permissionIds:
    Types.ObjectId[] =
    rolePermissions
      .map(
        (
          permission: RolePermissionReference,
        ): Types.ObjectId | null =>
          toObjectId(
            permission.permissionId,
          ),
      )
      .filter(
        (
          permissionId:
            Types.ObjectId | null,
        ): permissionId is Types.ObjectId =>
          permissionId !== null,
      );

  /**
   * Extract permission codes stored directly on the role.
   */
  const roleCodes:
    string[] =
    rolePermissions
      .map(
        (
          permission: RolePermissionReference,
        ): string =>
          normalizePermissionCode(
            permission.code,
          ),
      )
      .filter(
        (
          code: string,
        ): boolean =>
          code.length > 0,
      );

  /**
   * Resolve permission documents.
   */
  const permissionDocuments =
    permissionIds.length > 0
      ? await PermissionModel.find({
          _id: {
            $in: permissionIds,
          },
          status: "ACTIVE",
        })
          .select(
            "code module action scope status",
          )
          .lean()
      : [];

  /**
   * Final permission code set.
   */
  const codes =
    new Set<string>();

  /**
   * Add codes stored directly in the role.
   */
  for (
    const code of roleCodes
  ) {
    codes.add(code);
  }

  /**
   * Add codes resolved from permission documents.
   */
  for (
    const permission of permissionDocuments
  ) {
    const directCode =
      normalizePermissionCode(
        permission.code,
      );

    if (directCode) {
      codes.add(
        directCode,
      );
    }

    const generatedCode =
      buildPermissionCode(
        String(
          permission.module,
        ),
        String(
          permission.action,
        ),
        permission.scope
          ? String(
              permission.scope,
            )
          : undefined,
      );

    if (generatedCode) {
      codes.add(
        generatedCode,
      );
    }
  }

  /**
   * System roles may use wildcard permissions.
   *
   * We only preserve wildcard permissions that are explicitly
   * stored on the role.
   */
  if (
    role.isSystemRole &&
    roleCodes.includes("*")
  ) {
    codes.add("*");
  }

  const finalCodes =
    Array.from(codes);

  return {
    permissions:
      finalCodes,
    codes:
      finalCodes,
    isGlobal,
  };
}

/**
 * Resolve and attach permission context.
 */
export const loadPermissions: RequestHandler =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (
        !request.auth?.user?.id
      ) {
        response.status(401).json({
          success: false,
          message:
            "Authentication is required.",
          errors: [
            {
              code:
                "UNAUTHORIZED",
              message:
                "Authentication is required.",
            },
          ],
        });

        return;
      }

      request.permissionContext =
        await resolveUserPermissions(
          request,
        );

      next();
    } catch {
      response.status(500).json({
        success: false,
        message:
          "Unable to resolve user permissions.",
        errors: [
          {
            code:
              "PERMISSION_RESOLUTION_FAILED",
            message:
              "Unable to resolve user permissions.",
          },
        ],
      });
    }
  };

/**
 * Alias.
 */
export const permissionContextMiddleware =
  loadPermissions;

/**
 * Check whether current request has a permission.
 *
 * Permission context is loaded automatically if it has
 * not already been initialized.
 */
export async function checkPermission(
  request: Request,
  requirement:
    | string
    | PermissionRequirement,
): Promise<boolean> {
  try {
    if (
      !request.permissionContext
    ) {
      request.permissionContext =
        await resolveUserPermissions(
          request,
        );
    }

    const context =
      request.permissionContext;

    if (!context) {
      return false;
    }

    const permissionCode =
      typeof requirement ===
      "string"
        ? requirement
        : buildPermissionCode(
            requirement.module,
            requirement.action,
            requirement.scope,
          );

    return permissionSetHasPermission(
      new Set(
        context.codes,
      ),
      permissionCode,
    );
  } catch {
    return false;
  }
}

/**
 * Require one permission.
 */
export function requirePermission(
  permission:
    | string
    | PermissionRequirement,
): RequestHandler {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (
        !request.auth?.user?.id
      ) {
        response.status(401).json({
          success: false,
          message:
            "Authentication is required.",
          errors: [
            {
              code:
                "UNAUTHORIZED",
              message:
                "Authentication is required.",
            },
          ],
        });

        return;
      }

      const allowed =
        await checkPermission(
          request,
          permission,
        );

      if (!allowed) {
        const code =
          typeof permission ===
          "string"
            ? permission
            : buildPermissionCode(
                permission.module,
                permission.action,
                permission.scope,
              );

        response.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action.",
          errors: [
            {
              code:
                "PERMISSION_DENIED",
              message:
                `Required permission: ${code}`,
            },
          ],
        });

        return;
      }

      next();
    } catch {
      response.status(403).json({
        success: false,
        message:
          "Permission check failed.",
        errors: [
          {
            code:
              "PERMISSION_CHECK_FAILED",
            message:
              "Permission check failed.",
          },
        ],
      });
    }
  };
}

/**
 * Require ALL supplied permissions.
 */
export function requireAllPermissions(
  permissions: Array<
    string | PermissionRequirement
  >,
): RequestHandler {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (
        !request.auth?.user?.id
      ) {
        response.status(401).json({
          success: false,
          message:
            "Authentication is required.",
          errors: [
            {
              code:
                "UNAUTHORIZED",
              message:
                "Authentication is required.",
            },
          ],
        });

        return;
      }

      if (
        !request.permissionContext
      ) {
        request.permissionContext =
          await resolveUserPermissions(
            request,
          );
      }

      const permissionSet =
        new Set(
          request.permissionContext
            ?.codes ?? [],
        );

      const missingPermissions:
        string[] = [];

      for (
        const permission of permissions
      ) {
        const code =
          typeof permission ===
          "string"
            ? permission
            : buildPermissionCode(
                permission.module,
                permission.action,
                permission.scope,
              );

        if (
          !permissionSetHasPermission(
            permissionSet,
            code,
          )
        ) {
          missingPermissions.push(
            code,
          );
        }
      }

      if (
        missingPermissions.length > 0
      ) {
        response.status(403).json({
          success: false,
          message:
            "You do not have all required permissions.",
          errors:
            missingPermissions.map(
              (
                code: string,
              ) => ({
                code:
                  "PERMISSION_DENIED",
                message:
                  `Required permission: ${code}`,
              }),
            ),
        });

        return;
      }

      next();
    } catch {
      response.status(403).json({
        success: false,
        message:
          "Permission check failed.",
        errors: [
          {
            code:
              "PERMISSION_CHECK_FAILED",
            message:
              "Permission check failed.",
          },
        ],
      });
    }
  };
}

/**
 * Require ANY one of the supplied permissions.
 */
export function requireAnyPermission(
  permissions: Array<
    string | PermissionRequirement
  >,
): RequestHandler {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (
        !request.auth?.user?.id
      ) {
        response.status(401).json({
          success: false,
          message:
            "Authentication is required.",
          errors: [
            {
              code:
                "UNAUTHORIZED",
              message:
                "Authentication is required.",
            },
          ],
        });

        return;
      }

      if (
        !request.permissionContext
      ) {
        request.permissionContext =
          await resolveUserPermissions(
            request,
          );
      }

      const permissionSet =
        new Set(
          request.permissionContext
            ?.codes ?? [],
        );

      for (
        const permission of permissions
      ) {
        const code =
          typeof permission ===
          "string"
            ? permission
            : buildPermissionCode(
                permission.module,
                permission.action,
                permission.scope,
              );

        if (
          permissionSetHasPermission(
            permissionSet,
            code,
          )
        ) {
          next();
          return;
        }
      }

      response.status(403).json({
        success: false,
        message:
          "You do not have any of the required permissions.",
        errors: [
          {
            code:
              "PERMISSION_DENIED",
            message:
              "At least one required permission is missing.",
          },
        ],
      });
    } catch {
      response.status(403).json({
        success: false,
        message:
          "Permission check failed.",
        errors: [
          {
            code:
              "PERMISSION_CHECK_FAILED",
            message:
              "Permission check failed.",
          },
        ],
      });
    }
  };
}

/**
 * Require CREATE permission.
 */
export function requireCreatePermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "CREATE",
    scope,
  });
}

/**
 * Require READ permission.
 */
export function requireReadPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "READ",
    scope,
  });
}

/**
 * Require VIEW permission.
 */
export function requireViewPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "VIEW",
    scope,
  });
}

/**
 * Require LIST permission.
 */
export function requireListPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "LIST",
    scope,
  });
}

/**
 * Require UPDATE permission.
 */
export function requireUpdatePermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "UPDATE",
    scope,
  });
}

/**
 * Require DELETE permission.
 */
export function requireDeletePermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "DELETE",
    scope,
  });
}

/**
 * Require EXPORT permission.
 */
export function requireExportPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "EXPORT",
    scope,
  });
}

/**
 * Require IMPORT permission.
 */
export function requireImportPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "IMPORT",
    scope,
  });
}

/**
 * Require APPROVE permission.
 */
export function requireApprovePermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "APPROVE",
    scope,
  });
}

/**
 * Require REJECT permission.
 */
export function requireRejectPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "REJECT",
    scope,
  });
}

/**
 * Require ASSIGN permission.
 */
export function requireAssignPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "ASSIGN",
    scope,
  });
}

/**
 * Require UNASSIGN permission.
 */
export function requireUnassignPermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "UNASSIGN",
    scope,
  });
}

/**
 * Require MANAGE permission.
 */
export function requireManagePermission(
  module:
    | PermissionModule
    | string,
  scope?:
    | PermissionScope
    | string,
): RequestHandler {
  return requirePermission({
    module,
    action: "MANAGE",
    scope,
  });
}

/**
 * Get current user's permissions.
 */
export function getCurrentPermissions(
  request: Request,
): string[] {
  return [
    ...(request.permissionContext
      ?.codes ?? []),
  ];
}

/**
 * Check whether current user has global
 * wildcard permission.
 */
export function hasGlobalPermission(
  request: Request,
): boolean {
  const permissions =
    request.permissionContext
      ?.codes ?? [];

  return hasWildcardPermission(
    new Set(
      permissions,
    ),
  );
}

/**
 * Clear cached permission context.
 *
 * Useful after role/permission changes during
 * the lifetime of a request.
 */
export function clearPermissionContext(
  request: Request,
): void {
  delete request.permissionContext;
}

/**
 * Check whether permission context exists.
 */
export function hasPermissionContext(
  request: Request,
): boolean {
  return Boolean(
    request.permissionContext,
  );
}

/**
 * Default middleware export.
 */
export default loadPermissions;
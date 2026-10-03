import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import { isValidObjectId } from "mongoose";

import { UserModel } from "../modules/users/user.model";
import type {
  UserDataScope,
  UserEntity,
} from "../modules/users/user.types";

/**
 * Supported data scopes.
 *
 * GLOBAL      -> All branches/data
 * BRANCH      -> Assigned branches only
 * DEPARTMENT  -> Own department only
 */
export type DataScope = UserDataScope;

/**
 * Request-level data scope context.
 */
export interface DataScopeContext {
  scope: DataScope;
  userId: string;
  branchId?: string;
  departmentId?: string;
  branchIds: string[];
  isGlobal: boolean;
  isBranchScoped: boolean;
  isDepartmentScoped: boolean;
  enforceScope: boolean;
}

/**
 * Minimal user projection required by this middleware.
 */
interface DataScopeUser {
  _id: string;
  branchId?: string;
  departmentId?: string;
  branches?: Array<{
    branchId: string;
    isPrimary?: boolean;
  }>;
  dataScope?: DataScope;
  status?: string;
  isLoginEnabled?: boolean;
  isLocked?: boolean;
}

/**
 * Express request augmentation.
 */
declare global {
  namespace Express {
    interface Request {
      dataScope?: DataScopeContext;
    }
  }
}

/**
 * Normalize unknown value to string.
 */
function normalizeString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : undefined;
}

/**
 * Normalize and validate ObjectId.
 */
function normalizeObjectId(
  value: unknown,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeString(
    String(value),
  );

  if (
    !normalized ||
    !isValidObjectId(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

/**
 * Resolve authenticated user ID.
 */
function getAuthenticatedUserId(
  request: Request,
): string | undefined {
  return normalizeObjectId(
    request.auth?.user?.id,
  );
}

/**
 * Resolve configured data scope.
 *
 * Unknown/missing values are deliberately restricted
 * to BRANCH instead of accidentally granting GLOBAL access.
 */
function resolveDataScope(
  value: unknown,
): DataScope {
  const scope = normalizeString(
    value,
  )?.toUpperCase();

  if (scope === "GLOBAL") {
    return "GLOBAL";
  }

  if (scope === "DEPARTMENT") {
    return "DEPARTMENT";
  }

  return "BRANCH";
}

/**
 * Extract all branch IDs assigned to the user.
 *
 * UserBranchAssignment does not contain isActive,
 * therefore no isActive check is performed here.
 */
function getUserBranchIds(
  user: DataScopeUser,
): string[] {
  const branchIds = new Set<string>();

  /**
   * Primary branch.
   */
  const primaryBranchId =
    normalizeObjectId(
      user.branchId,
    );

  if (primaryBranchId) {
    branchIds.add(primaryBranchId);
  }

  /**
   * Additional assigned branches.
   */
  if (Array.isArray(user.branches)) {
    for (const branch of user.branches) {
      const branchId =
        normalizeObjectId(
          branch.branchId,
        );

      if (branchId) {
        branchIds.add(branchId);
      }
    }
  }

  return Array.from(branchIds);
}

/**
 * Load latest user scope information.
 *
 * Scope is intentionally read from the database instead of
 * trusting the JWT so changes made by Admin/Manager become
 * effective without requiring a new login.
 */
async function loadDataScopeUser(
  userId: string,
): Promise<DataScopeUser | null> {
  if (!isValidObjectId(userId)) {
    return null;
  }

  return UserModel.findById(userId)
    .select(
      [
        "_id",
        "branchId",
        "departmentId",
        "branches",
        "dataScope",
        "status",
        "isLoginEnabled",
        "isLocked",
      ].join(" "),
    )
    .lean<DataScopeUser | null>();
}

/**
 * Validate current user account state.
 */
function isUserAllowed(
  user: DataScopeUser,
): boolean {
  const status = normalizeString(
    user.status,
  )?.toUpperCase();

  if (
    status &&
    status !== "ACTIVE"
  ) {
    return false;
  }

  if (user.isLoginEnabled === false) {
    return false;
  }

  if (user.isLocked === true) {
    return false;
  }

  return true;
}

/**
 * Build request data-scope context.
 */
function buildDataScopeContext(
  user: DataScopeUser,
): DataScopeContext {
  const userId =
    normalizeObjectId(user._id);

  if (!userId) {
    throw new Error(
      "Authenticated user has an invalid identifier.",
    );
  }

  const scope = resolveDataScope(
    user.dataScope,
  );

  const branchIds =
    getUserBranchIds(user);

  const branchId =
    normalizeObjectId(
      user.branchId,
    );

  const departmentId =
    normalizeObjectId(
      user.departmentId,
    );

  const isGlobal =
    scope === "GLOBAL";

  const isBranchScoped =
    scope === "BRANCH";

  const isDepartmentScoped =
    scope === "DEPARTMENT";

  return {
    scope,
    userId,
    branchId,
    departmentId,
    branchIds,
    isGlobal,
    isBranchScoped,
    isDepartmentScoped,
    enforceScope: !isGlobal,
  };
}

/**
 * Extract branch ID from request.
 *
 * Supported locations:
 * - params.branchId
 * - query.branchId
 * - body.branchId
 */
function getRequestedBranchId(
  request: Request,
): string | undefined {
  const paramsBranchId =
    normalizeObjectId(
      request.params?.branchId,
    );

  if (paramsBranchId) {
    return paramsBranchId;
  }

  const queryBranchId =
    normalizeObjectId(
      request.query?.branchId,
    );

  if (queryBranchId) {
    return queryBranchId;
  }

  const body =
    request.body as
      | Record<string, unknown>
      | undefined;

  return normalizeObjectId(
    body?.branchId,
  );
}

/**
 * Extract department ID from request.
 */
function getRequestedDepartmentId(
  request: Request,
): string | undefined {
  const paramsDepartmentId =
    normalizeObjectId(
      request.params?.departmentId,
    );

  if (paramsDepartmentId) {
    return paramsDepartmentId;
  }

  const queryDepartmentId =
    normalizeObjectId(
      request.query?.departmentId,
    );

  if (queryDepartmentId) {
    return queryDepartmentId;
  }

  const body =
    request.body as
      | Record<string, unknown>
      | undefined;

  return normalizeObjectId(
    body?.departmentId,
  );
}

/**
 * Check branch access.
 */
function canAccessBranch(
  context: DataScopeContext,
  branchId: string,
): boolean {
  if (context.isGlobal) {
    return true;
  }

  const normalizedBranchId =
    normalizeObjectId(branchId);

  if (!normalizedBranchId) {
    return false;
  }

  return context.branchIds.includes(
    normalizedBranchId,
  );
}

/**
 * Check department access.
 */
function canAccessDepartment(
  context: DataScopeContext,
  departmentId: string,
): boolean {
  if (context.isGlobal) {
    return true;
  }

  const normalizedDepartmentId =
    normalizeObjectId(departmentId);

  if (!normalizedDepartmentId) {
    return false;
  }

  if (!context.isDepartmentScoped) {
    return false;
  }

  return (
    context.departmentId ===
    normalizedDepartmentId
  );
}

/**
 * Build MongoDB filter for current user's scope.
 *
 * GLOBAL:
 * {}
 *
 * BRANCH:
 * { branchId: { $in: [...] } }
 *
 * DEPARTMENT:
 * { departmentId: "..." }
 */
export function getDataScopeFilter(
  request: Request,
): Record<string, unknown> {
  const context =
    request.dataScope;

  if (!context) {
    return {};
  }

  if (context.isGlobal) {
    return {};
  }

  if (context.isBranchScoped) {
    if (context.branchIds.length === 0) {
      return {
        branchId: {
          $in: [],
        },
      };
    }

    return {
      branchId: {
        $in: context.branchIds,
      },
    };
  }

  if (context.isDepartmentScoped) {
    if (!context.departmentId) {
      return {
        departmentId: {
          $in: [],
        },
      };
    }

    return {
      departmentId:
        context.departmentId,
    };
  }

  /**
   * Defensive deny-by-default filter.
   */
  return {
    _id: {
      $in: [],
    },
  };
}

/**
 * Merge data-scope filter into an existing Mongo filter.
 */
export function applyDataScopeFilter(
  request: Request,
  filter: Record<string, unknown> = {},
): Record<string, unknown> {
  const scopeFilter =
    getDataScopeFilter(request);

  if (
    Object.keys(scopeFilter).length === 0
  ) {
    return {
      ...filter,
    };
  }

  const existingAnd =
    Array.isArray(filter.$and)
      ? filter.$and
      : undefined;

  if (existingAnd) {
    return {
      ...filter,
      $and: [
        ...existingAnd,
        scopeFilter,
      ],
    };
  }

  return {
    ...filter,
    $and: [scopeFilter],
  };
}

/**
 * Main data-scope middleware.
 *
 * Must run after authMiddleware.
 */
export const dataScopeMiddleware: RequestHandler =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(
          request,
        );

      if (!userId) {
        response.status(401).json({
          success: false,
          message:
            "Authentication is required for data scope.",
          errors: [
            {
              code: "UNAUTHORIZED",
              message:
                "Authentication is required for data scope.",
            },
          ],
        });

        return;
      }

      const user =
        await loadDataScopeUser(
          userId,
        );

      if (!user) {
        response.status(401).json({
          success: false,
          message:
            "Authenticated user was not found.",
          errors: [
            {
              code: "USER_NOT_FOUND",
              message:
                "Authenticated user was not found.",
            },
          ],
        });

        return;
      }

      if (!isUserAllowed(user)) {
        response.status(403).json({
          success: false,
          message:
            "User account is not allowed to access this resource.",
          errors: [
            {
              code: "ACCOUNT_FORBIDDEN",
              message:
                "User account is not allowed to access this resource.",
            },
          ],
        });

        return;
      }

      request.dataScope =
        buildDataScopeContext(user);

      next();
    } catch {
      response.status(500).json({
        success: false,
        message:
          "Unable to resolve data access scope.",
        errors: [
          {
            code:
              "DATA_SCOPE_RESOLUTION_FAILED",
            message:
              "Unable to resolve data access scope.",
          },
        ],
      });
    }
  };

/**
 * Alias.
 */
export const enforceDataScope =
  dataScopeMiddleware;

/**
 * Require one of the supplied data scopes.
 */
export function requireDataScope(
  ...allowedScopes: DataScope[]
): RequestHandler {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const context =
      request.dataScope;

    if (!context) {
      response.status(403).json({
        success: false,
        message:
          "Data scope has not been initialized.",
        errors: [
          {
            code: "DATA_SCOPE_REQUIRED",
            message:
              "Data scope has not been initialized.",
          },
        ],
      });

      return;
    }

    if (
      allowedScopes.length === 0 ||
      allowedScopes.includes(
        context.scope,
      )
    ) {
      next();
      return;
    }

    response.status(403).json({
      success: false,
      message:
        "Your data access scope does not allow this operation.",
      errors: [
        {
          code: "DATA_SCOPE_FORBIDDEN",
          message:
            "Your data access scope does not allow this operation.",
        },
      ],
    });
  };
}

/**
 * Require GLOBAL data scope.
 */
export const requireGlobalDataScope: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (
      request.dataScope?.isGlobal
    ) {
      next();
      return;
    }

    response.status(403).json({
      success: false,
      message:
        "Global data access is required.",
      errors: [
        {
          code: "GLOBAL_SCOPE_REQUIRED",
          message:
            "Global data access is required.",
        },
      ],
    });
  };

/**
 * Enforce requested branch access.
 */
export const enforceRequestedBranchScope: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const context =
      request.dataScope;

    if (!context) {
      response.status(403).json({
        success: false,
        message:
          "Data scope has not been initialized.",
        errors: [
          {
            code: "DATA_SCOPE_REQUIRED",
            message:
              "Data scope has not been initialized.",
          },
        ],
      });

      return;
    }

    /**
     * GLOBAL users can access every branch.
     */
    if (context.isGlobal) {
      next();
      return;
    }

    const requestedBranchId =
      getRequestedBranchId(
        request,
      );

    /**
     * No explicit branch was requested.
     * Repository-level filtering will still apply.
     */
    if (!requestedBranchId) {
      next();
      return;
    }

    if (
      !canAccessBranch(
        context,
        requestedBranchId,
      )
    ) {
      response.status(403).json({
        success: false,
        message:
          "You do not have access to the requested branch.",
        errors: [
          {
            code:
              "BRANCH_SCOPE_FORBIDDEN",
            message:
              "You do not have access to the requested branch.",
          },
        ],
      });

      return;
    }

    next();
  };

/**
 * Enforce requested department access.
 */
export const enforceRequestedDepartmentScope: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const context =
      request.dataScope;

    if (!context) {
      response.status(403).json({
        success: false,
        message:
          "Data scope has not been initialized.",
        errors: [
          {
            code: "DATA_SCOPE_REQUIRED",
            message:
              "Data scope has not been initialized.",
          },
        ],
      });

      return;
    }

    /**
     * GLOBAL users can access every department.
     */
    if (context.isGlobal) {
      next();
      return;
    }

    const requestedDepartmentId =
      getRequestedDepartmentId(
        request,
      );

    /**
     * No explicit department requested.
     */
    if (!requestedDepartmentId) {
      next();
      return;
    }

    if (
      !canAccessDepartment(
        context,
        requestedDepartmentId,
      )
    ) {
      response.status(403).json({
        success: false,
        message:
          "You do not have access to the requested department.",
        errors: [
          {
            code:
              "DEPARTMENT_SCOPE_FORBIDDEN",
            message:
              "You do not have access to the requested department.",
          },
        ],
      });

      return;
    }

    next();
  };

/**
 * Check branch access.
 */
export function hasBranchAccess(
  request: Request,
  branchId: string,
): boolean {
  const context =
    request.dataScope;

  if (!context) {
    return false;
  }

  return canAccessBranch(
    context,
    branchId,
  );
}

/**
 * Check department access.
 */
export function hasDepartmentAccess(
  request: Request,
  departmentId: string,
): boolean {
  const context =
    request.dataScope;

  if (!context) {
    return false;
  }

  return canAccessDepartment(
    context,
    departmentId,
  );
}

/**
 * Get current data scope.
 */
export function getCurrentDataScope(
  request: Request,
): DataScope | undefined {
  return request.dataScope?.scope;
}

/**
 * Get complete data scope context.
 */
export function getDataScopeContext(
  request: Request,
): DataScopeContext | undefined {
  return request.dataScope;
}

/**
 * Get accessible branch IDs.
 */
export function getScopedBranchIds(
  request: Request,
): string[] {
  return [
    ...(request.dataScope?.branchIds ?? []),
  ];
}

/**
 * Get current department ID.
 */
export function getScopedDepartmentId(
  request: Request,
): string | undefined {
  return request.dataScope
    ?.departmentId;
}

/**
 * Check GLOBAL scope.
 */
export function hasGlobalDataScope(
  request: Request,
): boolean {
  return Boolean(
    request.dataScope?.isGlobal,
  );
}

/**
 * Check BRANCH scope.
 */
export function hasBranchDataScope(
  request: Request,
): boolean {
  return Boolean(
    request.dataScope?.isBranchScoped,
  );
}

/**
 * Check DEPARTMENT scope.
 */
export function hasDepartmentDataScope(
  request: Request,
): boolean {
  return Boolean(
    request.dataScope?.isDepartmentScoped,
  );
}

/**
 * Get scope-aware Mongo filter.
 */
export function getScopeAwareFilter(
  request: Request,
  additionalFilter: Record<string, unknown> = {},
): Record<string, unknown> {
  return applyDataScopeFilter(
    request,
    additionalFilter,
  );
}

/**
 * Check whether a UserEntity belongs to a branch.
 *
 * UserBranchAssignment contains branchId and isPrimary;
 * it does not contain isActive.
 */
export function userBelongsToBranch(
  user: Pick<
    UserEntity,
    "branchId" | "branches"
  >,
  branchId: string,
): boolean {
  const normalizedBranchId =
    normalizeObjectId(
      branchId,
    );

  if (!normalizedBranchId) {
    return false;
  }

  const primaryBranchId =
    normalizeObjectId(
      user.branchId,
    );

  if (
    primaryBranchId ===
    normalizedBranchId
  ) {
    return true;
  }

  if (
    !Array.isArray(user.branches)
  ) {
    return false;
  }

  return user.branches.some(
    (branch) =>
      normalizeObjectId(
        branch.branchId,
      ) === normalizedBranchId,
  );
}

export default dataScopeMiddleware;
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import {
  isValidObjectId,
  Types,
} from "mongoose";

import { UserModel } from "../modules/users/user.model";

/**
 * Branch access middleware
 *
 * MirexCargo mein important business records branchId ke through isolate
 * honge. Branch middleware ka kaam:
 *
 * Request
 *   ↓
 * Authentication
 *   ↓
 * Branch Middleware
 *   ↓
 * User branch access check
 *   ↓
 * request.branchContext
 *   ↓
 * Controller
 *
 * Permission/RBAC checks is middleware ka responsibility nahi hai.
 * Woh later permission/rbac middleware handle karega.
 */

export type BranchAccessScope =
  | "GLOBAL"
  | "BRANCH"
  | "DEPARTMENT";

export interface BranchContext {
  /**
   * Effective branch used by the request.
   */
  branchId?: string;

  /**
   * User's primary branch.
   */
  primaryBranchId?: string;

  /**
   * All branches assigned to the authenticated user.
   */
  accessibleBranchIds: string[];

  /**
   * User's configured data scope.
   */
  dataScope: BranchAccessScope;

  /**
   * Whether the user can access all branches.
   */
  canAccessAllBranches: boolean;
}

declare global {
  namespace Express {
    interface Request {
      branchContext?: BranchContext;
    }
  }
}

/**
 * Header used by frontend clients to explicitly select a branch.
 *
 * Example:
 *
 * x-branch-id: 66f1...
 */
const BRANCH_HEADER = "x-branch-id";

/**
 * Query parameter accepted for branch-filtered list endpoints.
 *
 * Example:
 *
 * GET /shipments?branchId=66f1...
 */
const BRANCH_QUERY_PARAMETER = "branchId";

/**
 * Route/body fields that can carry a branch identifier.
 */
const BRANCH_SOURCE_KEYS = [
  "branchId",
  "branch",
] as const;

/**
 * Normalize a string-like value.
 */
function normalizeString(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : undefined;
}

/**
 * Normalize a MongoDB ObjectId into its string representation.
 */
function normalizeObjectId(
  value: unknown,
): string | undefined {
  if (value instanceof Types.ObjectId) {
    return value.toString();
  }

  const normalized =
    normalizeString(value);

  if (
    !normalized ||
    !isValidObjectId(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

/**
 * Return a consistent unauthorized response.
 */
function sendUnauthorized(
  response: Response,
  message: string,
): void {
  response.status(401).json({
    success: false,
    message,
    errors: [
      {
        code: "UNAUTHORIZED",
        message,
      },
    ],
  });
}

/**
 * Return a consistent forbidden response.
 */
function sendForbidden(
  response: Response,
  message: string,
  code: string,
): void {
  response.status(403).json({
    success: false,
    message,
    errors: [
      {
        code,
        message,
      },
    ],
  });
}

/**
 * Return a consistent bad-request response.
 */
function sendBadRequest(
  response: Response,
  message: string,
): void {
  response.status(400).json({
    success: false,
    message,
    errors: [
      {
        code: "INVALID_BRANCH",
        message,
      },
    ],
  });
}

/**
 * Extract a branch ID from a request source.
 *
 * Priority:
 *
 * 1. x-branch-id header
 * 2. route parameter
 * 3. query parameter
 * 4. request body
 *
 * Header has highest priority because it represents the branch explicitly
 * selected by the authenticated frontend session.
 */
function getRequestedBranchId(
  request: Request,
): {
  branchId?: string;
  source?:
    | "header"
    | "params"
    | "query"
    | "body";
} {
  const headerValue =
    request.headers[
      BRANCH_HEADER
    ];

  const headerBranchId =
    Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

  const normalizedHeader =
    normalizeString(
      headerBranchId,
    );

  if (normalizedHeader) {
    return {
      branchId:
        normalizedHeader,
      source: "header",
    };
  }

  for (
    const key of BRANCH_SOURCE_KEYS
  ) {
    const paramBranchId =
      request.params?.[key];

    const normalizedParam =
      normalizeString(
        paramBranchId,
      );

    if (normalizedParam) {
      return {
        branchId:
          normalizedParam,
        source: "params",
      };
    }
  }

  const queryBranchId =
    request.query?.[
      BRANCH_QUERY_PARAMETER
    ];

  const normalizedQuery =
    normalizeString(
      Array.isArray(queryBranchId)
        ? queryBranchId[0]
        : queryBranchId,
    );

  if (normalizedQuery) {
    return {
      branchId:
        normalizedQuery,
      source: "query",
    };
  }

  if (
    request.body &&
    typeof request.body ===
      "object"
  ) {
    for (
      const key of BRANCH_SOURCE_KEYS
    ) {
      const bodyBranchId =
        request.body[key];

      const normalizedBody =
        normalizeString(
          bodyBranchId,
        );

      if (normalizedBody) {
        return {
          branchId:
            normalizedBody,
          source: "body",
        };
      }
    }
  }

  return {};
}

/**
 * Read data scope from the authenticated user.
 *
 * User data scope values are defined by the users module:
 *
 * GLOBAL
 * BRANCH
 * DEPARTMENT
 */
function resolveDataScope(
  value: unknown,
): BranchAccessScope {
  const scope =
    normalizeString(value)
      ?.toUpperCase();

  if (
    scope === "GLOBAL" ||
    scope === "DEPARTMENT"
  ) {
    return scope;
  }

  return "BRANCH";
}

/**
 * Load branch access information for the authenticated user.
 *
 * The user model stores:
 *
 * - branchId   → primary/default branch
 * - branches   → all assigned branches
 * - dataScope  → GLOBAL / BRANCH / DEPARTMENT
 *
 * We query the latest user record instead of trusting a potentially stale
 * JWT payload for branch assignments.
 */
async function loadUserBranchAccess(
  userId: string,
): Promise<{
  primaryBranchId?: string;
  accessibleBranchIds: string[];
  dataScope: BranchAccessScope;
}> {
  const user =
    await UserModel.findById(
      userId,
    )
      .select(
        "_id branchId branches dataScope status isLoginEnabled",
      )
      .lean<{
        _id: Types.ObjectId;
        branchId?: Types.ObjectId;
        branches?: Array<{
          branchId: Types.ObjectId;
          isPrimary?: boolean;
        }>;
        dataScope?: string;
        status?: string;
        isLoginEnabled?: boolean;
      } | null>();

  if (!user) {
    throw new BranchMiddlewareError(
      "Authenticated user was not found.",
      "USER_NOT_FOUND",
      401,
    );
  }

  const status =
    normalizeString(user.status)
      ?.toUpperCase();

  if (
    status &&
    status !== "ACTIVE"
  ) {
    throw new BranchMiddlewareError(
      "User account is not active.",
      "ACCOUNT_INACTIVE",
      403,
    );
  }

  if (
    user.isLoginEnabled === false
  ) {
    throw new BranchMiddlewareError(
      "User login access is disabled.",
      "LOGIN_DISABLED",
      403,
    );
  }

  const accessibleIds =
    new Set<string>();

  if (user.branchId) {
    accessibleIds.add(
      user.branchId.toString(),
    );
  }

  for (
    const branch of user.branches ?? []
  ) {
    if (branch.branchId) {
      accessibleIds.add(
        branch.branchId.toString(),
      );
    }
  }

  const primaryBranchId =
    user.branchId
      ? user.branchId.toString()
      : user.branches?.find(
          (branch) =>
            branch.isPrimary === true,
        )?.branchId?.toString();

  return {
    primaryBranchId,
    accessibleBranchIds:
      Array.from(
        accessibleIds,
      ),
    dataScope:
      resolveDataScope(
        user.dataScope,
      ),
  };
}

/**
 * Custom middleware error.
 */
export class BranchMiddlewareError
  extends Error {
  public readonly code: string;

  public readonly statusCode:
    | 400
    | 401
    | 403
    | 404;

  public readonly details?: unknown;

  public constructor(
    message: string,
    code: string,
    statusCode:
      | 400
      | 401
      | 403
      | 404 = 403,
    details?: unknown,
  ) {
    super(message);

    this.name =
      "BranchMiddlewareError";

    this.code = code;
    this.statusCode =
      statusCode;

    this.details =
      details;

    Object.setPrototypeOf(
      this,
      BranchMiddlewareError.prototype,
    );
  }
}

/**
 * Validate whether a user can access a requested branch.
 *
 * GLOBAL users can access every branch.
 * BRANCH users can access only explicitly assigned branches.
 * DEPARTMENT users are still restricted to their assigned branches here;
 * department-level filtering is handled by data-scope middleware.
 */
function canAccessBranch(
  requestedBranchId: string,
  dataScope: BranchAccessScope,
  accessibleBranchIds: string[],
): boolean {
  if (
    dataScope === "GLOBAL"
  ) {
    return true;
  }

  return accessibleBranchIds.includes(
    requestedBranchId,
  );
}

/**
 * Resolve the effective branch for the current request.
 *
 * If no branch was explicitly selected:
 *
 * - use the user's primary branch when available
 * - use undefined for GLOBAL users without a primary branch
 * - reject non-global users that have no usable branch
 */
function resolveEffectiveBranch(
  requestedBranchId: string | undefined,
  primaryBranchId: string | undefined,
  dataScope: BranchAccessScope,
  accessibleBranchIds: string[],
): string | undefined {
  if (requestedBranchId) {
    if (
      !isValidObjectId(
        requestedBranchId,
      )
    ) {
      throw new BranchMiddlewareError(
        "Invalid branch ID.",
        "INVALID_BRANCH_ID",
        400,
      );
    }

    if (
      !canAccessBranch(
        requestedBranchId,
        dataScope,
        accessibleBranchIds,
      )
    ) {
      throw new BranchMiddlewareError(
        "You do not have access to the requested branch.",
        "BRANCH_ACCESS_DENIED",
        403,
      );
    }

    return requestedBranchId;
  }

  if (primaryBranchId) {
    return primaryBranchId;
  }

  if (
    dataScope === "GLOBAL"
  ) {
    return undefined;
  }

  throw new BranchMiddlewareError(
    "No branch is assigned to the authenticated user.",
    "NO_BRANCH_ASSIGNED",
    403,
  );
}

/**
 * Create branch context and attach it to request.
 */
async function createBranchContext(
  request: Request,
): Promise<BranchContext> {
  const authenticatedUser =
    request.auth?.user;

  if (
    !authenticatedUser?.id
  ) {
    throw new BranchMiddlewareError(
      "Authentication is required before branch validation.",
      "UNAUTHORIZED",
      401,
    );
  }

  const access =
    await loadUserBranchAccess(
      authenticatedUser.id,
    );

  const requested =
    getRequestedBranchId(
      request,
    );

  const requestedBranchId =
    requested.branchId
      ? normalizeObjectId(
          requested.branchId,
        )
      : undefined;

  if (
    requested.branchId &&
    !requestedBranchId
  ) {
    throw new BranchMiddlewareError(
      "Invalid branch ID.",
      "INVALID_BRANCH_ID",
      400,
    );
  }

  const effectiveBranchId =
    resolveEffectiveBranch(
      requestedBranchId,
      access.primaryBranchId,
      access.dataScope,
      access.accessibleBranchIds,
    );

  const canAccessAllBranches =
    access.dataScope ===
    "GLOBAL";

  return {
    branchId:
      effectiveBranchId,

    primaryBranchId:
      access.primaryBranchId,

    accessibleBranchIds:
      access.accessibleBranchIds,

    dataScope:
      access.dataScope,

    canAccessAllBranches,
  };
}

/**
 * Main branch middleware.
 *
 * This should run after authMiddleware:
 *
 * app.use(authMiddleware);
 * app.use(branchMiddleware);
 */
export const branchMiddleware: RequestHandler =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (
        !request.auth?.user?.id
      ) {
        sendUnauthorized(
          response,
          "Authentication is required for branch access.",
        );
        return;
      }

      const context =
        await createBranchContext(
          request,
        );

      request.branchContext =
        context;

      /**
       * Keep the effective branch synchronized with auth context.
       *
       * This gives downstream services a consistent request-level branch
       * without modifying the immutable JWT itself.
       */
      if (
        context.branchId &&
        request.auth.user
      ) {
        const user =
          request.auth.user;

        if (!user.branchId) {
          user.branchId =
            context.branchId;
        }
      }

      next();
    } catch (error) {
      if (
        error instanceof
        BranchMiddlewareError
      ) {
        if (
          error.statusCode ===
          401
        ) {
          sendUnauthorized(
            response,
            error.message,
          );
          return;
        }

        if (
          error.statusCode ===
          400
        ) {
          sendBadRequest(
            response,
            error.message,
          );
          return;
        }

        sendForbidden(
          response,
          error.message,
          error.code,
        );
        return;
      }

      /**
       * Do not expose internal database errors to the client.
       */
      sendForbidden(
        response,
        "Unable to validate branch access.",
        "BRANCH_ACCESS_ERROR",
      );
    }
  };

/**
 * Alias for route readability.
 */
export const enforceBranchAccess =
  branchMiddleware;

/**
 * Require an explicitly selected branch.
 *
 * Useful for endpoints where operating without a branch would be unsafe.
 */
export const requireBranch: RequestHandler =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (
        !request.auth?.user?.id
      ) {
        sendUnauthorized(
          response,
          "Authentication is required for branch access.",
        );
        return;
      }

      const requested =
        getRequestedBranchId(
          request,
        );

      if (!requested.branchId) {
        sendBadRequest(
          response,
          "A branch ID is required for this operation.",
        );
        return;
      }

      const context =
        await createBranchContext(
          request,
        );

      if (!context.branchId) {
        sendForbidden(
          response,
          "A valid branch could not be resolved.",
          "BRANCH_NOT_RESOLVED",
        );
        return;
      }

      request.branchContext =
        context;

      next();
    } catch (error) {
      if (
        error instanceof
        BranchMiddlewareError
      ) {
        if (
          error.statusCode ===
          401
        ) {
          sendUnauthorized(
            response,
            error.message,
          );
          return;
        }

        if (
          error.statusCode ===
          400
        ) {
          sendBadRequest(
            response,
            error.message,
          );
          return;
        }

        sendForbidden(
          response,
          error.message,
          error.code,
        );
        return;
      }

      sendForbidden(
        response,
        "Unable to validate branch access.",
        "BRANCH_ACCESS_ERROR",
      );
    }
  };

/**
 * Return the effective branch ID for the current request.
 */
export function getRequestBranchId(
  request: Request,
): string | undefined {
  return request.branchContext
    ?.branchId;
}

/**
 * Return the primary branch ID of the authenticated user.
 */
export function getPrimaryBranchId(
  request: Request,
): string | undefined {
  return request.branchContext
    ?.primaryBranchId;
}

/**
 * Return all branch IDs accessible to the authenticated user.
 */
export function getAccessibleBranchIds(
  request: Request,
): string[] {
  return (
    request.branchContext
      ?.accessibleBranchIds ?? []
  );
}

/**
 * Return the current data scope.
 */
export function getRequestDataScope(
  request: Request,
): BranchAccessScope {
  return (
    request.branchContext
      ?.dataScope ?? "BRANCH"
  );
}

/**
 * Determine whether the request has global branch access.
 */
export function hasGlobalBranchAccess(
  request: Request,
): boolean {
  return (
    request.branchContext
      ?.canAccessAllBranches ===
    true
  );
}

/**
 * Determine whether the current request can access a specific branch.
 */
export function canAccessRequestedBranch(
  request: Request,
  branchId: string,
): boolean {
  const normalized =
    normalizeObjectId(
      branchId,
    );

  if (!normalized) {
    return false;
  }

  const context =
    request.branchContext;

  if (!context) {
    return false;
  }

  if (
    context.canAccessAllBranches
  ) {
    return true;
  }

  return context.accessibleBranchIds.includes(
    normalized,
  );
}

/**
 * Ensure a branch context exists before downstream code uses it.
 */
export function getRequiredBranchId(
  request: Request,
): string {
  const branchId =
    getRequestBranchId(
      request,
    );

  if (!branchId) {
    throw new BranchMiddlewareError(
      "A branch context is required for this operation.",
      "BRANCH_CONTEXT_REQUIRED",
      403,
    );
  }

  return branchId;
}

export default branchMiddleware;
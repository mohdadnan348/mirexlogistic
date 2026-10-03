import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

/**
 * Audit information collected during the current HTTP request.
 *
 * The middleware intentionally does not write directly to MongoDB.
 * Audit-log persistence belongs to the future audit-logs module.
 *
 * Flow:
 *
 * Request
 *   ↓
 * auditMiddleware
 *   ↓
 * Controller
 *   ↓
 * Service
 *   ↓
 * Repository
 *   ↓
 * Audit-log service
 */
export interface AuditRequestContext {
  /**
   * Whether audit logging is enabled for this request.
   */
  enabled: boolean;

  /**
   * HTTP request method.
   */
  method: string;

  /**
   * Original request URL.
   */
  url: string;

  /**
   * Normalized route path.
   */
  path: string;

  /**
   * Client IP address.
   */
  ipAddress?: string;

  /**
   * User-agent supplied by the client.
   */
  userAgent?: string;

  /**
   * Authenticated user ID.
   */
  userId?: string;

  /**
   * Branch associated with the authenticated request.
   */
  branchId?: string;

  /**
   * Request correlation ID.
   */
  requestId?: string;

  /**
   * Request start timestamp.
   */
  startedAt: Date;

  /**
   * Optional module name.
   *
   * Example:
   * "users"
   * "shipments"
   * "quotations"
   */
  module?: string;

  /**
   * Optional action name.
   *
   * Example:
   * "CREATE"
   * "UPDATE"
   * "DELETE"
   */
  action?: string;

  /**
   * Optional resource identifier.
   */
  resourceId?: string;

  /**
   * Optional metadata collected by downstream middleware/controllers.
   */
  metadata: Record<string, unknown>;
}

/**
 * Internal Express request augmentation.
 *
 * The property remains optional because the middleware may not be mounted
 * globally on every Express application instance.
 */
declare global {
  namespace Express {
    interface Request {
      audit?: AuditRequestContext;
    }
  }
}

/**
 * HTTP methods that normally represent state-changing operations.
 *
 * GET/HEAD/OPTIONS are excluded because they should not normally create
 * mutation audit records.
 */
const AUDITABLE_METHODS = new Set<string>([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/**
 * Sensitive fields that must never be copied into audit metadata.
 *
 * Audit logs should never become a secondary storage location for secrets.
 */
const SENSITIVE_FIELDS = new Set<string>([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "refreshToken",
  "refreshTokenHash",
  "accessToken",
  "token",
  "authorization",
  "otp",
  "otpCode",
  "secret",
  "clientSecret",
  "apiKey",
  "privateKey",
]);

/**
 * Convert an unknown value into a safe string.
 */
function toSafeString(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value.trim();
}

/**
 * Extract a request IP address safely.
 *
 * Express `req.ip` already handles proxy-aware configuration according
 * to the application's `trust proxy` setting.
 */
function getRequestIp(
  request: Request,
): string | undefined {
  const ip = toSafeString(request.ip);

  if (ip) {
    return ip;
  }

  const forwardedFor =
    request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    const firstIp = forwardedFor
      .split(",")[0]
      ?.trim();

    return toSafeString(firstIp);
  }

  if (Array.isArray(forwardedFor)) {
    return toSafeString(forwardedFor[0]);
  }

  return undefined;
}

/**
 * Extract authenticated user information from the request.
 *
 * The project-wide AuthContext uses:
 *
 * request.auth.user.id
 *
 * We intentionally use runtime-safe checks here so the audit middleware
 * remains independent from the authentication middleware implementation.
 */
function getAuthenticatedUserId(
  request: Request,
): string | undefined {
  const auth = request.auth;

  if (
    !auth ||
    typeof auth !== "object"
  ) {
    return undefined;
  }

  const user = auth.user;

  if (
    !user ||
    typeof user !== "object"
  ) {
    return undefined;
  }

  /**
   * AuthenticatedUser is a strongly typed domain object and does not have
   * a string index signature. The unknown bridge makes this intentional
   * runtime inspection explicit and TypeScript-safe.
   */
  const userRecord =
    user as unknown as Record<string, unknown>;

  return (
    toSafeString(userRecord.id) ??
    toSafeString(userRecord._id)
  );
}

/**
 * Extract authenticated branch information.
 *
 * Branch information can be supplied by authentication/data-scope
 * middleware. We support both common names without assuming that every
 * request has a branch context.
 */
function getAuthenticatedBranchId(
  request: Request,
): string | undefined {
  const auth = request.auth;

  if (
    !auth ||
    typeof auth !== "object"
  ) {
    return undefined;
  }

  const authRecord =
    auth as unknown as Record<
      string,
      unknown
    >;

  const directBranchId =
    toSafeString(authRecord.branchId);

  if (directBranchId) {
    return directBranchId;
  }

  const user =
    authRecord.user;

  if (
    user &&
    typeof user === "object"
  ) {
    const userRecord =
      user as unknown as Record<
        string,
        unknown
      >;

    return toSafeString(
      userRecord.branchId,
    );
  }

  return undefined;
}

/**
 * Convert a route path into a reasonable module name.
 *
 * Examples:
 *
 * /api/v1/users              → users
 * /api/v1/shipments/123     → shipments
 * /users/123/status         → users
 */
function resolveModuleName(
  request: Request,
): string | undefined {
  const routePath =
    toSafeString(request.baseUrl);

  const originalPath =
    toSafeString(request.path);

  const combined =
    `${routePath ?? ""}/${originalPath ?? ""}`
      .replace(/\/+/g, "/");

  const segments =
    combined
      .split("/")
      .filter(Boolean);

  if (segments.length === 0) {
    return undefined;
  }

  const apiIndex =
    segments.indexOf("api");

  if (
    apiIndex >= 0 &&
    segments[apiIndex + 1] === "v1" &&
    segments[apiIndex + 2]
  ) {
    return segments[apiIndex + 2];
  }

  return segments[0];
}

/**
 * Resolve an audit action from the HTTP method.
 */
function resolveAction(
  method: string,
): string | undefined {
  switch (method.toUpperCase()) {
    case "POST":
      return "CREATE";

    case "PUT":
      return "UPDATE";

    case "PATCH":
      return "UPDATE";

    case "DELETE":
      return "DELETE";

    default:
      return undefined;
  }
}

/**
 * Extract a likely resource ID from route parameters.
 *
 * We deliberately prefer explicitly named IDs.
 */
function resolveResourceId(
  request: Request,
): string | undefined {
  const preferredKeys = [
    "userId",
    "customerId",
    "contactId",
    "leadId",
    "enquiryId",
    "quotationId",
    "bookingId",
    "shipmentId",
    "taskId",
    "invoiceId",
    "paymentId",
    "vendorId",
    "branchId",
    "departmentId",
    "documentId",
    "permissionId",
    "roleId",
    "id",
  ];

  for (const key of preferredKeys) {
    const value =
      request.params[key];

    const normalized =
      toSafeString(value);

    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

/**
 * Recursively sanitize an object before it can be stored as audit metadata.
 *
 * This prevents passwords, tokens and other credentials from accidentally
 * entering the audit trail.
 */
function sanitizeAuditValue(
  value: unknown,
  depth = 0,
): unknown {
  /**
   * Prevent unexpectedly deep structures from being copied.
   */
  if (depth > 6) {
    return "[MAX_DEPTH]";
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeAuditValue(
        item,
        depth + 1,
      ),
    );
  }

  if (typeof value === "object") {
    const source =
      value as Record<
        string,
        unknown
      >;

    const sanitized: Record<
      string,
      unknown
    > = {};

    for (
      const [key, item] of Object.entries(
        source,
      )
    ) {
      const normalizedKey =
        key.toLowerCase();

      if (
        SENSITIVE_FIELDS.has(key) ||
        SENSITIVE_FIELDS.has(
          normalizedKey,
        )
      ) {
        sanitized[key] =
          "[REDACTED]";
        continue;
      }

      sanitized[key] =
        sanitizeAuditValue(
          item,
          depth + 1,
        );
    }

    return sanitized;
  }

  return String(value);
}

/**
 * Build safe request metadata.
 *
 * Request bodies are included only for auditable mutation requests and
 * sensitive fields are redacted.
 */
function buildRequestMetadata(
  request: Request,
): Record<string, unknown> {
  const metadata: Record<
    string,
    unknown
  > = {};

  if (
    AUDITABLE_METHODS.has(
      request.method.toUpperCase(),
    )
  ) {
    metadata.body =
      sanitizeAuditValue(
        request.body,
      );
  }

  const query =
    sanitizeAuditValue(
      request.query,
    );

  if (
    query &&
    typeof query === "object" &&
    Object.keys(
      query as object,
    ).length > 0
  ) {
    metadata.query = query;
  }

  return metadata;
}

/**
 * Create the audit context for the request.
 */
function createAuditContext(
  request: Request,
): AuditRequestContext {
  const method =
    request.method.toUpperCase();

  const context: AuditRequestContext = {
    enabled:
      AUDITABLE_METHODS.has(method),

    method,

    url:
      request.originalUrl ||
      request.url,

    path:
      request.path ||
      request.originalUrl ||
      request.url,

    ipAddress:
      getRequestIp(request),

    userAgent:
      toSafeString(
        request.get("user-agent"),
      ),

    userId:
      getAuthenticatedUserId(
        request,
      ),

    branchId:
      getAuthenticatedBranchId(
        request,
      ),

    requestId:
      toSafeString(
        request.get("x-request-id"),
      ),

    startedAt: new Date(),

    module:
      resolveModuleName(
        request,
      ),

    action:
      resolveAction(method),

    resourceId:
      resolveResourceId(
        request,
      ),

    metadata:
      buildRequestMetadata(
        request,
      ),
  };

  return context;
}

/**
 * Refresh dynamic audit information after downstream route middleware
 * has had an opportunity to populate request parameters/auth context.
 */
function refreshAuditContext(
  request: Request,
): void {
  const audit =
    request.audit;

  if (!audit) {
    return;
  }

  audit.userId =
    getAuthenticatedUserId(
      request,
    ) ?? audit.userId;

  audit.branchId =
    getAuthenticatedBranchId(
      request,
    ) ?? audit.branchId;

  audit.resourceId =
    resolveResourceId(
      request,
    ) ?? audit.resourceId;

  audit.module =
    resolveModuleName(
      request,
    ) ?? audit.module;

  audit.metadata =
    buildRequestMetadata(
      request,
    );
}

/**
 * Public middleware.
 *
 * It collects audit context only.
 *
 * Actual audit persistence is intentionally deferred to the audit-log
 * module/service so that middleware does not contain database logic.
 */
export const auditMiddleware: RequestHandler =
  (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void => {
    request.audit =
      createAuditContext(
        request,
      );

    /**
     * Express route parameters are not always available when an
     * application-level middleware runs, therefore the response lifecycle
     * is used to perform a final context refresh.
     *
     * Express exposes `res` as an optional property on Request typings,
     * so guard it before registering the listener.
     */
    const response = request.res;

    if (response) {
      response.once(
        "finish",
        () => {
          refreshAuditContext(
            request,
          );
        },
      );
    }

    next();
  };

/**
 * Alias with a conventional middleware name.
 */
export const audit =
  auditMiddleware;

/**
 * Disable auditing for a particular request.
 *
 * Useful for internal/system requests where creating an audit record
 * would produce unnecessary noise.
 */
export function disableAudit(
  request: Request,
): void {
  if (!request.audit) {
    request.audit =
      createAuditContext(
        request,
      );
  }

  request.audit.enabled =
    false;
}

/**
 * Enable auditing for a particular request.
 */
export function enableAudit(
  request: Request,
): void {
  if (!request.audit) {
    request.audit =
      createAuditContext(
        request,
      );
  }

  request.audit.enabled =
    true;
}

/**
 * Add or update audit metadata.
 *
 * Sensitive values are sanitized before being stored.
 */
export function addAuditMetadata(
  request: Request,
  metadata: Record<
    string,
    unknown
  >,
): void {
  if (!request.audit) {
    request.audit =
      createAuditContext(
        request,
      );
  }

  const sanitized =
    sanitizeAuditValue(
      metadata,
    );

  if (
    !sanitized ||
    typeof sanitized !== "object" ||
    Array.isArray(sanitized)
  ) {
    return;
  }

  request.audit.metadata = {
    ...request.audit.metadata,
    ...(sanitized as Record<
      string,
      unknown
    >),
  };
}

/**
 * Set explicit audit resource information.
 *
 * Controllers/services can use this when the resource ID cannot be
 * reliably determined from the URL.
 */
export function setAuditResource(
  request: Request,
  resourceId: string,
  module?: string,
  action?: string,
): void {
  if (!request.audit) {
    request.audit =
      createAuditContext(
        request,
      );
  }

  const normalizedResourceId =
    toSafeString(resourceId);

  if (normalizedResourceId) {
    request.audit.resourceId =
      normalizedResourceId;
  }

  const normalizedModule =
    toSafeString(module);

  if (normalizedModule) {
    request.audit.module =
      normalizedModule;
  }

  const normalizedAction =
    toSafeString(action);

  if (normalizedAction) {
    request.audit.action =
      normalizedAction.toUpperCase();
  }
}

/**
 * Return a safe snapshot of the current audit context.
 *
 * The returned object is detached from Express request state and is safe
 * for handing over to a future audit-log service/queue.
 */
export function getAuditContext(
  request: Request,
): AuditRequestContext | undefined {
  if (!request.audit) {
    return undefined;
  }

  refreshAuditContext(request);

  return {
    ...request.audit,
    metadata: {
      ...request.audit.metadata,
    },
  };
}

export default auditMiddleware;
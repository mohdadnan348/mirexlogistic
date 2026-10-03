import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

import rateLimit, {
  type Options,
  type RateLimitRequestHandler,
} from "express-rate-limit";

/**
 * Rate-limit configuration.
 */
interface RateLimitConfig {
  windowMs: number;
  limit: number;
  message: string;
  code: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Default API rate limit.
 *
 * 100 requests / 15 minutes / IP.
 *
 * This is intentionally kept independent from the
 * environment parser because this middleware must remain
 * usable while the project is being built file-by-file.
 */
const DEFAULT_API_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message:
    "Too many requests. Please try again later.",
  code: "RATE_LIMIT_EXCEEDED",
};

/**
 * Authentication endpoints require stricter limits
 * because they are common targets for brute-force attacks.
 */
const AUTH_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message:
    "Too many authentication attempts. Please try again later.",
  code: "AUTH_RATE_LIMIT_EXCEEDED",
};

/**
 * Password/OTP endpoints are even more restrictive.
 */
const SENSITIVE_AUTH_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message:
    "Too many security requests. Please try again later.",
  code: "SECURITY_RATE_LIMIT_EXCEEDED",
};

/**
 * Public tracking endpoints.
 */
const PUBLIC_TRACKING_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message:
    "Too many tracking requests. Please try again later.",
  code: "TRACKING_RATE_LIMIT_EXCEEDED",
};

/**
 * Normalize environment number.
 */
function getEnvironmentNumber(
  key: string,
  fallback: number,
): number {
  const value =
    process.env[key];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return fallback;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

/**
 * Get client identifier.
 *
 * express-rate-limit handles IPv4/IPv6 normalization itself,
 * so we only use the request IP for the key.
 */
function getClientKey(
  request: Request,
): string {
  const forwarded =
    request.headers[
      "x-forwarded-for"
    ];

  if (
    typeof forwarded === "string" &&
    forwarded.trim().length > 0
  ) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    request.ip ||
    request.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Determine whether a request should bypass rate limiting.
 *
 * Health checks are intentionally skipped because they may be
 * called frequently by Docker, load balancers and monitoring.
 */
function shouldSkipRequest(
  request: Request,
): boolean {
  const path =
    request.path ||
    request.originalUrl ||
    "";

  return (
    path === "/health" ||
    path === "/health/" ||
    path === "/api/health" ||
    path === "/api/health/"
  );
}

/**
 * Build standard rate-limit response.
 */
function sendRateLimitResponse(
  response: Response,
  config: RateLimitConfig,
): void {
  if (
    response.headersSent
  ) {
    return;
  }

  response.status(429).json({
    success: false,
    message:
      config.message,
    errors: [
      {
        code:
          config.code,
        message:
          config.message,
      },
    ],
    timestamp:
      new Date().toISOString(),
  });
}

/**
 * Build express-rate-limit options.
 */
function buildRateLimitOptions(
  config: RateLimitConfig,
): Partial<Options> {
  return {
    windowMs:
      config.windowMs,

    limit:
      config.limit,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    skip:
      shouldSkipRequest,

    keyGenerator:
      getClientKey,

    handler:
      (
        _request: Request,
        response: Response,
      ): void => {
        sendRateLimitResponse(
          response,
          config,
        );
      },

    skipSuccessfulRequests:
      config.skipSuccessfulRequests ??
      false,

    skipFailedRequests:
      config.skipFailedRequests ??
      false,

    requestPropertyName:
      "rateLimit",

    message:
      config.message,
  };
}

/**
 * Create reusable rate limiter.
 */
export function createRateLimiter(
  config: Partial<RateLimitConfig> = {},
): RateLimitRequestHandler {
  const mergedConfig:
    RateLimitConfig = {
    ...DEFAULT_API_CONFIG,
    ...config,
  };

  return rateLimit(
    buildRateLimitOptions(
      mergedConfig,
    ),
  );
}

/**
 * Main API rate limiter.
 */
export const apiRateLimiter =
  createRateLimiter({
    windowMs:
      getEnvironmentNumber(
        "RATE_LIMIT_WINDOW_MS",
        DEFAULT_API_CONFIG.windowMs,
      ),

    limit:
      getEnvironmentNumber(
        "RATE_LIMIT_MAX_REQUESTS",
        DEFAULT_API_CONFIG.limit,
      ),
  });

/**
 * Authentication rate limiter.
 */
export const authRateLimiter =
  createRateLimiter({
    windowMs:
      getEnvironmentNumber(
        "AUTH_RATE_LIMIT_WINDOW_MS",
        AUTH_CONFIG.windowMs,
      ),

    limit:
      getEnvironmentNumber(
        "AUTH_RATE_LIMIT_MAX_REQUESTS",
        AUTH_CONFIG.limit,
      ),

    message:
      AUTH_CONFIG.message,

    code:
      AUTH_CONFIG.code,
  });

/**
 * Password reset / OTP / security rate limiter.
 */
export const sensitiveAuthRateLimiter =
  createRateLimiter({
    windowMs:
      getEnvironmentNumber(
        "SECURITY_RATE_LIMIT_WINDOW_MS",
        SENSITIVE_AUTH_CONFIG.windowMs,
      ),

    limit:
      getEnvironmentNumber(
        "SECURITY_RATE_LIMIT_MAX_REQUESTS",
        SENSITIVE_AUTH_CONFIG.limit,
      ),

    message:
      SENSITIVE_AUTH_CONFIG.message,

    code:
      SENSITIVE_AUTH_CONFIG.code,
  });

/**
 * Public tracking rate limiter.
 */
export const publicTrackingRateLimiter =
  createRateLimiter({
    windowMs:
      getEnvironmentNumber(
        "TRACKING_RATE_LIMIT_WINDOW_MS",
        PUBLIC_TRACKING_CONFIG.windowMs,
      ),

    limit:
      getEnvironmentNumber(
        "TRACKING_RATE_LIMIT_MAX_REQUESTS",
        PUBLIC_TRACKING_CONFIG.limit,
      ),

    message:
      PUBLIC_TRACKING_CONFIG.message,

    code:
      PUBLIC_TRACKING_CONFIG.code,
  });

/**
 * Request-level rate limit helper.
 *
 * This middleware checks whether a request is already
 * authenticated and applies the standard API limiter.
 */
export const rateLimitMiddleware: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    /**
     * Health endpoints are never rate limited.
     */
    if (
      shouldSkipRequest(
        request,
      )
    ) {
      next();
      return;
    }

    apiRateLimiter(
      request,
      response,
      next,
    );
  };

/**
 * Alias.
 */
export const globalRateLimiter =
  rateLimitMiddleware;

/**
 * Apply authentication limiter.
 */
export const authRateLimitMiddleware: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    authRateLimiter(
      request,
      response,
      next,
    );
  };

/**
 * Apply sensitive authentication limiter.
 */
export const sensitiveAuthRateLimitMiddleware: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    sensitiveAuthRateLimiter(
      request,
      response,
      next,
    );
  };

/**
 * Apply public tracking limiter.
 */
export const trackingRateLimitMiddleware: RequestHandler =
  (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    publicTrackingRateLimiter(
      request,
      response,
      next,
    );
  };

/**
 * Route-level factory.
 *
 * Example:
 *
 * router.get(
 *   "/customers",
 *   createRateLimitMiddleware({
 *     limit: 50,
 *   }),
 *   controller,
 * );
 */
export function createRateLimitMiddleware(
  config: Partial<RateLimitConfig>,
): RequestHandler {
  const limiter =
    createRateLimiter(
      config,
    );

  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    limiter(
      request,
      response,
      next,
    );
  };
}

/**
 * Strict limiter for expensive operations such as
 * PDF generation, exports and large reports.
 */
export const expensiveOperationRateLimiter =
  createRateLimiter({
    windowMs:
      15 * 60 * 1000,

    limit: 20,

    message:
      "Too many expensive operations requested. Please try again later.",

    code:
      "EXPENSIVE_OPERATION_RATE_LIMIT_EXCEEDED",
  });

/**
 * Very strict limiter for OTP sending.
 */
export const otpRateLimiter =
  createRateLimiter({
    windowMs:
      10 * 60 * 1000,

    limit: 5,

    message:
      "Too many OTP requests. Please try again later.",

    code:
      "OTP_RATE_LIMIT_EXCEEDED",

    skipSuccessfulRequests:
      false,

    skipFailedRequests:
      false,
  });

/**
 * Very strict limiter for password reset.
 */
export const passwordResetRateLimiter =
  createRateLimiter({
    windowMs:
      15 * 60 * 1000,

    limit: 5,

    message:
      "Too many password reset requests. Please try again later.",

    code:
      "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
  });

/**
 * Rate-limit configuration accessors.
 *
 * These are useful for tests and application diagnostics.
 */
export function getDefaultRateLimitConfig(): RateLimitConfig {
  return {
    ...DEFAULT_API_CONFIG,
  };
}

export function getAuthRateLimitConfig(): RateLimitConfig {
  return {
    ...AUTH_CONFIG,
  };
}

export function getSensitiveAuthRateLimitConfig(): RateLimitConfig {
  return {
    ...SENSITIVE_AUTH_CONFIG,
  };
}

export function getTrackingRateLimitConfig(): RateLimitConfig {
  return {
    ...PUBLIC_TRACKING_CONFIG,
  };
}

export default rateLimitMiddleware;
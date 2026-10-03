import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import mongoose from "mongoose";
import { ZodError } from "zod";

import {
  logError,
} from "../utils/logger";

/**
 * Standard API error item.
 */
interface ApiErrorItem {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

/**
 * Standard API error response.
 */
interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiErrorItem[];
  requestId?: string;
  timestamp: string;
}

/**
 * Normalized internal error representation.
 */
interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  isOperational: boolean;
}

/**
 * Generic error shape used by the middleware.
 */
interface ErrorLike extends Error {
  statusCode?: number;
  status?: number;
  code?: string | number;
  isOperational?: boolean;
  details?: unknown;
  keyValue?: Record<string, unknown>;
  path?: string;
  value?: unknown;
}

/**
 * Convert an unknown value into an Error-like object.
 */
function toError(
  error: unknown,
): ErrorLike {
  if (
    error instanceof Error
  ) {
    return error as ErrorLike;
  }

  if (
    typeof error === "string"
  ) {
    return new Error(
      error,
    );
  }

  return new Error(
    "An unexpected error occurred.",
  );
}

/**
 * Check production environment.
 */
function isProduction(): boolean {
  return (
    process.env.NODE_ENV ===
    "production"
  );
}

/**
 * Extract request ID from request headers.
 */
function getRequestId(
  request: Request,
): string | undefined {
  const requestId =
    request.headers[
      "x-request-id"
    ];

  if (
    Array.isArray(requestId)
  ) {
    return requestId[0];
  }

  if (
    typeof requestId === "string" &&
    requestId.trim().length > 0
  ) {
    return requestId.trim();
  }

  return undefined;
}

/**
 * Sanitize sensitive values before logging
 * or exposing development details.
 */
function sanitizeLogValue(
  value: unknown,
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value !== "object"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      sanitizeLogValue,
    );
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const sanitized:
    Record<string, unknown> = {};

  const sensitiveKeys =
    new Set([
      "password",
      "passwordHash",
      "currentPassword",
      "newPassword",
      "confirmPassword",
      "accessToken",
      "refreshToken",
      "token",
      "authorization",
      "cookie",
      "set-cookie",
      "otp",
      "secret",
      "clientSecret",
      "apiKey",
      "privateKey",
    ]);

  for (
    const [key, item] of Object.entries(
      source,
    )
  ) {
    if (
      sensitiveKeys.has(
        key.toLowerCase(),
      )
    ) {
      sanitized[key] =
        "[REDACTED]";
      continue;
    }

    sanitized[key] =
      sanitizeLogValue(
        item,
      );
  }

  return sanitized;
}

/**
 * Normalize Zod validation error.
 */
function normalizeZodError(
  error: ZodError,
): NormalizedError {
  const details =
    error.issues.map(
      (issue) => ({
        code:
          issue.code,
        message:
          issue.message,
        path:
          issue.path.join("."),
      }),
    );

  return {
    statusCode: 422,
    code: "VALIDATION_ERROR",
    message:
      "Request validation failed.",
    details,
    isOperational: true,
  };
}

/**
 * Normalize Mongoose validation error.
 */
function normalizeMongooseValidationError(
  error: mongoose.Error.ValidationError,
): NormalizedError {
  const details =
    Object.values(
      error.errors,
    ).map(
      (item) => ({
        field:
          item.path,
        message:
          item.message,
        value:
          item.value,
      }),
    );

  return {
    statusCode: 422,
    code: "VALIDATION_ERROR",
    message:
      "Database validation failed.",
    details,
    isOperational: true,
  };
}

/**
 * Normalize Mongoose CastError.
 */
function normalizeMongooseCastError(
  error: mongoose.Error.CastError,
): NormalizedError {
  return {
    statusCode: 400,
    code: "INVALID_PARAMETER",
    message:
      `Invalid value for "${error.path}".`,
    details: isProduction()
      ? undefined
      : {
          path:
            error.path,
          value:
            error.value,
          kind:
            error.kind,
        },
    isOperational: true,
  };
}

/**
 * Detect MongoDB duplicate key error.
 */
function isDuplicateKeyError(
  error: ErrorLike,
): boolean {
  return (
    error.code === 11000 ||
    error.code === "11000"
  );
}

/**
 * Normalize MongoDB duplicate-key error.
 */
function normalizeDuplicateKeyError(
  error: ErrorLike,
): NormalizedError {
  const keyValue =
    error.keyValue ?? {};

  const fields =
    Object.keys(
      keyValue,
    );

  const field =
    fields.length > 0
      ? fields.join(", ")
      : "field";

  return {
    statusCode: 409,
    code: "DUPLICATE_RESOURCE",
    message:
      `A resource with the same ${field} already exists.`,
    details: isProduction()
      ? undefined
      : {
          fields,
        },
    isOperational: true,
  };
}

/**
 * Detect custom application error without importing
 * a future/non-existing utility.
 *
 * The project can throw errors containing:
 *
 * - statusCode
 * - status
 * - code
 * - isOperational
 * - details
 *
 * directly from services/controllers.
 */
function isOperationalApplicationError(
  error: ErrorLike,
): boolean {
  return (
    error.isOperational === true ||
    (
      typeof error.statusCode ===
        "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    )
  );
}

/**
 * Normalize project/application error.
 */
function normalizeApplicationError(
  error: ErrorLike,
): NormalizedError {
  const statusCode =
    typeof error.statusCode ===
    "number"
      ? error.statusCode
      : typeof error.status ===
          "number"
        ? error.status
        : 500;

  const safeStatusCode =
    statusCode >= 400 &&
    statusCode <= 599
      ? statusCode
      : 500;

  return {
    statusCode:
      safeStatusCode,
    code:
      typeof error.code ===
      "string"
        ? error.code
        : safeStatusCode >= 500
          ? "INTERNAL_SERVER_ERROR"
          : "APPLICATION_ERROR",
    message:
      error.message ||
      "An application error occurred.",
    details:
      error.details,
    isOperational:
      isOperationalApplicationError(
        error,
      ),
  };
}

/**
 * Normalize native/unknown error.
 */
function normalizeNativeError(
  error: ErrorLike,
): NormalizedError {
  return {
    statusCode:
      typeof error.statusCode ===
        "number"
        ? error.statusCode
        : typeof error.status ===
            "number"
          ? error.status
          : 500,
    code:
      typeof error.code ===
      "string"
        ? error.code
        : "INTERNAL_SERVER_ERROR",
    message:
      error.message ||
      "Internal server error.",
    details:
      error.details,
    isOperational:
      error.isOperational === true,
  };
}

/**
 * Normalize all supported errors.
 */
function normalizeError(
  rawError: unknown,
): NormalizedError {
  /**
   * Zod.
   */
  if (
    rawError instanceof ZodError
  ) {
    return normalizeZodError(
      rawError,
    );
  }

  /**
   * Mongoose validation.
   */
  if (
    rawError instanceof
    mongoose.Error.ValidationError
  ) {
    return normalizeMongooseValidationError(
      rawError,
    );
  }

  /**
   * Mongoose cast.
   */
  if (
    rawError instanceof
    mongoose.Error.CastError
  ) {
    return normalizeMongooseCastError(
      rawError,
    );
  }

  const error =
    toError(rawError);

  /**
   * Mongo duplicate key.
   */
  if (
    isDuplicateKeyError(
      error,
    )
  ) {
    return normalizeDuplicateKeyError(
      error,
    );
  }

  /**
   * Project application error.
   */
  if (
    isOperationalApplicationError(
      error,
    )
  ) {
    return normalizeApplicationError(
      error,
    );
  }

  /**
   * Unknown/native error.
   */
  return normalizeNativeError(
    error,
  );
}

/**
 * Convert normalized details into API errors.
 */
function buildApiErrors(
  normalized: NormalizedError,
): ApiErrorItem[] | undefined {
  if (
    !normalized.details
  ) {
    return undefined;
  }

  if (
    !Array.isArray(
      normalized.details,
    )
  ) {
    return undefined;
  }

  return normalized.details.map(
    (detail: unknown) => {
      if (
        typeof detail !==
          "object" ||
        detail === null
      ) {
        return {
          code:
            normalized.code,
          message:
            String(detail),
        };
      }

      const item =
        detail as Record<
          string,
          unknown
        >;

      const field =
        typeof item.path ===
        "string"
          ? item.path
          : typeof item.field ===
              "string"
            ? item.field
            : undefined;

      return {
        code:
          typeof item.code ===
          "string"
            ? item.code
            : normalized.code,
        message:
          typeof item.message ===
          "string"
            ? item.message
            : normalized.message,
        ...(field
          ? {
              field,
            }
          : {}),
        ...(!isProduction()
          ? {
              details:
                sanitizeLogValue(
                  item,
                ),
            }
          : {}),
      };
    },
  );
}

/**
 * Build standard API error response.
 */
function buildErrorResponse(
  request: Request,
  normalized: NormalizedError,
): ApiErrorResponse {
  const requestId =
    getRequestId(
      request,
    );

  const errors =
    buildApiErrors(
      normalized,
    );

  return {
    success: false,
    message:
      normalized.message,
    ...(errors &&
    errors.length > 0
      ? {
          errors,
        }
      : {}),
    ...(requestId
      ? {
          requestId,
        }
      : {}),
    timestamp:
      new Date().toISOString(),
  };
}

/**
 * Prevent internal implementation details
 * from being exposed to API clients.
 */
function getClientMessage(
  normalized: NormalizedError,
): string {
  if (
    normalized.statusCode <
    500
  ) {
    return normalized.message;
  }

  if (
    normalized.isOperational
  ) {
    return normalized.message;
  }

  return "Internal server error.";
}

/**
 * Build structured logging context.
 */
function buildLogContext(
  request: Request,
  rawError: unknown,
  normalized: NormalizedError,
): Record<string, unknown> {
  const error =
    toError(rawError);

  return {
    requestId:
      getRequestId(request),

    method:
      request.method,

    url:
      request.originalUrl ||
      request.url,

    path:
      request.path,

    statusCode:
      normalized.statusCode,

    errorCode:
      normalized.code,

    errorName:
      error.name,

    errorMessage:
      error.message,

    stack:
      error.stack,

    userId:
      request.auth?.user?.id,

    branchId:
      request.auth?.user?.branchId,

    dataScope:
      request.dataScope?.scope,

    requestBody:
      sanitizeLogValue(
        request.body,
      ),

    query:
      sanitizeLogValue(
        request.query,
      ),

    params:
      sanitizeLogValue(
        request.params,
      ),
  };
}

/**
 * Main Express error middleware.
 *
 * This middleware must be registered after all routes.
 */
export const errorMiddleware: ErrorRequestHandler =
  (
    error: unknown,
    request: Request,
    response: Response,
    _next: NextFunction,
  ): void => {
    const normalized =
      normalizeError(
        error,
      );

    /**
     * Log every handled error.
     */
    logError(
      normalized.message,
      buildLogContext(
        request,
        error,
        normalized,
      ),
    );

    /**
     * Do not attempt to send another response
     * when headers have already been sent.
     */
    if (
      response.headersSent
    ) {
      return;
    }

    const clientMessage =
      getClientMessage(
        normalized,
      );

    const clientNormalized:
      NormalizedError = {
      ...normalized,
      message:
        clientMessage,

      /**
       * Hide internal details in production.
       */
      details:
        normalized.statusCode >=
          500 &&
        isProduction()
          ? undefined
          : normalized.details,
    };

    const responseBody =
      buildErrorResponse(
        request,
        clientNormalized,
      );

    response
      .status(
        normalized.statusCode,
      )
      .json(
        responseBody,
      );
  };

/**
 * Common aliases.
 */
export const globalErrorHandler =
  errorMiddleware;

export const errorHandler =
  errorMiddleware;

export default errorMiddleware;
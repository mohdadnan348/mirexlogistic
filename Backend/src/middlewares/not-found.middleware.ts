import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

/**
 * Standard 404 response structure.
 */
interface NotFoundResponse {
  success: false;
  message: string;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  requestId?: string;
  timestamp: string;
}

/**
 * Extract request ID from headers.
 *
 * Supports the same request ID convention used by
 * error.middleware.ts.
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
 * Build the public route path.
 */
function getRequestedPath(
  request: Request,
): string {
  return (
    request.originalUrl ||
    request.url ||
    request.path ||
    "/"
  );
}

/**
 * Main 404 middleware.
 *
 * IMPORTANT:
 * This middleware must be registered AFTER all application
 * routes and BEFORE the global error middleware.
 *
 * Request flow:
 *
 * route matched
 *      ↓
 * controller
 *
 * route NOT matched
 *      ↓
 * notFoundMiddleware
 *      ↓
 * 404 JSON response
 */
export const notFoundMiddleware: RequestHandler =
  (
    request: Request,
    response: Response,
    _next: NextFunction,
  ): void => {
    /**
     * Do not attempt to write a second response.
     */
    if (
      response.headersSent
    ) {
      return;
    }

    const requestId =
      getRequestId(
        request,
      );

    const requestedPath =
      getRequestedPath(
        request,
      );

    const message =
      `Route not found: ${request.method} ${requestedPath}`;

    const responseBody:
      NotFoundResponse = {
      success: false,

      message:
        "The requested resource was not found.",

      errors: [
        {
          code: "ROUTE_NOT_FOUND",
          message,
          field:
            requestedPath,
        },
      ],

      ...(requestId
        ? {
            requestId,
          }
        : {}),

      timestamp:
        new Date().toISOString(),
    };

    response
      .status(404)
      .json(
        responseBody,
      );
  };

/**
 * Common aliases.
 */
export const routeNotFoundHandler =
  notFoundMiddleware;

export const handleNotFound =
  notFoundMiddleware;

export default notFoundMiddleware;
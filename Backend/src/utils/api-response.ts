import type { Response } from "express";

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: ApiResponseMeta;
  timestamp: string;
  requestId?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
  value?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: ApiErrorDetail[];
  };
  timestamp: string;
  requestId?: string;
}

export type ApiResponse<T = unknown> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

function getRequestId(response: Response): string | undefined {
  const requestId = response.locals.requestId;

  if (typeof requestId === "string" && requestId.length > 0) {
    return requestId;
  }

  return undefined;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  message = "Request successful",
  statusCode = 200,
  meta?: ApiResponseMeta,
): Response<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    timestamp: getTimestamp(),
  };

  if (meta) {
    body.meta = meta;
  }

  const requestId = getRequestId(response);

  if (requestId) {
    body.requestId = requestId;
  }

  return response.status(statusCode).json(body);
}

export function sendCreated<T>(
  response: Response,
  data: T,
  message = "Resource created successfully",
  meta?: ApiResponseMeta,
): Response<ApiSuccessResponse<T>> {
  return sendSuccess(response, data, message, 201, meta);
}

export function sendAccepted<T>(
  response: Response,
  data: T,
  message = "Request accepted",
  meta?: ApiResponseMeta,
): Response<ApiSuccessResponse<T>> {
  return sendSuccess(response, data, message, 202, meta);
}

export function sendNoContent(
  response: Response,
): Response<ApiSuccessResponse<null>> {
  return sendSuccess(response, null, "Request completed successfully", 200);
}

export function sendError(
  response: Response,
  message: string,
  statusCode = 500,
  code = "INTERNAL_SERVER_ERROR",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    message,
    error: {
      code,
    },
    timestamp: getTimestamp(),
  };

  if (details && details.length > 0) {
    body.error.details = details;
  }

  const requestId = getRequestId(response);

  if (requestId) {
    body.requestId = requestId;
  }

  return response.status(statusCode).json(body);
}

export function sendBadRequest(
  response: Response,
  message = "Bad request",
  code = "BAD_REQUEST",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 400, code, details);
}

export function sendUnauthorized(
  response: Response,
  message = "Authentication required",
  code = "UNAUTHORIZED",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 401, code, details);
}

export function sendForbidden(
  response: Response,
  message = "You do not have permission to perform this action",
  code = "FORBIDDEN",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 403, code, details);
}

export function sendNotFound(
  response: Response,
  message = "Resource not found",
  code = "NOT_FOUND",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 404, code, details);
}

export function sendConflict(
  response: Response,
  message = "Resource conflict",
  code = "CONFLICT",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 409, code, details);
}

export function sendUnprocessableEntity(
  response: Response,
  message = "Request could not be processed",
  code = "UNPROCESSABLE_ENTITY",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 422, code, details);
}

export function sendTooManyRequests(
  response: Response,
  message = "Too many requests",
  code = "TOO_MANY_REQUESTS",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 429, code, details);
}

export function sendInternalServerError(
  response: Response,
  message = "Internal server error",
  code = "INTERNAL_SERVER_ERROR",
  details?: ApiErrorDetail[],
): Response<ApiErrorResponse> {
  return sendError(response, message, 500, code, details);
}
import fs from "node:fs";
import path from "node:path";
import util from "node:util";

import pino, {
  type Logger,
  type LoggerOptions,
} from "pino";

import { ENV } from "../config/env";

export interface LogContext {
  requestId?: string;
  userId?: string;
  branchId?: string;
  module?: string;
  action?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface LoggerOptionsConfig {
  level?: string;
  name?: string;
}

const DEFAULT_LOG_DIRECTORY = path.resolve(
  process.cwd(),
  "logs",
);

const DEFAULT_LOG_FILE = path.join(
  DEFAULT_LOG_DIRECTORY,
  "application.log",
);

const ERROR_LOG_FILE = path.join(
  DEFAULT_LOG_DIRECTORY,
  "error.log",
);

function ensureLogDirectory(): void {
  if (!fs.existsSync(DEFAULT_LOG_DIRECTORY)) {
    fs.mkdirSync(DEFAULT_LOG_DIRECTORY, {
      recursive: true,
    });
  }
}

function getLogLevel(): string {
  const configuredLevel = String(
    ENV.LOG_LEVEL ?? "info",
  ).toLowerCase();

  const allowedLevels = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ];

  return allowedLevels.includes(
    configuredLevel,
  )
    ? configuredLevel
    : "info";
}

function createLoggerOptions(): LoggerOptions {
  const options: LoggerOptions = {
    name: ENV.APP_NAME || "mirexcargo",
    level: getLogLevel(),
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: ENV.APP_NAME || "mirexcargo",
      environment:
        ENV.NODE_ENV || "development",
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  };

  return options;
}

function createTransport():
  | ReturnType<typeof pino.transport>
  | undefined {
  ensureLogDirectory();

  if (
    ENV.NODE_ENV === "test" ||
    ENV.NODE_ENV === "development"
  ) {
    return undefined;
  }

  return pino.transport({
    targets: [
      {
        target: "pino/file",
        level: getLogLevel(),
        options: {
          destination: DEFAULT_LOG_FILE,
          mkdir: true,
          append: true,
        },
      },
      {
        target: "pino/file",
        level: "error",
        options: {
          destination: ERROR_LOG_FILE,
          mkdir: true,
          append: true,
        },
      },
    ],
  });
}

function createLogger(): Logger {
  const transport = createTransport();

  if (transport) {
    return pino(
      createLoggerOptions(),
      transport,
    );
  }

  return pino(createLoggerOptions());
}

export const logger = createLogger();

export function getLogger(): Logger {
  return logger;
}

export function childLogger(
  context: LogContext,
): Logger {
  return logger.child(context);
}

export function withContext(
  context: LogContext,
): Logger {
  return childLogger(context);
}

export function logTrace(
  message: string,
  context?: LogContext,
): void {
  if (context) {
    logger.trace(context, message);
    return;
  }

  logger.trace(message);
}

export function logDebug(
  message: string,
  context?: LogContext,
): void {
  if (context) {
    logger.debug(context, message);
    return;
  }

  logger.debug(message);
}

export function logInfo(
  message: string,
  context?: LogContext,
): void {
  if (context) {
    logger.info(context, message);
    return;
  }

  logger.info(message);
}

export function logWarn(
  message: string,
  context?: LogContext,
): void {
  if (context) {
    logger.warn(context, message);
    return;
  }

  logger.warn(message);
}

export function logError(
  message: string,
  context?: LogContext,
): void {
  if (context) {
    logger.error(context, message);
    return;
  }

  logger.error(message);
}

export function logFatal(
  message: string,
  context?: LogContext,
): void {
  if (context) {
    logger.fatal(context, message);
    return;
  }

  logger.fatal(message);
}

export function logRequest(
  context: LogContext,
): void {
  logger.info(
    {
      ...context,
      type: "http_request",
    },
    "HTTP request completed",
  );
}

export function logDatabase(
  message: string,
  context?: LogContext,
): void {
  logger.info(
    {
      ...context,
      type: "database",
    },
    message,
  );
}

export function logSecurity(
  message: string,
  context?: LogContext,
): void {
  logger.warn(
    {
      ...context,
      type: "security",
    },
    message,
  );
}

export function logAudit(
  message: string,
  context?: LogContext,
): void {
  logger.info(
    {
      ...context,
      type: "audit",
    },
    message,
  );
}

export function serializeError(
  error: unknown,
): {
  name: string;
  message: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    const result: {
      name: string;
      message: string;
      stack?: string;
      code?: string;
    } = {
      name: error.name,
      message: error.message,
    };

    if (error.stack) {
      result.stack = error.stack;
    }

    const errorWithCode = error as Error & {
      code?: unknown;
    };

    if (
      typeof errorWithCode.code === "string"
    ) {
      result.code = errorWithCode.code;
    }

    return result;
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    return {
      name: "UnknownError",
      message: util.inspect(error, {
        depth: 5,
        breakLength: Infinity,
      }),
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export function logException(
  error: unknown,
  context?: LogContext,
): void {
  const serializedError =
    serializeError(error);

  logger.error(
    {
      ...context,
      err: serializedError,
    },
    serializedError.message,
  );
}

export function getLogFiles(): {
  application: string;
  error: string;
} {
  return {
    application: DEFAULT_LOG_FILE,
    error: ERROR_LOG_FILE,
  };
}
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { z } from "zod";

/**
 * Loads a local .env file when it exists.
 *
 * Production environments normally inject environment variables directly,
 * so failure to find a local .env file is intentionally ignored.
 */
const loadLocalEnvironment = (): void => {
  const envFilePath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const content = fs.readFileSync(envFilePath, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    // Never overwrite variables already supplied by the environment.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadLocalEnvironment();

/**
 * Converts environment string values into booleans.
 */
const booleanFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") {
        return defaultValue;
      }

      const normalized = value.trim().toLowerCase();

      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }

      throw new Error(
        `Invalid boolean environment value: "${value}".`,
      );
    });

/**
 * Converts environment string values into positive integers.
 */
const positiveIntegerFromEnv = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") {
        return defaultValue;
      }

      const parsed = Number(value);

      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(
          `Environment value "${value}" must be a positive integer.`,
        );
      }

      return parsed;
    });

/**
 * Converts optional environment values into strings.
 *
 * Empty values from .env are allowed for integrations that are disabled
 * during local development.
 */
const optionalString = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? "");

/**
 * Environment schema.
 *
 * All application configuration is validated once during startup.
 * This prevents different modules from reading process.env independently.
 */
const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_NAME: z.string().trim().min(1).default("MirexCargo"),
  APP_VERSION: z.string().trim().min(1).default("1.0.0"),

  PORT: positiveIntegerFromEnv(5000),
  HOST: z.string().trim().min(1).default("0.0.0.0"),

  API_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:5000"),

  CLIENT_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:5173"),

  API_PREFIX: z
    .string()
    .trim()
    .min(1)
    .default("/api/v1"),

  DB_URL: z
    .string()
    .trim()
    .min(1)
    .default("mongodb://127.0.0.1:27017/mirexcargo"),

  DB_NAME: z
    .string()
    .trim()
    .min(1)
    .default("mirexcargo"),

  DB_MAX_POOL_SIZE: positiveIntegerFromEnv(20),
  DB_MIN_POOL_SIZE: positiveIntegerFromEnv(5),
  DB_SERVER_SELECTION_TIMEOUT_MS: positiveIntegerFromEnv(5000),
  DB_SOCKET_TIMEOUT_MS: positiveIntegerFromEnv(45000),

  REDIS_URL: z
    .string()
    .trim()
    .min(1)
    .default("redis://127.0.0.1:6379"),

  REDIS_HOST: z.string().trim().min(1).default("127.0.0.1"),
  REDIS_PORT: positiveIntegerFromEnv(6379),
  REDIS_DB: z.string().trim().default("0"),

  REDIS_USERNAME: optionalString,
  REDIS_PASSWORD: optionalString,

  JWT_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_SECRET must contain at least 32 characters."),

  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_REFRESH_SECRET must contain at least 32 characters."),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .trim()
    .min(1)
    .default("15m"),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .trim()
    .min(1)
    .default("7d"),

  COOKIE_NAME: z
    .string()
    .trim()
    .min(1)
    .default("mirexcargo_refresh_token"),

  COOKIE_DOMAIN: optionalString,
  COOKIE_SECURE: booleanFromEnv(false),
  COOKIE_HTTP_ONLY: booleanFromEnv(true),

  COOKIE_SAME_SITE: z
    .enum(["strict", "lax", "none"])
    .default("lax"),

  BCRYPT_SALT_ROUNDS: positiveIntegerFromEnv(12),

  AWS_REGION: z.string().trim().min(1).default("ap-south-1"),
  AWS_ACCESS_KEY_ID: optionalString,
  AWS_SECRET_ACCESS_KEY: optionalString,
  AWS_S3_BUCKET: optionalString,
  AWS_S3_ENDPOINT: optionalString,
  AWS_S3_PUBLIC_URL: optionalString,

  MAX_FILE_SIZE_MB: positiveIntegerFromEnv(25),
  MAX_FILES_PER_REQUEST: positiveIntegerFromEnv(10),

  UPLOAD_DIR: z
    .string()
    .trim()
    .min(1)
    .default("uploads"),

  ALLOWED_FILE_EXTENSIONS: z
    .string()
    .trim()
    .default("pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,csv"),

  SMTP_HOST: optionalString,
  SMTP_PORT: positiveIntegerFromEnv(587),
  SMTP_SECURE: booleanFromEnv(false),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM_NAME: z
    .string()
    .trim()
    .min(1)
    .default("MirexCargo"),
  SMTP_FROM_EMAIL: optionalString,

  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_PHONE_NUMBER: optionalString,

  WHATSAPP_API_URL: z
    .string()
    .trim()
    .url()
    .default("https://graph.facebook.com"),

  WHATSAPP_API_VERSION: z
    .string()
    .trim()
    .min(1)
    .default("v21.0"),

  WHATSAPP_ACCESS_TOKEN: optionalString,
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_BUSINESS_ACCOUNT_ID: optionalString,

  SOCKET_CORS_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:5173"),

  BULLMQ_PREFIX: z
    .string()
    .trim()
    .min(1)
    .default("mirexcargo"),

  BULLMQ_EMAIL_QUEUE: z
    .string()
    .trim()
    .min(1)
    .default("email"),

  BULLMQ_NOTIFICATION_QUEUE: z
    .string()
    .trim()
    .min(1)
    .default("notification"),

  BULLMQ_DOCUMENT_QUEUE: z
    .string()
    .trim()
    .min(1)
    .default("document"),

  BULLMQ_REPORT_QUEUE: z
    .string()
    .trim()
    .min(1)
    .default("report"),

  RATE_LIMIT_WINDOW_MS: positiveIntegerFromEnv(900000),
  RATE_LIMIT_MAX_REQUESTS: positiveIntegerFromEnv(300),

  AUTH_RATE_LIMIT_WINDOW_MS: positiveIntegerFromEnv(900000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: positiveIntegerFromEnv(20),

  CORS_ORIGIN: z
    .string()
    .trim()
    .min(1)
    .default("http://localhost:5173"),

  TRUST_PROXY: booleanFromEnv(false),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  LOG_DIR: z
    .string()
    .trim()
    .min(1)
    .default("logs"),

  PUPPETEER_HEADLESS: booleanFromEnv(true),

  APP_TIMEZONE: z
    .string()
    .trim()
    .min(1)
    .default("Asia/Kolkata"),

  DEFAULT_PAGE_SIZE: positiveIntegerFromEnv(20),
  MAX_PAGE_SIZE: positiveIntegerFromEnv(100),

  PUBLIC_TRACKING_URL: z
    .string()
    .trim()
    .url()
    .default("http://localhost:5173/track"),

  TRACKING_TOKEN_EXPIRES_IN: z
    .string()
    .trim()
    .min(1)
    .default("30d"),

  ENABLE_SOCKET: booleanFromEnv(true),
  ENABLE_REDIS: booleanFromEnv(true),
  ENABLE_EMAIL: booleanFromEnv(true),
  ENABLE_SMS: booleanFromEnv(false),
  ENABLE_WHATSAPP: booleanFromEnv(false),
  ENABLE_S3: booleanFromEnv(false),
  ENABLE_PDF: booleanFromEnv(true),

  HEALTH_CHECK_ENABLED: booleanFromEnv(true),

  HEALTH_CHECK_PATH: z
    .string()
    .trim()
    .min(1)
    .default("/health"),

  SHUTDOWN_TIMEOUT_MS: positiveIntegerFromEnv(10000),
});

/**
 * Raw environment object.
 *
 * Keeping this explicit makes the configuration contract easy to audit
 * and prevents accidental access to undeclared environment variables.
 */
const rawEnvironment = {
  NODE_ENV: process.env.NODE_ENV,

  APP_NAME: process.env.APP_NAME,
  APP_VERSION: process.env.APP_VERSION,

  PORT: process.env.PORT,
  HOST: process.env.HOST,

  API_URL: process.env.API_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  API_PREFIX: process.env.API_PREFIX,

  DB_URL: process.env.DB_URL,
  DB_NAME: process.env.DB_NAME,

  DB_MAX_POOL_SIZE: process.env.DB_MAX_POOL_SIZE,
  DB_MIN_POOL_SIZE: process.env.DB_MIN_POOL_SIZE,
  DB_SERVER_SELECTION_TIMEOUT_MS:
    process.env.DB_SERVER_SELECTION_TIMEOUT_MS,
  DB_SOCKET_TIMEOUT_MS: process.env.DB_SOCKET_TIMEOUT_MS,

  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_DB: process.env.REDIS_DB,
  REDIS_USERNAME: process.env.REDIS_USERNAME,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

  COOKIE_NAME: process.env.COOKIE_NAME,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_HTTP_ONLY: process.env.COOKIE_HTTP_ONLY,
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,

  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,

  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT,
  AWS_S3_PUBLIC_URL: process.env.AWS_S3_PUBLIC_URL,

  MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB,
  MAX_FILES_PER_REQUEST: process.env.MAX_FILES_PER_REQUEST,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  ALLOWED_FILE_EXTENSIONS: process.env.ALLOWED_FILE_EXTENSIONS,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID:
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,

  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN,

  BULLMQ_PREFIX: process.env.BULLMQ_PREFIX,
  BULLMQ_EMAIL_QUEUE: process.env.BULLMQ_EMAIL_QUEUE,
  BULLMQ_NOTIFICATION_QUEUE: process.env.BULLMQ_NOTIFICATION_QUEUE,
  BULLMQ_DOCUMENT_QUEUE: process.env.BULLMQ_DOCUMENT_QUEUE,
  BULLMQ_REPORT_QUEUE: process.env.BULLMQ_REPORT_QUEUE,

  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,

  AUTH_RATE_LIMIT_WINDOW_MS:
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX_REQUESTS:
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,

  CORS_ORIGIN: process.env.CORS_ORIGIN,
  TRUST_PROXY: process.env.TRUST_PROXY,

  LOG_LEVEL: process.env.LOG_LEVEL,
  LOG_DIR: process.env.LOG_DIR,

  PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS,

  APP_TIMEZONE: process.env.APP_TIMEZONE,

  DEFAULT_PAGE_SIZE: process.env.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: process.env.MAX_PAGE_SIZE,

  PUBLIC_TRACKING_URL: process.env.PUBLIC_TRACKING_URL,
  TRACKING_TOKEN_EXPIRES_IN:
    process.env.TRACKING_TOKEN_EXPIRES_IN,

  ENABLE_SOCKET: process.env.ENABLE_SOCKET,
  ENABLE_REDIS: process.env.ENABLE_REDIS,
  ENABLE_EMAIL: process.env.ENABLE_EMAIL,
  ENABLE_SMS: process.env.ENABLE_SMS,
  ENABLE_WHATSAPP: process.env.ENABLE_WHATSAPP,
  ENABLE_S3: process.env.ENABLE_S3,
  ENABLE_PDF: process.env.ENABLE_PDF,

  HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED,
  HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH,

  SHUTDOWN_TIMEOUT_MS: process.env.SHUTDOWN_TIMEOUT_MS,
};

/**
 * Validate and freeze application configuration.
 *
 * The application fails fast if a required environment value is invalid.
 */
const parsedEnvironment = environmentSchema.safeParse(rawEnvironment);

if (!parsedEnvironment.success) {
  const formattedErrors = parsedEnvironment.error.issues
    .map(
      (issue) =>
        `${issue.path.join(".") || "environment"}: ${issue.message}`,
    )
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${formattedErrors}`,
  );
}

/**
 * Central application environment.
 *
 * All backend configuration files should consume this object instead
 * of reading process.env directly.
 */
export const ENV = Object.freeze(parsedEnvironment.data);

/**
 * Backward-compatible aliases for commonly consumed configuration.
 */
export const env = ENV;

/**
 * Returns a safe configuration snapshot for diagnostics.
 *
 * Secrets and credentials are deliberately excluded.
 */
export const getSafeEnvironment = (): Record<string, unknown> => ({
  NODE_ENV: ENV.NODE_ENV,
  APP_NAME: ENV.APP_NAME,
  APP_VERSION: ENV.APP_VERSION,
  PORT: ENV.PORT,
  HOST: ENV.HOST,
  API_URL: ENV.API_URL,
  CLIENT_URL: ENV.CLIENT_URL,
  API_PREFIX: ENV.API_PREFIX,

  DB_NAME: ENV.DB_NAME,
  DB_MAX_POOL_SIZE: ENV.DB_MAX_POOL_SIZE,
  DB_MIN_POOL_SIZE: ENV.DB_MIN_POOL_SIZE,

  REDIS_HOST: ENV.REDIS_HOST,
  REDIS_PORT: ENV.REDIS_PORT,
  REDIS_DB: ENV.REDIS_DB,

  AWS_REGION: ENV.AWS_REGION,

  MAX_FILE_SIZE_MB: ENV.MAX_FILE_SIZE_MB,
  MAX_FILES_PER_REQUEST: ENV.MAX_FILES_PER_REQUEST,

  SMTP_HOST: ENV.SMTP_HOST,
  SMTP_PORT: ENV.SMTP_PORT,
  SMTP_SECURE: ENV.SMTP_SECURE,

  SOCKET_CORS_ORIGIN: ENV.SOCKET_CORS_ORIGIN,

  LOG_LEVEL: ENV.LOG_LEVEL,
  LOG_DIR: ENV.LOG_DIR,

  APP_TIMEZONE: ENV.APP_TIMEZONE,

  DEFAULT_PAGE_SIZE: ENV.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: ENV.MAX_PAGE_SIZE,

  ENABLE_SOCKET: ENV.ENABLE_SOCKET,
  ENABLE_REDIS: ENV.ENABLE_REDIS,
  ENABLE_EMAIL: ENV.ENABLE_EMAIL,
  ENABLE_SMS: ENV.ENABLE_SMS,
  ENABLE_WHATSAPP: ENV.ENABLE_WHATSAPP,
  ENABLE_S3: ENV.ENABLE_S3,
  ENABLE_PDF: ENV.ENABLE_PDF,

  HEALTH_CHECK_ENABLED: ENV.HEALTH_CHECK_ENABLED,
  HEALTH_CHECK_PATH: ENV.HEALTH_CHECK_PATH,
});
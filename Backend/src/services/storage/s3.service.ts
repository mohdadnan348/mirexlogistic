import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "../../config/s3";
import { ENV } from "../../config/env";
import {
  generateUniqueFileName,
  sanitizeFileName,
} from "../../utils/file";
import { logError, logInfo } from "../../utils/logger";

export interface UploadFileInput {
  buffer: Buffer;
  originalName: string;
  contentType: string;
  folder?: string;
  fileName?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
}

export interface UploadFileResult {
  key: string;
  bucket: string;
  region: string;
  url: string;
  originalName: string;
  fileName: string;
  contentType: string;
  size: number;
  etag?: string;
}

export interface DeleteFileInput {
  key: string;
  bucket?: string;
}

export interface FileExistsResult {
  exists: boolean;
  key: string;
  size?: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

export interface DownloadFileResult {
  key: string;
  bucket: string;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  body: Uint8Array;
}

export interface GetSignedUrlOptions {
  key: string;
  expiresIn?: number;
  bucket?: string;
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface S3ServiceStatus {
  configured: boolean;
  bucket: string;
  region: string;
  endpoint?: string;
}

const DEFAULT_SIGNED_URL_EXPIRY = 900;
const MAX_SIGNED_URL_EXPIRY = 86400;

function getBucket(bucket?: string): string {
  const resolvedBucket = bucket ?? ENV.AWS_S3_BUCKET;

  if (!resolvedBucket) {
    throw new Error("AWS S3 bucket is not configured");
  }

  return resolvedBucket;
}

function getRegion(): string {
  return ENV.AWS_REGION;
}

function normalizeFolder(folder?: string): string {
  if (!folder) {
    return "";
  }

  return folder
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(Boolean)
    .join("/");
}

function normalizeKey(key: string): string {
  return key
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

function buildObjectKey(
  originalName: string,
  folder?: string,
  explicitFileName?: string,
): string {
  const normalizedFolder = normalizeFolder(folder);

  const fileName = explicitFileName
    ? sanitizeFileName(explicitFileName)
    : generateUniqueFileName(originalName);

  const normalizedFileName = normalizeKey(fileName);

  if (!normalizedFileName) {
    throw new Error("A valid S3 object key could not be generated");
  }

  return normalizedFolder
    ? `${normalizedFolder}/${normalizedFileName}`
    : normalizedFileName;
}

function buildObjectUrl(
  bucket: string,
  key: string,
  region: string,
): string {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (region === "us-east-1") {
    return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

function normalizeSignedUrlExpiry(expiresIn?: number): number {
  const value = expiresIn ?? DEFAULT_SIGNED_URL_EXPIRY;

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_SIGNED_URL_EXPIRY;
  }

  return Math.min(Math.floor(value), MAX_SIGNED_URL_EXPIRY);
}

function encodeMetadata(
  metadata?: Record<string, string>,
): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata).filter(
    ([key, value]) =>
      key.trim().length > 0 && value.trim().length > 0,
  );

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      encodeURIComponent(value),
    ]),
  );
}

function decodeMetadata(
  metadata?: Record<string, string>,
): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      try {
        return [key, decodeURIComponent(value)];
      } catch {
        return [key, value];
      }
    }),
  );
}

async function getHeadObject(
  key: string,
  bucket?: string,
) {
  const client = getS3Client();
  const resolvedBucket = getBucket(bucket);
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    throw new Error("S3 object key is required");
  }

  return client.send(
    new HeadObjectCommand({
      Bucket: resolvedBucket,
      Key: normalizedKey,
    }),
  );
}

export async function uploadFile(
  input: UploadFileInput,
): Promise<UploadFileResult> {
  if (!Buffer.isBuffer(input.buffer)) {
    throw new TypeError("File buffer must be a Buffer");
  }

  if (input.buffer.length === 0) {
    throw new Error("Cannot upload an empty file");
  }

  if (!input.originalName.trim()) {
    throw new Error("Original file name is required");
  }

  if (!input.contentType.trim()) {
    throw new Error("Content type is required");
  }

  const client = getS3Client();
  const bucket = getBucket();
  const region = getRegion();

  const key = buildObjectKey(
    input.originalName,
    input.folder,
    input.fileName,
  );

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: input.buffer,
    ContentType: input.contentType,
    ContentLength: input.buffer.length,
    CacheControl: input.cacheControl,
    ContentDisposition: input.contentDisposition,
    Metadata: encodeMetadata(input.metadata),
  });

  try {
    const response = await client.send(command);

    const result: UploadFileResult = {
      key,
      bucket,
      region,
      url: buildObjectUrl(bucket, key, region),
      originalName: input.originalName,
      fileName: key.split("/").pop() ?? key,
      contentType: input.contentType,
      size: input.buffer.length,
      etag: response.ETag?.replace(/^"|"$/g, ""),
    };

    logInfo("File uploaded to S3", {
      bucket,
      key,
      size: input.buffer.length,
      contentType: input.contentType,
    });

    return result;
  } catch (error) {
    logError("Failed to upload file to S3", {
      error: error instanceof Error ? error.message : String(error),
      bucket,
      key,
      contentType: input.contentType,
    });

    throw error;
  }
}

export async function uploadBuffer(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder?: string,
): Promise<UploadFileResult> {
  return uploadFile({
    buffer,
    originalName,
    contentType,
    folder,
  });
}

export async function uploadBase64File(
  base64: string,
  originalName: string,
  contentType: string,
  folder?: string,
): Promise<UploadFileResult> {
  const normalizedBase64 = base64
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s/g, "");

  if (!normalizedBase64) {
    throw new Error("Base64 file content is required");
  }

  const buffer = Buffer.from(normalizedBase64, "base64");

  if (buffer.length === 0) {
    throw new Error("Decoded base64 file is empty");
  }

  return uploadFile({
    buffer,
    originalName,
    contentType,
    folder,
  });
}

export async function downloadFile(
  key: string,
  bucket?: string,
): Promise<DownloadFileResult> {
  const client = getS3Client();
  const resolvedBucket = getBucket(bucket);
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    throw new Error("S3 object key is required");
  }

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: resolvedBucket,
        Key: normalizedKey,
      }),
    );

    if (!response.Body) {
      throw new Error("S3 object has no response body");
    }

    const body = await response.Body.transformToByteArray();

    return {
      key: normalizedKey,
      bucket: resolvedBucket,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag?.replace(/^"|"$/g, ""),
      lastModified: response.LastModified,
      body,
    };
  } catch (error) {
    logError("Failed to download file from S3", {
      error: error instanceof Error ? error.message : String(error),
      bucket: resolvedBucket,
      key: normalizedKey,
    });

    throw error;
  }
}

export async function deleteFile(
  input: DeleteFileInput,
): Promise<void> {
  const client = getS3Client();
  const bucket = getBucket(input.bucket);
  const key = normalizeKey(input.key);

  if (!key) {
    throw new Error("S3 object key is required");
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    logInfo("File deleted from S3", {
      bucket,
      key,
    });
  } catch (error) {
    logError("Failed to delete file from S3", {
      error: error instanceof Error ? error.message : String(error),
      bucket,
      key,
    });

    throw error;
  }
}

export async function deleteFileByKey(
  key: string,
  bucket?: string,
): Promise<void> {
  return deleteFile({
    key,
    bucket,
  });
}

export async function fileExists(
  key: string,
  bucket?: string,
): Promise<FileExistsResult> {
  const resolvedBucket = getBucket(bucket);
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    return {
      exists: false,
      key: normalizedKey,
    };
  }

  try {
    const response = await getHeadObject(
      normalizedKey,
      resolvedBucket,
    );

    return {
      exists: true,
      key: normalizedKey,
      size: response.ContentLength,
      contentType: response.ContentType,
      etag: response.ETag?.replace(/^"|"$/g, ""),
      lastModified: response.LastModified,
    };
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof (
        error as {
          $metadata?: {
            httpStatusCode?: unknown;
          };
        }
      ).$metadata?.httpStatusCode === "number"
        ? (
            error as {
              $metadata: {
                httpStatusCode: number;
              };
            }
          ).$metadata.httpStatusCode
        : undefined;

    if (statusCode === 404) {
      return {
        exists: false,
        key: normalizedKey,
      };
    }

    throw error;
  }
}

export async function getFileMetadata(
  key: string,
  bucket?: string,
): Promise<FileExistsResult> {
  const resolvedBucket = getBucket(bucket);
  const normalizedKey = normalizeKey(key);

  const response = await getHeadObject(
    normalizedKey,
    resolvedBucket,
  );

  return {
    exists: true,
    key: normalizedKey,
    size: response.ContentLength,
    contentType: response.ContentType,
    etag: response.ETag?.replace(/^"|"$/g, ""),
    lastModified: response.LastModified,
  };
}

export async function createSignedDownloadUrl(
  options: GetSignedUrlOptions,
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket(options.bucket);
  const key = normalizeKey(options.key);

  if (!key) {
    throw new Error("S3 object key is required");
  }

  const expiresIn = normalizeSignedUrlExpiry(
    options.expiresIn,
  );

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: options.responseContentType,
    ResponseContentDisposition:
      options.responseContentDisposition,
  });

  return getSignedUrl(client, command, {
    expiresIn,
  });
}

export async function createSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = DEFAULT_SIGNED_URL_EXPIRY,
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    throw new Error("S3 object key is required");
  }

  if (!contentType.trim()) {
    throw new Error("Content type is required");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: normalizeSignedUrlExpiry(expiresIn),
  });
}

export async function getFileUrl(
  key: string,
  bucket?: string,
): Promise<string> {
  const resolvedBucket = getBucket(bucket);
  const normalizedKey = normalizeKey(key);

  if (!normalizedKey) {
    throw new Error("S3 object key is required");
  }

  return buildObjectUrl(
    resolvedBucket,
    normalizedKey,
    getRegion(),
  );
}

export async function getS3FileInfo(
  key: string,
  bucket?: string,
): Promise<{
  key: string;
  bucket: string;
  url: string;
  metadata?: Record<string, string>;
  size?: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}> {
  const resolvedBucket = getBucket(bucket);
  const normalizedKey = normalizeKey(key);

  const response = await getHeadObject(
    normalizedKey,
    resolvedBucket,
  );

  return {
    key: normalizedKey,
    bucket: resolvedBucket,
    url: buildObjectUrl(
      resolvedBucket,
      normalizedKey,
      getRegion(),
    ),
    metadata: decodeMetadata(response.Metadata),
    size: response.ContentLength,
    contentType: response.ContentType,
    etag: response.ETag?.replace(/^"|"$/g, ""),
    lastModified: response.LastModified,
  };
}

export function getS3ServiceStatus(): S3ServiceStatus {
  return {
    configured: Boolean(
      ENV.AWS_S3_BUCKET && ENV.AWS_REGION,
    ),
    bucket: ENV.AWS_S3_BUCKET,
    region: ENV.AWS_REGION,
    endpoint: ENV.AWS_S3_ENDPOINT || undefined,
  };
}

export async function checkS3Connection(): Promise<boolean> {
  const status = getS3ServiceStatus();

  if (!status.configured) {
    return false;
  }

  try {
    await getHeadObject(
      "__mirexcargo_health_check__",
      status.bucket,
    );

    return true;
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof (
        error as {
          $metadata?: {
            httpStatusCode?: unknown;
          };
        }
      ).$metadata?.httpStatusCode === "number"
        ? (
            error as {
              $metadata: {
                httpStatusCode: number;
              };
            }
          ).$metadata.httpStatusCode
        : undefined;

    if (statusCode === 404) {
      return true;
    }

    return false;
  }
}
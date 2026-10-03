import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  DeleteObjectCommandInput,
  GetObjectCommandInput,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

import { ENV } from "./env";

let s3Client: S3Client | null = null;

export interface S3UploadOptions {
  key: string;
  body: PutObjectCommandInput["Body"];
  contentType?: string;
  contentLength?: number;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  acl?: PutObjectCommandInput["ACL"];
}

export interface S3DeleteOptions {
  key: string;
}

export interface S3DownloadOptions {
  key: string;
  versionId?: string;
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: ENV.AWS_REGION,
      credentials: {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
      },
      
    });
  }

  return s3Client;
}

function getBucketName(): string {
  return ENV.AWS_S3_BUCKET;
}

export function buildS3ObjectKey(
  folder: string,
  filename: string,
): string {
  const normalizedFolder = folder
    .trim()
    .replace(/^\/+|\/+$/g, "");

  const normalizedFilename = filename
    .trim()
    .replace(/^\/+/g, "");

  if (!normalizedFilename) {
    throw new Error("S3 object filename is required.");
  }

  if (!normalizedFolder) {
    return normalizedFilename;
  }

  return `${normalizedFolder}/${normalizedFilename}`;
}

export function buildS3ObjectUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/g, "");

  if (ENV.AWS_S3_PUBLIC_URL) {
    return `${ENV.AWS_S3_PUBLIC_URL.replace(/\/+$/g, "")}/${normalizedKey}`;
  }

  return `https://${getBucketName()}.s3.${ENV.AWS_REGION}.amazonaws.com/${normalizedKey}`;
}

export async function uploadToS3(
  options: S3UploadOptions,
): Promise<{
  key: string;
  bucket: string;
  url: string;
  etag?: string;
}> {
  const input: PutObjectCommandInput = {
    Bucket: getBucketName(),
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    ContentLength: options.contentLength,
    CacheControl: options.cacheControl,
    ContentDisposition: options.contentDisposition,
    Metadata: options.metadata,
    ACL: options.acl,
  };

  const response = await getS3Client().send(
    new PutObjectCommand(input),
  );

  return {
    key: options.key,
    bucket: getBucketName(),
    url: buildS3ObjectUrl(options.key),
    etag: response.ETag,
  };
}

export async function deleteFromS3(
  options: S3DeleteOptions,
): Promise<void> {
  const input: DeleteObjectCommandInput = {
    Bucket: getBucketName(),
    Key: options.key,
  };

  await getS3Client().send(new DeleteObjectCommand(input));
}

export async function getS3Object(
  options: S3DownloadOptions,
) {
  const input: GetObjectCommandInput = {
    Bucket: getBucketName(),
    Key: options.key,
    VersionId: options.versionId,
  };

  return getS3Client().send(new GetObjectCommand(input));
}

export async function checkS3BucketConnection(): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadBucketCommand({
        Bucket: getBucketName(),
      }),
    );

    return true;
  } catch {
    return false;
  }
}

export function isS3Configured(): boolean {
  return Boolean(
    ENV.AWS_REGION &&
      ENV.AWS_ACCESS_KEY_ID &&
      ENV.AWS_SECRET_ACCESS_KEY &&
      ENV.AWS_S3_BUCKET,
  );
}

export function closeS3Client(): void {
  if (!s3Client) {
    return;
  }

  s3Client.destroy();
  s3Client = null;
}
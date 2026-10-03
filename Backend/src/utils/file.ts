import path from "node:path";
import crypto from "node:crypto";

export interface FileValidationOptions {
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  maxSizeBytes?: number;
  minSizeBytes?: number;
}

export interface FileMetadata {
  originalName: string;
  fileName: string;
  extension: string;
  mimeType: string;
  size: number;
  sizeInKB: number;
  sizeInMB: number;
  checksum: string;
}

export interface FileNameOptions {
  prefix?: string;
  extension?: string;
  includeTimestamp?: boolean;
  includeRandomId?: boolean;
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MIN_FILE_SIZE = 1;

const MIME_EXTENSION_MAP: Readonly<Record<string, string>> =
  Object.freeze({
    "application/pdf": ".pdf",

    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",

    "text/plain": ".txt",
    "text/csv": ".csv",

    "application/json": ".json",
    "application/xml": ".xml",

    "application/zip": ".zip",
    "application/x-rar-compressed": ".rar",

    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",

    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
  });

const EXTENSION_MIME_MAP: Readonly<Record<string, string>> =
  Object.freeze({
    ".pdf": "application/pdf",

    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",

    ".txt": "text/plain",
    ".csv": "text/csv",

    ".json": "application/json",
    ".xml": "application/xml",

    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",

    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

function normalizeExtension(extension: string): string {
  const normalized = extension.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  return normalized.startsWith(".")
    ? normalized
    : `.${normalized}`;
}

function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 150);
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function getFileNameWithoutExtension(
  fileName: string,
): string {
  return path.basename(
    fileName,
    path.extname(fileName),
  );
}

export function getFileMimeTypeFromExtension(
  extension: string,
): string | undefined {
  return EXTENSION_MIME_MAP[
    normalizeExtension(extension)
  ];
}

export function getFileExtensionFromMimeType(
  mimeType: string,
): string | undefined {
  return MIME_EXTENSION_MAP[mimeType.trim().toLowerCase()];
}

export function isAllowedMimeType(
  mimeType: string,
  allowedMimeTypes: readonly string[],
): boolean {
  const normalizedMimeType = mimeType
    .trim()
    .toLowerCase();

  return allowedMimeTypes.some(
    (allowedType) =>
      allowedType.trim().toLowerCase() ===
      normalizedMimeType,
  );
}

export function isAllowedExtension(
  fileName: string,
  allowedExtensions: readonly string[],
): boolean {
  const extension = getFileExtension(fileName);

  return allowedExtensions.some(
    (allowedExtension) =>
      normalizeExtension(allowedExtension) === extension,
  );
}

export function validateFile(
  file: {
    originalname: string;
    mimetype: string;
    size: number;
  },
  options: FileValidationOptions = {},
): void {
  const {
    allowedMimeTypes,
    allowedExtensions,
    maxSizeBytes = DEFAULT_MAX_FILE_SIZE,
    minSizeBytes = DEFAULT_MIN_FILE_SIZE,
  } = options;

  if (!file.originalname?.trim()) {
    throw new Error("File name is required");
  }

  if (!file.mimetype?.trim()) {
    throw new Error("File MIME type is required");
  }

  if (!Number.isFinite(file.size) || file.size < 0) {
    throw new Error("Invalid file size");
  }

  if (file.size < minSizeBytes) {
    throw new Error(
      `File size must be at least ${formatFileSize(minSizeBytes)}`,
    );
  }

  if (file.size > maxSizeBytes) {
    throw new Error(
      `File size must not exceed ${formatFileSize(maxSizeBytes)}`,
    );
  }

  if (
    allowedMimeTypes &&
    allowedMimeTypes.length > 0 &&
    !isAllowedMimeType(file.mimetype, allowedMimeTypes)
  ) {
    throw new Error(
      `File type "${file.mimetype}" is not allowed`,
    );
  }

  if (
    allowedExtensions &&
    allowedExtensions.length > 0 &&
    !isAllowedExtension(
      file.originalname,
      allowedExtensions,
    )
  ) {
    throw new Error(
      `File extension "${getFileExtension(file.originalname)}" is not allowed`,
    );
  }
}

export function generateFileName(
  originalName: string,
  options: FileNameOptions = {},
): string {
  const originalExtension = getFileExtension(originalName);

  const extension = normalizeExtension(
    options.extension ?? originalExtension,
  );

  const baseName = sanitizeFileNamePart(
    getFileNameWithoutExtension(originalName),
  );

  const parts: string[] = [];

  if (options.prefix) {
    parts.push(sanitizeFileNamePart(options.prefix));
  }

  if (baseName) {
    parts.push(baseName);
  }

  if (options.includeTimestamp !== false) {
    parts.push(String(Date.now()));
  }

  if (options.includeRandomId !== false) {
    parts.push(crypto.randomBytes(8).toString("hex"));
  }

  const generatedBaseName =
    parts.filter(Boolean).join("_") || "file";

  return `${generatedBaseName}${extension}`;
}

export function generateUniqueFileName(
  originalName: string,
  prefix?: string,
): string {
  return generateFileName(originalName, {
    prefix,
    includeTimestamp: true,
    includeRandomId: true,
  });
}

export function sanitizeFileName(
  fileName: string,
): string {
  const extension = getFileExtension(fileName);

  const baseName = sanitizeFileNamePart(
    getFileNameWithoutExtension(fileName),
  );

  return `${baseName || "file"}${extension}`;
}

export function calculateFileChecksum(
  buffer: Buffer,
  algorithm: "md5" | "sha1" | "sha256" = "sha256",
): string {
  return crypto
    .createHash(algorithm)
    .update(buffer)
    .digest("hex");
}

export function createFileMetadata(
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
  },
): FileMetadata {
  const extension = getFileExtension(
    file.originalname,
  );

  const checksum = file.buffer
    ? calculateFileChecksum(file.buffer)
    : "";

  return {
    originalName: file.originalname,
    fileName: sanitizeFileName(file.originalname),
    extension,
    mimeType: file.mimetype,
    size: file.size,
    sizeInKB: file.size / 1024,
    sizeInMB: file.size / (1024 * 1024),
    checksum,
  };
}

export function formatFileSize(
  bytes: number,
  decimals = 2,
): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 Bytes";
  }

  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB",
  ];

  const unitIndex = Math.floor(
    Math.log(bytes) / Math.log(1024),
  );

  const safeUnitIndex = Math.min(
    unitIndex,
    units.length - 1,
  );

  const value =
    bytes / Math.pow(1024, safeUnitIndex);

  const precision =
    safeUnitIndex === 0
      ? 0
      : Math.max(0, decimals);

  return `${value.toFixed(precision)} ${units[safeUnitIndex]}`;
}

export function parseFileSize(
  value: string | number,
): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Invalid file size");
    }

    return value;
  }

  const normalized = value.trim().toUpperCase();

  const match = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|PB)?$/,
  );

  if (!match) {
    throw new Error(`Invalid file size: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "B";

  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  };

  return amount * multipliers[unit];
}

export function isImageFile(
  fileName: string,
  mimeType?: string,
): boolean {
  if (
    mimeType &&
    mimeType.toLowerCase().startsWith("image/")
  ) {
    return true;
  }

  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
  ];

  return imageExtensions.includes(
    getFileExtension(fileName),
  );
}

export function isPdfFile(
  fileName: string,
  mimeType?: string,
): boolean {
  return (
    mimeType?.toLowerCase() === "application/pdf" ||
    getFileExtension(fileName) === ".pdf"
  );
}

export function isDocumentFile(
  fileName: string,
  mimeType?: string,
): boolean {
  if (mimeType) {
    const normalized = mimeType.toLowerCase();

    if (
      normalized === "application/pdf" ||
      normalized.includes("word") ||
      normalized.includes("excel") ||
      normalized.includes("spreadsheet")
    ) {
      return true;
    }
  }

  return [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
  ].includes(getFileExtension(fileName));
}

export function isArchiveFile(
  fileName: string,
  mimeType?: string,
): boolean {
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-rar-compressed"
  ) {
    return true;
  }

  return [".zip", ".rar"].includes(
    getFileExtension(fileName),
  );
}

export function getSafeUploadPath(
  baseDirectory: string,
  fileName: string,
): string {
  const safeFileName = sanitizeFileName(fileName);

  const resolvedBase = path.resolve(baseDirectory);
  const resolvedFile = path.resolve(
    resolvedBase,
    safeFileName,
  );

  if (
    resolvedFile !== resolvedBase &&
    !resolvedFile.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new Error("Invalid file path");
  }

  return resolvedFile;
}

export function getContentDispositionFileName(
  fileName: string,
): string {
  const sanitized = sanitizeFileName(fileName);

  return encodeURIComponent(sanitized);
}
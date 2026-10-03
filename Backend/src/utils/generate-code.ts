import crypto from "node:crypto";

export interface GenerateCodeOptions {
  prefix?: string;
  length?: number;
  separator?: string;
  uppercase?: boolean;
  includeTimestamp?: boolean;
  includeRandom?: boolean;
  randomAlphabet?: string;
}

const DEFAULT_RANDOM_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const DEFAULT_CODE_LENGTH = 8;

const MAX_CODE_LENGTH = 64;

function normalizePrefix(prefix?: string): string {
  if (!prefix) {
    return "";
  }

  return prefix
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function normalizeAlphabet(
  alphabet?: string,
): string {
  const value = alphabet?.trim() || DEFAULT_RANDOM_ALPHABET;

  const uniqueCharacters = [
    ...new Set(value.split("")),
  ].join("");

  if (uniqueCharacters.length < 2) {
    throw new Error(
      "Random alphabet must contain at least two unique characters",
    );
  }

  return uniqueCharacters;
}

function assertLength(length: number): void {
  if (
    !Number.isInteger(length) ||
    length < 1 ||
    length > MAX_CODE_LENGTH
  ) {
    throw new Error(
      `Code length must be between 1 and ${MAX_CODE_LENGTH}`,
    );
  }
}

export function generateRandomString(
  length = DEFAULT_CODE_LENGTH,
  alphabet = DEFAULT_RANDOM_ALPHABET,
): string {
  assertLength(length);

  const normalizedAlphabet =
    normalizeAlphabet(alphabet);

  const alphabetLength =
    normalizedAlphabet.length;

  const maxByte = 256;
  const limit =
    maxByte -
    (maxByte % alphabetLength);

  let result = "";

  while (result.length < length) {
    const bytes = crypto.randomBytes(
      Math.max(length * 2, 16),
    );

    for (const byte of bytes) {
      if (byte >= limit) {
        continue;
      }

      result +=
        normalizedAlphabet[
          byte % alphabetLength
        ];

      if (result.length === length) {
        break;
      }
    }
  }

  return result;
}

export function generateNumericCode(
  length = 6,
): string {
  if (
    !Number.isInteger(length) ||
    length < 1 ||
    length > MAX_CODE_LENGTH
  ) {
    throw new Error(
      `Numeric code length must be between 1 and ${MAX_CODE_LENGTH}`,
    );
  }

  const digits = generateRandomString(
    length,
    "0123456789",
  );

  return digits;
}

export function generateOtpCode(
  length = 6,
): string {
  return generateNumericCode(length);
}

export function generateReferenceCode(
  prefix: string,
  length = 8,
): string {
  const normalizedPrefix =
    normalizePrefix(prefix);

  if (!normalizedPrefix) {
    throw new Error(
      "Reference code prefix is required",
    );
  }

  return `${normalizedPrefix}-${generateRandomString(length)}`;
}

export function generateShipmentCode(
  sequence: number,
  prefix = "SHP",
  sequenceLength = 6,
): string {
  if (
    !Number.isInteger(sequence) ||
    sequence < 1
  ) {
    throw new Error(
      "Shipment sequence must be a positive integer",
    );
  }

  if (
    !Number.isInteger(sequenceLength) ||
    sequenceLength < 1 ||
    sequenceLength > MAX_CODE_LENGTH
  ) {
    throw new Error(
      `Sequence length must be between 1 and ${MAX_CODE_LENGTH}`,
    );
  }

  const normalizedPrefix =
    normalizePrefix(prefix);

  if (!normalizedPrefix) {
    throw new Error(
      "Shipment code prefix is required",
    );
  }

  const sequenceValue =
    String(sequence).padStart(
      sequenceLength,
      "0",
    );

  return `${normalizedPrefix}-${sequenceValue}`;
}

export function generateQuotationCode(
  sequence: number,
  prefix = "QT",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateBookingCode(
  sequence: number,
  prefix = "BK",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateInvoiceCode(
  sequence: number,
  prefix = "INV",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateCustomerCode(
  sequence: number,
  prefix = "CUS",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateVendorCode(
  sequence: number,
  prefix = "VEN",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateLeadCode(
  sequence: number,
  prefix = "LD",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateTaskCode(
  sequence: number,
  prefix = "TSK",
  sequenceLength = 6,
): string {
  return generateSequentialCode(
    prefix,
    sequence,
    sequenceLength,
  );
}

export function generateSequentialCode(
  prefix: string,
  sequence: number,
  sequenceLength = 6,
): string {
  const normalizedPrefix =
    normalizePrefix(prefix);

  if (!normalizedPrefix) {
    throw new Error(
      "Code prefix is required",
    );
  }

  if (
    !Number.isInteger(sequence) ||
    sequence < 1
  ) {
    throw new Error(
      "Sequence must be a positive integer",
    );
  }

  if (
    !Number.isInteger(sequenceLength) ||
    sequenceLength < 1 ||
    sequenceLength > MAX_CODE_LENGTH
  ) {
    throw new Error(
      `Sequence length must be between 1 and ${MAX_CODE_LENGTH}`,
    );
  }

  return `${normalizedPrefix}-${String(
    sequence,
  ).padStart(sequenceLength, "0")}`;
}

export function generateTimestampCode(
  prefix?: string,
  randomLength = 4,
): string {
  const normalizedPrefix =
    normalizePrefix(prefix);

  const timestamp = Date.now().toString(36).toUpperCase();

  const randomPart =
    generateRandomString(randomLength);

  const parts = [
    normalizedPrefix,
    timestamp,
    randomPart,
  ].filter(Boolean);

  return parts.join("-");
}

export function generateCode(
  options: GenerateCodeOptions = {},
): string {
  const {
    prefix,
    length = DEFAULT_CODE_LENGTH,
    separator = "-",
    uppercase = true,
    includeTimestamp = false,
    includeRandom = true,
    randomAlphabet = DEFAULT_RANDOM_ALPHABET,
  } = options;

  assertLength(length);

  const parts: string[] = [];

  const normalizedPrefix =
    normalizePrefix(prefix);

  if (normalizedPrefix) {
    parts.push(normalizedPrefix);
  }

  if (includeTimestamp) {
    parts.push(
      Date.now()
        .toString(36)
        .toUpperCase(),
    );
  }

  if (includeRandom) {
    parts.push(
      generateRandomString(
        length,
        randomAlphabet,
      ),
    );
  }

  if (parts.length === 0) {
    parts.push(
      generateRandomString(
        length,
        randomAlphabet,
      ),
    );
  }

  const code = parts.join(separator);

  return uppercase
    ? code.toUpperCase()
    : code;
}

export function generateTrackingToken(
  length = 32,
): string {
  if (
    !Number.isInteger(length) ||
    length < 16 ||
    length > 128
  ) {
    throw new Error(
      "Tracking token length must be between 16 and 128",
    );
  }

  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

export function generateSecureToken(
  byteLength = 32,
): string {
  if (
    !Number.isInteger(byteLength) ||
    byteLength < 16 ||
    byteLength > 128
  ) {
    throw new Error(
      "Secure token byte length must be between 16 and 128",
    );
  }

  return crypto
    .randomBytes(byteLength)
    .toString("hex");
}

export function generateId(
  byteLength = 16,
): string {
  if (
    !Number.isInteger(byteLength) ||
    byteLength < 8 ||
    byteLength > 64
  ) {
    throw new Error(
      "ID byte length must be between 8 and 64",
    );
  }

  return crypto
    .randomBytes(byteLength)
    .toString("hex");
}
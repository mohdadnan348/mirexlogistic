import {
  Types,
  isValidObjectId as mongooseIsValidObjectId,
} from "mongoose";

export type ObjectIdInput =
  | string
  | Types.ObjectId;

export function createObjectId(): Types.ObjectId {
  return new Types.ObjectId();
}

export function isValidObjectId(
  value: unknown,
): value is ObjectIdInput {
  if (value instanceof Types.ObjectId) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  return mongooseIsValidObjectId(value);
}

export function toObjectId(
  value: ObjectIdInput,
): Types.ObjectId {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (!isValidObjectId(value)) {
    throw new Error(
      `Invalid MongoDB ObjectId: ${String(value)}`,
    );
  }

  return new Types.ObjectId(value);
}

export function tryToObjectId(
  value: unknown,
): Types.ObjectId | null {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (
    typeof value !== "string" ||
    !isValidObjectId(value)
  ) {
    return null;
  }

  return new Types.ObjectId(value);
}

export function objectIdToString(
  value: Types.ObjectId,
): string {
  return value.toHexString();
}

export function areObjectIdsEqual(
  first: ObjectIdInput | null | undefined,
  second: ObjectIdInput | null | undefined,
): boolean {
  if (!first || !second) {
    return false;
  }

  try {
    return toObjectId(first).equals(
      toObjectId(second),
    );
  } catch {
    return false;
  }
}

export function isSameObjectId(
  first: unknown,
  second: unknown,
): boolean {
  if (
    !isValidObjectId(first) ||
    !isValidObjectId(second)
  ) {
    return false;
  }

  return toObjectId(first).equals(
    toObjectId(second),
  );
}

export function ensureObjectId(
  value: unknown,
  fieldName = "id",
): Types.ObjectId {
  const objectId = tryToObjectId(value);

  if (!objectId) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid MongoDB ObjectId`,
    );
  }

  return objectId;
}

export function objectIdFromString(
  value: string,
): Types.ObjectId {
  return ensureObjectId(value);
}

export function objectIdToStringOrNull(
  value: ObjectIdInput | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  try {
    return toObjectId(value).toHexString();
  } catch {
    return null;
  }
}

export function generateObjectIdString(): string {
  return createObjectId().toHexString();
}

export function validateObjectId(
  value: unknown,
  fieldName = "id",
): void {
  if (!isValidObjectId(value)) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid MongoDB ObjectId`,
    );
  }
}

export function normalizeObjectId(
  value: ObjectIdInput,
): Types.ObjectId {
  return toObjectId(value);
}

export function normalizeObjectIdString(
  value: ObjectIdInput,
): string {
  return toObjectId(value).toHexString();
}
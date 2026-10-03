import crypto from "node:crypto";
import bcrypt from "bcrypt";

import { ENV } from "../config/env";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const PASSWORD_HASH_PREFIXES = [
  "$2a$",
  "$2b$",
  "$2y$",
] as const;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PasswordStrengthResult {
  score: number;
  level: "weak" | "fair" | "strong" | "very-strong";
  suggestions: string[];
}

function getSaltRounds(): number {
  const configuredRounds = Number(
    ENV.BCRYPT_SALT_ROUNDS,
  );

  if (
    !Number.isInteger(configuredRounds) ||
    configuredRounds < 4 ||
    configuredRounds > 31
  ) {
    return 12;
  }

  return configuredRounds;
}

export function validatePassword(
  password: string,
): PasswordValidationResult {
  const errors: string[] = [];

  if (typeof password !== "string") {
    return {
      valid: false,
      errors: ["Password must be a string"],
    };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(
      `Password must contain at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(
      `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(
      "Password must contain at least one uppercase letter",
    );
  }

  if (!/[a-z]/.test(password)) {
    errors.push(
      "Password must contain at least one lowercase letter",
    );
  }

  if (!/[0-9]/.test(password)) {
    errors.push(
      "Password must contain at least one number",
    );
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push(
      "Password must contain at least one special character",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertValidPassword(
  password: string,
): void {
  const result = validatePassword(password);

  if (!result.valid) {
    throw new Error(result.errors.join("; "));
  }
}

export async function hashPassword(
  password: string,
): Promise<string> {
  assertValidPassword(password);

  return bcrypt.hash(
    password,
    getSaltRounds(),
  );
}

export async function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string" ||
    passwordHash.length === 0
  ) {
    return false;
  }

  try {
    return await bcrypt.compare(
      password,
      passwordHash,
    );
  } catch {
    return false;
  }
}

export function isPasswordHash(
  value: string,
): boolean {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    return false;
  }

  return PASSWORD_HASH_PREFIXES.some(
    (prefix) => value.startsWith(prefix),
  );
}

export function getPasswordStrength(
  password: string,
): PasswordStrengthResult {
  if (typeof password !== "string") {
    return {
      score: 0,
      level: "weak",
      suggestions: [
        "Password must be a string",
      ],
    };
  }

  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    suggestions.push(
      "Use at least 8 characters",
    );
  }

  if (password.length >= 12) {
    score += 1;
  } else {
    suggestions.push(
      "Use 12 or more characters for better security",
    );
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push(
      "Add lowercase letters",
    );
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push(
      "Add uppercase letters",
    );
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push(
      "Add numbers",
    );
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push(
      "Add special characters",
    );
  }

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);

    suggestions.push(
      "Avoid repeating the same character multiple times",
    );
  }

  const normalizedPassword =
    password.toLowerCase();

  const commonPatterns = [
    "password",
    "qwerty",
    "123456",
    "12345678",
    "admin",
    "welcome",
    "letmein",
  ];

  if (
    commonPatterns.some((pattern) =>
      normalizedPassword.includes(pattern),
    )
  ) {
    score = Math.max(0, score - 2);

    suggestions.push(
      "Avoid common passwords and predictable patterns",
    );
  }

  const level =
    score <= 2
      ? "weak"
      : score <= 4
        ? "fair"
        : score === 5
          ? "strong"
          : "very-strong";

  return {
    score,
    level,
    suggestions,
  };
}

export function generateRandomPassword(
  length = 16,
): string {
  if (
    !Number.isInteger(length) ||
    length < PASSWORD_MIN_LENGTH ||
    length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `Password length must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH}`,
    );
  }

  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%^&*()-_=+";

  const characterSets = [
    uppercase,
    lowercase,
    numbers,
    special,
  ];

  const allCharacters =
    characterSets.join("");

  const passwordCharacters: string[] = [];

  for (const characterSet of characterSets) {
    const index = crypto.randomInt(
      0,
      characterSet.length,
    );

    passwordCharacters.push(
      characterSet[index],
    );
  }

  while (
    passwordCharacters.length < length
  ) {
    const index = crypto.randomInt(
      0,
      allCharacters.length,
    );

    passwordCharacters.push(
      allCharacters[index],
    );
  }

  for (
    let index = passwordCharacters.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex = crypto.randomInt(
      0,
      index + 1,
    );

    [
      passwordCharacters[index],
      passwordCharacters[randomIndex],
    ] = [
      passwordCharacters[randomIndex],
      passwordCharacters[index],
    ];
  }

  return passwordCharacters.join("");
}

export function generatePasswordResetToken(
  byteLength = 32,
): string {
  if (
    !Number.isInteger(byteLength) ||
    byteLength < 16 ||
    byteLength > 128
  ) {
    throw new Error(
      "Password reset token byte length must be between 16 and 128",
    );
  }

  return crypto
    .randomBytes(byteLength)
    .toString("hex");
}

export function hashResetToken(
  token: string,
): string {
  if (!token) {
    throw new Error(
      "Reset token is required",
    );
  }

  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function generateOtp(
  length = 6,
): string {
  if (
    !Number.isInteger(length) ||
    length < 4 ||
    length > 10
  ) {
    throw new Error(
      "OTP length must be between 4 and 10",
    );
  }

  let otp = "";

  for (let index = 0; index < length; index += 1) {
    otp += crypto.randomInt(0, 10).toString();
  }

  return otp;
}

export function hashOtp(
  otp: string,
): string {
  if (!otp) {
    throw new Error("OTP is required");
  }

  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

export function isPasswordCompromisedFormat(
  password: string,
): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}
import { z } from "zod";

import { Types } from "mongoose";

import type {
  UserAccountType,
  UserDataScope,
  UserEmploymentType,
  UserGender,
  UserStatus,
} from "./user.types";

/**
 * MongoDB ObjectId validator.
 */
export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid MongoDB ObjectId.",
  });

/**
 * ObjectId transformer.
 */
export const objectIdTransformSchema = objectIdSchema.transform(
  (value) => new Types.ObjectId(value),
);

/**
 * Employee code.
 */
export const employeeCodeSchema = z
  .string()
  .trim()
  .min(2, "Employee code must contain at least 2 characters.")
  .max(50, "Employee code cannot exceed 50 characters.")
  .regex(
    /^[A-Z0-9][A-Z0-9_-]*$/i,
    "Employee code may contain only letters, numbers, hyphens and underscores.",
  )
  .transform((value) => value.toUpperCase());

/**
 * Employee number.
 */
export const employeeNumberSchema = z
  .string()
  .trim()
  .min(1, "Employee number is required.")
  .max(50, "Employee number cannot exceed 50 characters.")
  .regex(
    /^[A-Z0-9][A-Z0-9_-]*$/i,
    "Employee number may contain only letters, numbers, hyphens and underscores.",
  )
  .transform((value) => value.toUpperCase());

/**
 * Email.
 */
export const userEmailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email address.")
  .max(254, "Email address cannot exceed 254 characters.")
  .transform((value) => value.toLowerCase());

/**
 * International phone number.
 *
 * Examples:
 * +919876543210
 * +14155552671
 */
export const userPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Phone number must be in valid international E.164 format.",
  );

/**
 * Password.
 */
export const userPasswordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(128, "Password cannot exceed 128 characters.")
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must contain at least one uppercase letter.",
  })
  .refine((value) => /[a-z]/.test(value), {
    message: "Password must contain at least one lowercase letter.",
  })
  .refine((value) => /\d/.test(value), {
    message: "Password must contain at least one number.",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "Password must contain at least one special character.",
  });

/**
 * First name.
 */
export const userFirstNameSchema = z
  .string()
  .trim()
  .min(1, "First name is required.")
  .max(100, "First name cannot exceed 100 characters.");

/**
 * Last name.
 */
export const userLastNameSchema = z
  .string()
  .trim()
  .max(100, "Last name cannot exceed 100 characters.")
  .optional();

/**
 * Display name.
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(201, "Display name cannot exceed 201 characters.");

/**
 * Avatar URL.
 */
export const avatarUrlSchema = z
  .string()
  .trim()
  .url("Avatar URL must be a valid URL.")
  .max(2048, "Avatar URL cannot exceed 2048 characters.")
  .optional();

/**
 * Gender.
 */
export const userGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] satisfies UserGender[]);

/**
 * Employment type.
 */
export const userEmploymentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERN",
] satisfies UserEmploymentType[]);

/**
 * Account type.
 */
export const userAccountTypeSchema = z.enum([
  "EMPLOYEE",
  "ADMINISTRATOR",
] satisfies UserAccountType[]);

/**
 * User data scope.
 */
export const userDataScopeSchema = z.enum([
  "GLOBAL",
  "BRANCH",
  "DEPARTMENT",
] satisfies UserDataScope[]);

/**
 * User status.
 */
export const userStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "LOCKED",
] satisfies UserStatus[]);

/**
 * ISO date validator.
 */
export const userDateSchema = z.coerce
  .date()
  .refine(
    (value) => !Number.isNaN(value.getTime()),
    "Invalid date.",
  );

/**
 * Optional ISO date.
 */
export const optionalUserDateSchema = userDateSchema.optional();

/**
 * Branch assignment.
 */
export const userBranchAssignmentSchema = z.object({
  branchId: objectIdSchema,
  isPrimary: z.boolean().default(false),
});

/**
 * Branch assignments.
 *
 * At most one branch may be primary.
 */
export const userBranchesSchema = z
  .array(userBranchAssignmentSchema)
  .min(1, "At least one branch assignment is required.")
  .max(100, "A user cannot have more than 100 branch assignments.")
  .superRefine((branches, context) => {
    const primaryBranches = branches.filter(
      (branch) => branch.isPrimary,
    );

    if (primaryBranches.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one branch can be marked as primary.",
        path: ["branches"],
      });
    }

    const branchIds = branches.map((branch) => branch.branchId);

    if (new Set(branchIds).size !== branchIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate branch assignments are not allowed.",
        path: ["branches"],
      });
    }
  });

/**
 * Notification preferences.
 */
export const notificationPreferencesSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
});

/**
 * Full notification preferences validator.
 */
export const fullNotificationPreferencesSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
});

/**
 * Create user validator.
 */
export const createUserValidator = z
  .object({
    employeeCode: employeeCodeSchema.optional(),

    email: userEmailSchema,
    phone: userPhoneSchema.optional(),

    password: userPasswordSchema,

    firstName: userFirstNameSchema,
    lastName: userLastNameSchema,

    avatarUrl: avatarUrlSchema,
    gender: userGenderSchema.optional(),
    dateOfBirth: optionalUserDateSchema,

    employeeType: userEmploymentTypeSchema.default("FULL_TIME"),
    accountType: userAccountTypeSchema.default("EMPLOYEE"),

    designation: z
      .string()
      .trim()
      .max(150, "Designation cannot exceed 150 characters.")
      .optional(),

    employeeNumber: employeeNumberSchema.optional(),

    roleId: objectIdSchema,

    roleIds: z
      .array(objectIdSchema)
      .max(20, "A user cannot have more than 20 roles.")
      .optional(),

    departmentId: objectIdSchema.optional(),

    branches: userBranchesSchema,

    branchId: objectIdSchema.optional(),

    dataScope: userDataScopeSchema.default("BRANCH"),

    status: userStatusSchema.default("ACTIVE"),

    isLoginEnabled: z.boolean().default(true),

    notificationPreferences:
      notificationPreferencesSchema.optional(),
  })
  .superRefine((data, context) => {
    if (
      data.dataScope === "BRANCH" &&
      data.branches.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one branch is required for BRANCH data scope.",
        path: ["branches"],
      });
    }

    if (
      data.branchId &&
      !data.branches.some(
        (branch) => branch.branchId === data.branchId,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Primary branch must exist in the assigned branches.",
        path: ["branchId"],
      });
    }

    if (
      data.status === "LOCKED" &&
      data.isLoginEnabled === true
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "A locked user cannot have an enabled login state.",
        path: ["isLoginEnabled"],
      });
    }
  });

/**
 * Update user validator.
 *
 * Password changes are intentionally excluded.
 */
export const updateUserValidator = z
  .object({
    email: userEmailSchema.optional(),
    phone: userPhoneSchema.optional(),

    firstName: userFirstNameSchema.optional(),
    lastName: userLastNameSchema,
    displayName: displayNameSchema.optional(),

    avatarUrl: avatarUrlSchema,
    gender: userGenderSchema.optional(),
    dateOfBirth: optionalUserDateSchema,

    employeeType: userEmploymentTypeSchema.optional(),
    accountType: userAccountTypeSchema.optional(),

    designation: z
      .string()
      .trim()
      .max(150, "Designation cannot exceed 150 characters.")
      .optional(),

    employeeNumber: employeeNumberSchema.optional(),

    roleId: objectIdSchema.optional(),

    roleIds: z
      .array(objectIdSchema)
      .max(20, "A user cannot have more than 20 roles.")
      .optional(),

    departmentId: objectIdSchema.optional(),

    branches: userBranchesSchema.optional(),

    branchId: objectIdSchema.optional(),

    dataScope: userDataScopeSchema.optional(),

    isLoginEnabled: z.boolean().optional(),

    notificationPreferences:
      notificationPreferencesSchema.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.branches &&
      data.branchId &&
      !data.branches.some(
        (branch) => branch.branchId === data.branchId,
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Primary branch must exist in the assigned branches.",
        path: ["branchId"],
      });
    }
  });

/**
 * User ID route validator.
 */
export const userIdValidator = z.object({
  userId: objectIdSchema,
});

/**
 * Employee code route/query validator.
 */
export const userEmployeeCodeValidator = z.object({
  employeeCode: employeeCodeSchema,
});

/**
 * Employee number validator.
 */
export const userEmployeeNumberValidator = z.object({
  employeeNumber: employeeNumberSchema,
});

/**
 * Email validator.
 */
export const userEmailValidator = z.object({
  email: userEmailSchema,
});

/**
 * Phone validator.
 */
export const userPhoneValidator = z.object({
  phone: userPhoneSchema,
});

/**
 * Status update validator.
 */
export const userStatusValidator = z.object({
  status: userStatusSchema,
});

/**
 * Login state validator.
 */
export const userLoginStateValidator = z.object({
  isLoginEnabled: z.boolean(),
});

/**
 * Lock user validator.
 */
export const lockUserValidator = z.object({
  lockedUntil: optionalUserDateSchema,
});

/**
 * Assign roles validator.
 */
export const assignUserRolesValidator = z
  .object({
    roleId: objectIdSchema,
    roleIds: z
      .array(objectIdSchema)
      .max(20, "A user cannot have more than 20 roles.")
      .optional(),
  })
  .strict();

/**
 * Assign branches validator.
 */
export const assignUserBranchesValidator = z.object({
  branches: userBranchesSchema,
  primaryBranchId: objectIdSchema.optional(),
});

/**
 * Two-factor authentication status validator.
 */
export const twoFactorStatusValidator = z.object({
  enabled: z.boolean(),
});

/**
 * User password update validator.
 */
export const updateUserPasswordValidator = z
  .object({
    currentPassword: userPasswordSchema,
    newPassword: userPasswordSchema,
    confirmPassword: userPasswordSchema,
  })
  .strict()
  .superRefine((data, context) => {
    if (data.currentPassword === data.newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "New password must be different from the current password.",
        path: ["newPassword"],
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password confirmation does not match.",
        path: ["confirmPassword"],
      });
    }
  });

/**
 * User filters validator.
 */
export const userFiltersValidator = z
  .object({
    employeeCode: employeeCodeSchema.optional(),
    email: userEmailSchema.optional(),
    phone: userPhoneSchema.optional(),

    firstName: z
      .string()
      .trim()
      .max(100)
      .optional(),

    lastName: z
      .string()
      .trim()
      .max(100)
      .optional(),

    roleId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    branchId: objectIdSchema.optional(),

    status: userStatusSchema.optional(),
    employeeType: userEmploymentTypeSchema.optional(),
    accountType: userAccountTypeSchema.optional(),
    dataScope: userDataScopeSchema.optional(),

    isLoginEnabled: z.coerce.boolean().optional(),
    isLocked: z.coerce.boolean().optional(),

    search: z
      .string()
      .trim()
      .max(150, "Search query cannot exceed 150 characters.")
      .optional(),
  })
  .strict();

/**
 * Pagination validator.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  sortBy: z
    .enum([
      "employeeCode",
      "employeeNumber",
      "email",
      "firstName",
      "lastName",
      "displayName",
      "employeeType",
      "accountType",
      "designation",
      "status",
      "dataScope",
      "lastLoginAt",
      "lastActivityAt",
      "createdAt",
      "updatedAt",
    ])
    .default("createdAt"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("desc"),
});

/**
 * Complete user list query validator.
 */
export const userListQueryValidator = userFiltersValidator
  .merge(paginationQuerySchema)
  .strict();

/**
 * Search query validator.
 */
export const userSearchValidator = z.object({
  search: z
    .string()
    .trim()
    .min(1, "Search query is required.")
    .max(150, "Search query cannot exceed 150 characters."),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

/**
 * User existence check validator.
 */
export const userExistenceValidator = z
  .object({
    email: userEmailSchema.optional(),
    phone: userPhoneSchema.optional(),
    employeeCode: employeeCodeSchema.optional(),
    employeeNumber: employeeNumberSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      Boolean(
        data.email ||
          data.phone ||
          data.employeeCode ||
          data.employeeNumber,
      ),
    {
      message:
        "At least one user identifier is required.",
    },
  );

/**
 * User role/branch/departments access validator.
 */
export const userAccessContextValidator = z.object({
  roleId: objectIdSchema.optional(),
  roleIds: z
    .array(objectIdSchema)
    .max(20)
    .optional(),

  branchId: objectIdSchema.optional(),
  branchIds: z
    .array(objectIdSchema)
    .max(100)
    .optional(),

  departmentId: objectIdSchema.optional(),

  dataScope: userDataScopeSchema,
});

/**
 * Validate MongoDB ObjectId.
 */
export function validateUserId(value: unknown): boolean {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}

/**
 * Validate employee code.
 */
export function validateEmployeeCode(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    employeeCodeSchema.safeParse(value).success
  );
}

/**
 * Validate email.
 */
export function validateUserEmail(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    userEmailSchema.safeParse(value).success
  );
}

/**
 * Validate phone.
 */
export function validateUserPhone(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    userPhoneSchema.safeParse(value).success
  );
}

/**
 * Validate user status.
 */
export function validateUserStatus(
  value: unknown,
): value is UserStatus {
  return (
    typeof value === "string" &&
    userStatusSchema.safeParse(value).success
  );
}

/**
 * Validate user data scope.
 */
export function validateUserDataScope(
  value: unknown,
): value is UserDataScope {
  return (
    typeof value === "string" &&
    userDataScopeSchema.safeParse(value).success
  );
}

/**
 * Validate employment type.
 */
export function validateUserEmploymentType(
  value: unknown,
): value is UserEmploymentType {
  return (
    typeof value === "string" &&
    userEmploymentTypeSchema.safeParse(value).success
  );
}

/**
 * Validate account type.
 */
export function validateUserAccountType(
  value: unknown,
): value is UserAccountType {
  return (
    typeof value === "string" &&
    userAccountTypeSchema.safeParse(value).success
  );
}

/**
 * Validate gender.
 */
export function validateUserGender(
  value: unknown,
): value is UserGender {
  return (
    typeof value === "string" &&
    userGenderSchema.safeParse(value).success
  );
}

/**
 * Convert a validated ObjectId string to Mongoose ObjectId.
 */
export function toUserObjectId(
  value: string,
): Types.ObjectId {
  return new Types.ObjectId(value);
}

/**
 * Parse and normalize a user ID.
 */
export function parseUserId(
  value: unknown,
): Types.ObjectId {
  const result = objectIdTransformSchema.safeParse(value);

  if (!result.success) {
    throw new Error("Invalid user ID.");
  }

  return result.data;
}

/**
 * Parse create-user input.
 */
export function parseCreateUserInput(
  value: unknown,
) {
  return createUserValidator.parse(value);
}

/**
 * Parse update-user input.
 */
export function parseUpdateUserInput(
  value: unknown,
) {
  return updateUserValidator.parse(value);
}

/**
 * Parse user list query.
 */
export function parseUserListQuery(
  value: unknown,
) {
  return userListQueryValidator.parse(value);
}

/**
 * Parse user status.
 */
export function parseUserStatus(
  value: unknown,
): UserStatus {
  return userStatusSchema.parse(value);
}

/**
 * Type-safe inferred validator types.
 */
export type CreateUserValidatorInput = z.infer<
  typeof createUserValidator
>;

export type UpdateUserValidatorInput = z.infer<
  typeof updateUserValidator
>;

export type UserListQueryValidatorInput = z.infer<
  typeof userListQueryValidator
>;

export type UserFiltersValidatorInput = z.infer<
  typeof userFiltersValidator
>;

export type UpdateUserPasswordValidatorInput = z.infer<
  typeof updateUserPasswordValidator
>;

export type AssignUserRolesValidatorInput = z.infer<
  typeof assignUserRolesValidator
>;

export type AssignUserBranchesValidatorInput = z.infer<
  typeof assignUserBranchesValidator
>;

export type UserExistenceValidatorInput = z.infer<
  typeof userExistenceValidator
>;
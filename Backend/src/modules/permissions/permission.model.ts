import {
  HydratedDocument,
  Model,
  Schema,
  Types,
  model,
} from "mongoose";

import type {
  PermissionAction,
  PermissionEntity,
  PermissionModule,
  PermissionScope,
  PermissionStatus,
} from "./permission.types";

/**
 * Mongoose document type for Permission.
 */
export type PermissionDocument = HydratedDocument<PermissionEntity>;

/**
 * Permission model static methods.
 */
export interface PermissionModel extends Model<PermissionEntity> {
  findByCode(
    code: string,
  ): Promise<PermissionDocument | null>;

  findActiveByCode(
    code: string,
  ): Promise<PermissionDocument | null>;

  existsByCode(
    code: string,
    excludeId?: Types.ObjectId,
  ): Promise<boolean>;
}

/**
 * Nested ObjectId validator.
 */
const objectIdSchema = {
  type: Schema.Types.ObjectId,
};

/**
 * Permission schema.
 */
const permissionSchema = new Schema<
  PermissionEntity,
  PermissionModel
>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 150,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },

    module: {
      type: String,
      required: true,
      uppercase: true,
      enum: [
        "DASHBOARD",
        "CUSTOMER",
        "CONTACT",
        "LEAD",
        "ENQUIRY",
        "QUOTATION",
        "BOOKING",
        "SHIPMENT",
        "SERVICE",
        "TRACKING",
        "TASK",
        "NOTIFICATION",
        "INVOICE",
        "PAYMENT",
        "VENDOR",
        "REPORT",
        "MASTER",
        "USER",
        "ROLE",
        "PERMISSION",
        "BRANCH",
        "DEPARTMENT",
        "AUDIT",
        "SETTINGS",
      ] satisfies readonly PermissionModule[],
      index: true,
    },

    action: {
      type: String,
      required: true,
      uppercase: true,
      enum: [
        "CREATE",
        "READ",
        "UPDATE",
        "DELETE",
        "VIEW",
        "LIST",
        "EXPORT",
        "IMPORT",
        "APPROVE",
        "REJECT",
        "ASSIGN",
        "UNASSIGN",
        "MANAGE",
      ] satisfies readonly PermissionAction[],
      index: true,
    },

    scope: {
      type: String,
      required: true,
      uppercase: true,
      enum: [
        "GLOBAL",
        "BRANCH",
        "DEPARTMENT",
      ] satisfies readonly PermissionScope[],
      default: "GLOBAL",
      index: true,
    },

    status: {
      type: String,
      required: true,
      uppercase: true,
      enum: [
        "ACTIVE",
        "INACTIVE",
      ] satisfies readonly PermissionStatus[],
      default: "ACTIVE",
      index: true,
    },

    isSystemPermission: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },

    createdBy: {
      ...objectIdSchema,
      required: false,
      default: undefined,
      index: true,
    },

    updatedBy: {
      ...objectIdSchema,
      required: false,
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "permissions",
    strict: true,
    minimize: true,
  },
);

/**
 * Unique permission identity.
 *
 * A permission is uniquely identified by its module + action + scope.
 * The code remains independently unique for API-level lookups.
 */
permissionSchema.index(
  {
    module: 1,
    action: 1,
    scope: 1,
  },
  {
    unique: true,
    name: "permission_module_action_scope_unique",
  },
);

/**
 * Frequently used administrative listing index.
 */
permissionSchema.index(
  {
    status: 1,
    module: 1,
    action: 1,
  },
  {
    name: "permission_status_module_action_idx",
  },
);

/**
 * Search-oriented index.
 */
permissionSchema.index(
  {
    name: 1,
    code: 1,
  },
  {
    name: "permission_name_code_idx",
  },
);

/**
 * Find permission by unique code.
 */
permissionSchema.statics.findByCode = function (
  code: string,
): Promise<PermissionDocument | null> {
  return this.findOne({
    code: code.trim().toUpperCase(),
  }).exec();
};

/**
 * Find an active permission by unique code.
 */
permissionSchema.statics.findActiveByCode = function (
  code: string,
): Promise<PermissionDocument | null> {
  return this.findOne({
    code: code.trim().toUpperCase(),
    status: "ACTIVE",
  }).exec();
};

/**
 * Check whether a permission code already exists.
 *
 * `excludeId` is useful during permission updates so that the
 * current document does not conflict with itself.
 */
permissionSchema.statics.existsByCode = async function (
  code: string,
  excludeId?: Types.ObjectId,
): Promise<boolean> {
  const filter: {
    code: string;
    _id?: { $ne: Types.ObjectId };
  } = {
    code: code.trim().toUpperCase(),
  };

  if (excludeId) {
    filter._id = {
      $ne: excludeId,
    };
  }

  const existing = await this.exists(filter).exec();

  return existing !== null;
};

/**
 * Permission model.
 */
export const PermissionModel =
  model<PermissionEntity, PermissionModel>(
    "Permission",
    permissionSchema,
  );

/**
 * Runtime guard for Permission documents.
 */
export function isPermissionDocument(
  value: unknown,
): value is PermissionDocument {
  return value instanceof PermissionModel;
}

/**
 * Runtime guard for MongoDB ObjectIds.
 */
export function isPermissionObjectId(
  value: unknown,
): value is Types.ObjectId {
  return value instanceof Types.ObjectId;
}
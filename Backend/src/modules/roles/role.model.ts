import {
  model,
  Schema,
  type HydratedDocument,
  type Model,
} from "mongoose";
import type { Types } from "mongoose";

import type {
  RoleAccessLevel,
  RoleEntity,
  RolePermission,
  RoleScope,
  RoleStatus,
} from "./role.types";

/* -------------------------------------------------------------------------- */
/*                              Document Type                                 */
/* -------------------------------------------------------------------------- */

export type RoleDocument = HydratedDocument<RoleEntity>;

/* -------------------------------------------------------------------------- */
/*                         Role Permission Schema                             */
/* -------------------------------------------------------------------------- */

const rolePermissionSchema = new Schema<RolePermission>(
  {
    permissionId: {
      type: Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    _id: false,
    id: false,
  },
);

/* -------------------------------------------------------------------------- */
/*                              Role Schema                                   */
/* -------------------------------------------------------------------------- */

const roleSchema = new Schema<RoleEntity>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 100,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    accessLevel: {
      type: String,
      enum: [
        "SYSTEM",
        "ADMIN",
        "MANAGEMENT",
        "OPERATIONAL",
        "READ_ONLY",
      ] satisfies RoleAccessLevel[],
      required: true,
      index: true,
    },

    scope: {
      type: String,
      enum: [
        "GLOBAL",
        "BRANCH",
        "DEPARTMENT",
      ] satisfies RoleScope[],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
      ] satisfies RoleStatus[],
      required: true,
      default: "ACTIVE",
      index: true,
    },

    permissions: {
      type: [rolePermissionSchema],
      default: [],
    },

    isSystemRole: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "roles",
  },
);

/* -------------------------------------------------------------------------- */
/*                                Indexes                                     */
/* -------------------------------------------------------------------------- */

roleSchema.index({
  name: 1,
});

roleSchema.index({
  status: 1,
  accessLevel: 1,
});

roleSchema.index({
  scope: 1,
  status: 1,
});

roleSchema.index({
  isSystemRole: 1,
  status: 1,
});

roleSchema.index({
  "permissions.permissionId": 1,
});

roleSchema.index({
  "permissions.code": 1,
});

/* -------------------------------------------------------------------------- */
/*                             Query Helpers                                  */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/*                              Model Type                                    */
/* -------------------------------------------------------------------------- */

export interface RoleModel extends Model<RoleEntity> {
  findByCode(code: string): Promise<RoleDocument | null>;
}

/* -------------------------------------------------------------------------- */
/*                              Static Methods                                */
/* -------------------------------------------------------------------------- */

roleSchema.statics.findByCode = function (
  code: string,
): Promise<RoleDocument | null> {
  return this.findOne({
    code: code.trim().toUpperCase(),
    isDeleted: {
      $ne: true,
    },
  }).exec();
};

/* -------------------------------------------------------------------------- */
/*                              Model Export                                  */
/* -------------------------------------------------------------------------- */

export const RoleModel = model<
  RoleEntity,
  RoleModel
>("Role", roleSchema);

/* -------------------------------------------------------------------------- */
/*                              Type Guards                                   */
/* -------------------------------------------------------------------------- */

export function isRoleDocument(
  value: unknown,
): value is RoleDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    typeof (value as { _id?: unknown })._id !== "undefined"
  );
}

/* -------------------------------------------------------------------------- */
/*                           ObjectId Utility                                 */
/* -------------------------------------------------------------------------- */

export function isRoleObjectId(
  value: unknown,
): value is Types.ObjectId {
  return (
    value instanceof Object &&
    typeof value === "object" &&
    value !== null &&
    "toHexString" in value &&
    typeof (value as { toHexString?: unknown }).toHexString ===
      "function"
  );
}
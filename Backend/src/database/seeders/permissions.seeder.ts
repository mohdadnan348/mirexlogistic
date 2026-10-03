import mongoose, {
  type ClientSession,
  type Collection,
  type Connection,
} from "mongoose";

interface PermissionSeedOptions {
  connection?: Connection;
  session?: ClientSession;
}

interface PermissionRecord {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  module: string;
  action: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PermissionDefinition {
  module: string;
  actions: string[];
}

interface PermissionSeedResult {
  inserted: number;
  existing: number;
  total: number;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    module: "dashboard",
    actions: ["read"],
  },
  {
    module: "customer",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "contact",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "lead",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "enquiry",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "quotation",
    actions: [
      "create",
      "read",
      "update",
      "delete",
      "approve",
      "send",
    ],
  },
  {
    module: "booking",
    actions: [
      "create",
      "read",
      "update",
      "delete",
      "approve",
    ],
  },
  {
    module: "shipment",
    actions: [
      "create",
      "read",
      "update",
      "delete",
      "approve",
    ],
  },
  {
    module: "air",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "ocean",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "land",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "courier",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "warehouse",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "transport",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "customs",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "documentation",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "tracking",
    actions: ["create", "read", "update"],
  },
  {
    module: "task",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "notification",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "invoice",
    actions: [
      "create",
      "read",
      "update",
      "delete",
      "approve",
      "send",
    ],
  },
  {
    module: "payment",
    actions: [
      "create",
      "read",
      "update",
      "delete",
      "approve",
    ],
  },
  {
    module: "vendor",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "report",
    actions: ["read", "export"],
  },
  {
    module: "master",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "user",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "role",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "permission",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "branch",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "department",
    actions: ["create", "read", "update", "delete"],
  },
  {
    module: "audit",
    actions: ["read", "export"],
  },
  {
    module: "settings",
    actions: ["read", "update"],
  },
];

function getConnection(
  connection?: Connection,
): Connection {
  const databaseConnection =
    connection ?? mongoose.connection;

  if (databaseConnection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to the database before running the permissions seeder.",
    );
  }

  return databaseConnection;
}

function getPermissionCollection(
  connection: Connection,
): Collection<PermissionRecord> {
  return connection.collection<PermissionRecord>(
    "permissions",
  );
}

async function ensurePermissionIndexes(
  collection: Collection<PermissionRecord>,
): Promise<void> {
  await collection.createIndex(
    {
      code: 1,
    },
    {
      unique: true,
      name: "uniq_permission_code",
    },
  );

  await collection.createIndex(
    {
      module: 1,
      action: 1,
    },
    {
      name: "idx_permission_module_action",
    },
  );

  await collection.createIndex(
    {
      isActive: 1,
      isDeleted: 1,
    },
    {
      name: "idx_permission_active_deleted",
    },
  );
}

function createPermissionDefinitions(): Array<{
  code: string;
  name: string;
  module: string;
  action: string;
  description: string;
}> {
  return PERMISSION_DEFINITIONS.flatMap(
    ({ module, actions }) =>
      actions.map((action) => ({
        code: `${module}:${action}`,
        name: `${module} ${action}`,
        module,
        action,
        description: `Allows the ${action} action for the ${module} module.`,
      })),
  );
}

async function executePermissionSeed(
  connection: Connection,
  session?: ClientSession,
): Promise<PermissionSeedResult> {
  const collection = getPermissionCollection(
    connection,
  );

  await ensurePermissionIndexes(collection);

  const definitions = createPermissionDefinitions();

  const existingPermissions = await collection
    .find(
      {
        code: {
          $in: definitions.map(
            (permission) => permission.code,
          ),
        },
        isDeleted: {
          $ne: true,
        },
      },
      {
        projection: {
          code: 1,
        },
        session,
      },
    )
    .toArray();

  const existingCodes = new Set(
    existingPermissions.map(
      (permission) => permission.code,
    ),
  );

  const now = new Date();

  const permissionsToInsert: PermissionRecord[] =
    definitions
      .filter(
        (permission) =>
          !existingCodes.has(permission.code),
      )
      .map((permission) => ({
        _id: new mongoose.Types.ObjectId(),
        code: permission.code,
        name: permission.name,
        module: permission.module,
        action: permission.action,
        description: permission.description,
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }));

  if (permissionsToInsert.length > 0) {
    await collection.insertMany(
      permissionsToInsert,
      {
        ordered: true,
        session,
      },
    );
  }

  return {
    inserted: permissionsToInsert.length,
    existing: existingPermissions.length,
    total: definitions.length,
  };
}

export async function seedPermissions(
  options: PermissionSeedOptions = {},
): Promise<PermissionSeedResult> {
  const connection = getConnection(
    options.connection,
  );

  return executePermissionSeed(
    connection,
    options.session,
  );
}

export async function runPermissionsSeeder(): Promise<PermissionSeedResult> {
  return seedPermissions();
}
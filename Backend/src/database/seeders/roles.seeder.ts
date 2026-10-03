import mongoose, {
  type ClientSession,
  type Collection,
  type Connection,
} from "mongoose";

interface RoleSeedOptions {
  connection?: Connection;
  session?: ClientSession;
}

interface RoleRecord {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

interface RoleSeedResult {
  inserted: number;
  existing: number;
  total: number;
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description:
      "Full system access including users, roles, permissions, branches, settings, masters, operations, finance, reports, and audit records.",
    permissions: ["*"],
    isSystem: true,
  },
  {
    code: "MANAGER",
    name: "Manager",
    description:
      "Management access for CRM, quotations, bookings, shipments, operations, reports, customers, vendors, and branch-level activities.",
    permissions: [
      "dashboard:read",
      "customer:create",
      "customer:read",
      "customer:update",
      "contact:create",
      "contact:read",
      "contact:update",
      "lead:create",
      "lead:read",
      "lead:update",
      "enquiry:create",
      "enquiry:read",
      "enquiry:update",
      "quotation:create",
      "quotation:read",
      "quotation:update",
      "quotation:approve",
      "quotation:send",
      "booking:create",
      "booking:read",
      "booking:update",
      "booking:approve",
      "shipment:create",
      "shipment:read",
      "shipment:update",
      "shipment:approve",
      "air:create",
      "air:read",
      "air:update",
      "ocean:create",
      "ocean:read",
      "ocean:update",
      "land:create",
      "land:read",
      "land:update",
      "courier:create",
      "courier:read",
      "courier:update",
      "warehouse:create",
      "warehouse:read",
      "warehouse:update",
      "transport:create",
      "transport:read",
      "transport:update",
      "customs:create",
      "customs:read",
      "customs:update",
      "documentation:create",
      "documentation:read",
      "documentation:update",
      "tracking:read",
      "tracking:update",
      "task:create",
      "task:read",
      "task:update",
      "notification:read",
      "invoice:create",
      "invoice:read",
      "invoice:update",
      "invoice:approve",
      "invoice:send",
      "payment:create",
      "payment:read",
      "payment:update",
      "payment:approve",
      "vendor:create",
      "vendor:read",
      "vendor:update",
      "report:read",
      "report:export",
    ],
    isSystem: true,
  },
  {
    code: "SALES",
    name: "Sales / CRM",
    description:
      "CRM access for customers, contacts, leads, enquiries, quotations, and sales-related activities.",
    permissions: [
      "dashboard:read",
      "customer:create",
      "customer:read",
      "customer:update",
      "contact:create",
      "contact:read",
      "contact:update",
      "lead:create",
      "lead:read",
      "lead:update",
      "enquiry:create",
      "enquiry:read",
      "enquiry:update",
      "quotation:create",
      "quotation:read",
      "quotation:update",
      "quotation:send",
      "booking:create",
      "booking:read",
      "task:create",
      "task:read",
      "task:update",
      "notification:read",
      "report:read",
    ],
    isSystem: true,
  },
  {
    code: "OPERATIONS",
    name: "Operations",
    description:
      "Shipment and logistics operations access covering transportation, freight, warehouse, customs, documentation, and tracking.",
    permissions: [
      "dashboard:read",
      "customer:read",
      "contact:read",
      "booking:read",
      "booking:update",
      "shipment:create",
      "shipment:read",
      "shipment:update",
      "shipment:approve",
      "air:create",
      "air:read",
      "air:update",
      "ocean:create",
      "ocean:read",
      "ocean:update",
      "land:create",
      "land:read",
      "land:update",
      "courier:create",
      "courier:read",
      "courier:update",
      "warehouse:create",
      "warehouse:read",
      "warehouse:update",
      "transport:create",
      "transport:read",
      "transport:update",
      "customs:create",
      "customs:read",
      "customs:update",
      "documentation:create",
      "documentation:read",
      "documentation:update",
      "tracking:read",
      "tracking:update",
      "task:create",
      "task:read",
      "task:update",
      "notification:read",
      "vendor:read",
      "report:read",
    ],
    isSystem: true,
  },
  {
    code: "DOCUMENTATION",
    name: "Documentation / Customs",
    description:
      "Access for shipment documentation, customs processing, compliance records, and tracking information.",
    permissions: [
      "dashboard:read",
      "customer:read",
      "contact:read",
      "booking:read",
      "shipment:read",
      "shipment:update",
      "customs:create",
      "customs:read",
      "customs:update",
      "documentation:create",
      "documentation:read",
      "documentation:update",
      "tracking:read",
      "task:create",
      "task:read",
      "task:update",
      "notification:read",
      "report:read",
    ],
    isSystem: true,
  },
  {
    code: "FINANCE",
    name: "Finance",
    description:
      "Financial access for invoices, payments, quotations, customer records, vendors, and financial reports.",
    permissions: [
      "dashboard:read",
      "customer:read",
      "contact:read",
      "quotation:read",
      "booking:read",
      "shipment:read",
      "invoice:create",
      "invoice:read",
      "invoice:update",
      "invoice:approve",
      "invoice:send",
      "payment:create",
      "payment:read",
      "payment:update",
      "payment:approve",
      "vendor:read",
      "vendor:update",
      "report:read",
      "report:export",
      "notification:read",
    ],
    isSystem: true,
  },
  {
    code: "WAREHOUSE_TRANSPORT",
    name: "Warehouse / Transport",
    description:
      "Access for warehouse operations, transport assignments, shipment handling, and delivery-related tracking.",
    permissions: [
      "dashboard:read",
      "customer:read",
      "booking:read",
      "shipment:read",
      "shipment:update",
      "warehouse:create",
      "warehouse:read",
      "warehouse:update",
      "transport:create",
      "transport:read",
      "transport:update",
      "tracking:read",
      "tracking:update",
      "task:create",
      "task:read",
      "task:update",
      "notification:read",
      "vendor:read",
      "report:read",
    ],
    isSystem: true,
  },
  {
    code: "VIEWER",
    name: "Viewer / Auditor",
    description:
      "Read-only access to operational records, reports, notifications, and audit information.",
    permissions: [
      "dashboard:read",
      "customer:read",
      "contact:read",
      "lead:read",
      "enquiry:read",
      "quotation:read",
      "booking:read",
      "shipment:read",
      "air:read",
      "ocean:read",
      "land:read",
      "courier:read",
      "warehouse:read",
      "transport:read",
      "customs:read",
      "documentation:read",
      "tracking:read",
      "task:read",
      "notification:read",
      "invoice:read",
      "payment:read",
      "vendor:read",
      "report:read",
      "report:export",
      "audit:read",
      "audit:export",
    ],
    isSystem: true,
  },
];

function getConnection(connection?: Connection): Connection {
  const resolvedConnection = connection ?? mongoose.connection;

  if (resolvedConnection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to MongoDB before running the roles seeder.",
    );
  }

  return resolvedConnection;
}

function getRoleCollection(
  connection: Connection,
): Collection<RoleRecord> {
  return connection.collection<RoleRecord>("roles");
}

async function ensureRoleIndexes(
  collection: Collection<RoleRecord>,
): Promise<void> {
  await collection.createIndex(
    { code: 1 },
    {
      unique: true,
      name: "uniq_role_code",
    },
  );

  await collection.createIndex(
    { name: 1 },
    {
      name: "idx_role_name",
    },
  );

  await collection.createIndex(
    { isActive: 1, isDeleted: 1 },
    {
      name: "idx_role_active_deleted",
    },
  );
}

function normalizePermissionCodes(permissionCodes: string[]): string[] {
  return [...new Set(permissionCodes)].sort();
}

function createRoleDefinitions(): RoleDefinition[] {
  return ROLE_DEFINITIONS.map((role) => ({
    ...role,
    permissions: normalizePermissionCodes(role.permissions),
  }));
}

async function executeRoleSeed(
  connection: Connection,
  session?: ClientSession,
): Promise<RoleSeedResult> {
  const collection = getRoleCollection(connection);

  await ensureRoleIndexes(collection);

  const definitions = createRoleDefinitions();

  const roleCodes = definitions.map((role) => role.code);

  const existingRoles = await collection
    .find(
      {
        code: {
          $in: roleCodes,
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

  const existingCodes = new Set(existingRoles.map((role) => role.code));

  const now = new Date();

  const rolesToInsert: RoleRecord[] = definitions
    .filter((role) => !existingCodes.has(role.code))
    .map((role) => ({
      _id: new mongoose.Types.ObjectId(),
      code: role.code,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      isActive: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    }));

  if (rolesToInsert.length > 0) {
    await collection.insertMany(rolesToInsert, {
      ordered: true,
      session,
    });
  }

  return {
    inserted: rolesToInsert.length,
    existing: existingRoles.length,
    total: definitions.length,
  };
}

export async function seedRoles(
  options: RoleSeedOptions = {},
): Promise<RoleSeedResult> {
  const connection = getConnection(options.connection);

  return executeRoleSeed(connection, options.session);
}

export async function runRolesSeeder(): Promise<RoleSeedResult> {
  return seedRoles();
}
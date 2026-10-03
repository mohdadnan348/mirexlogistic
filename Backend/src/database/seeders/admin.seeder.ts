import bcrypt from "bcryptjs";
import mongoose, {
  type ClientSession,
  type Connection,
  type InferSchemaType,
} from "mongoose";

import { ENV } from "../../config/env";

interface AdminSeederOptions {
  session?: ClientSession;
  connection?: Connection;
}

interface AdminSeedResult {
  created: boolean;
  userId: mongoose.Types.ObjectId;
  email: string;
}

type AdminDocument = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: string;
  roles: string[];
  permissions: string[];
  status: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ADMIN_ROLE = "SUPER_ADMIN";
const ADMIN_STATUS = "active";

function getDatabaseConnection(
  connection?: Connection,
): Connection {
  const databaseConnection = connection ?? mongoose.connection;

  if (databaseConnection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to the database before running the admin seeder.",
    );
  }

  return databaseConnection;
}

function getAdminCredentials(): {
  name: string;
  email: string;
  password: string;
} {
  const name = process.env.ADMIN_NAME?.trim() || "MirexCargo Admin";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    throw new Error(
      "ADMIN_EMAIL environment variable is required to create the initial administrator.",
    );
  }

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD environment variable is required to create the initial administrator.",
    );
  }

  if (password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD must contain at least 12 characters.",
    );
  }

  return {
    name,
    email,
    password,
  };
}

function getUsersCollection(connection: Connection) {
  return connection.collection<AdminDocument>("users");
}

async function findExistingAdmin(
  connection: Connection,
  email: string,
  session?: ClientSession,
): Promise<AdminDocument | null> {
  return getUsersCollection(connection).findOne(
    {
      email,
      isDeleted: {
        $ne: true,
      },
    },
    {
      session,
    },
  );
}

async function createAdminUser(
  connection: Connection,
  credentials: {
    name: string;
    email: string;
    password: string;
  },
  session?: ClientSession,
): Promise<AdminDocument> {
  const passwordHash = await bcrypt.hash(
    credentials.password,
    ENV.BCRYPT_SALT_ROUNDS,
  );

  const now = new Date();
  const userId = new mongoose.Types.ObjectId();

  const adminUser: AdminDocument = {
    _id: userId,
    name: credentials.name,
    email: credentials.email,
    password: passwordHash,
    role: ADMIN_ROLE,
    roles: [ADMIN_ROLE],
    permissions: ["*"],
    status: ADMIN_STATUS,
    isActive: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await getUsersCollection(connection).insertOne(
    adminUser,
    {
      session,
    },
  );

  return adminUser;
}

export async function seedAdmin(
  options: AdminSeederOptions = {},
): Promise<AdminSeedResult> {
  const connection = getDatabaseConnection(
    options.connection,
  );

  const credentials = getAdminCredentials();

  const existingAdmin = await findExistingAdmin(
    connection,
    credentials.email,
    options.session,
  );

  if (existingAdmin) {
    return {
      created: false,
      userId: existingAdmin._id,
      email: existingAdmin.email,
    };
  }

  const adminUser = await createAdminUser(
    connection,
    credentials,
    options.session,
  );

  return {
    created: true,
    userId: adminUser._id,
    email: adminUser.email,
  };
}

export async function runAdminSeeder(): Promise<AdminSeedResult> {
  return seedAdmin();
}
import mongoose, { type ClientSession, type Connection } from "mongoose";

import {
  connectDatabase,
  disconnectDatabase,
  getDatabaseConnection,
  isDatabaseConnected,
} from "../config/database";

import {
  runAdminSeeder,
  seedAdmin,
} from "./seeders/admin.seeder";

import {
  runMastersSeeder,
  seedMasters,
} from "./seeders/masters.seeder";

import {
  runPermissionsSeeder,
  seedPermissions,
} from "./seeders/permissions.seeder";

import {
  runRolesSeeder,
  seedRoles,
} from "./seeders/roles.seeder";

export interface DatabaseSeedOptions {
  connection?: Connection;
  session?: ClientSession;
}

export interface DatabaseSeedResult {
  admin: Awaited<ReturnType<typeof seedAdmin>>;
  masters: Awaited<ReturnType<typeof seedMasters>>;
  permissions: Awaited<ReturnType<typeof seedPermissions>>;
  roles: Awaited<ReturnType<typeof seedRoles>>;
}

export interface DatabaseHealth {
  connected: boolean;
  readyState: number;
  host: string | null;
  name: string | null;
}

function resolveConnection(connection?: Connection): Connection {
  return connection ?? mongoose.connection;
}

export function getConnection(): Connection {
  return getDatabaseConnection();
}

export async function connect(): Promise<Connection> {
  await connectDatabase();

  return getDatabaseConnection();
}

export async function disconnect(): Promise<void> {
  await disconnectDatabase();
}

export function isConnected(): boolean {
  return isDatabaseConnected();
}

export function getDatabaseHealth(
  connection?: Connection,
): DatabaseHealth {
  const resolvedConnection = resolveConnection(connection);

  return {
    connected: resolvedConnection.readyState === 1,
    readyState: resolvedConnection.readyState,
    host: resolvedConnection.host || null,
    name: resolvedConnection.name || null,
  };
}

export async function withDatabaseTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const connection = getDatabaseConnection();

  if (connection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to MongoDB before starting a transaction.",
    );
  }

  const session = await connection.startSession();

  try {
    let result!: T;

    await session.withTransaction(async () => {
      result = await callback(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function seedDatabase(
  options: DatabaseSeedOptions = {},
): Promise<DatabaseSeedResult> {
  const connection = resolveConnection(options.connection);

  if (connection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to MongoDB before running database seeders.",
    );
  }

  if (options.session) {
    const session = options.session;

    const admin = await seedAdmin({
      connection,
      session,
    });

    const masters = await seedMasters({
      connection,
      session,
    });

    const permissions = await seedPermissions({
      connection,
      session,
    });

    const roles = await seedRoles({
      connection,
      session,
    });

    return {
      admin,
      masters,
      permissions,
      roles,
    };
  }

  return withDatabaseTransaction(async (session) => {
    const admin = await seedAdmin({
      connection,
      session,
    });

    const masters = await seedMasters({
      connection,
      session,
    });

    const permissions = await seedPermissions({
      connection,
      session,
    });

    const roles = await seedRoles({
      connection,
      session,
    });

    return {
      admin,
      masters,
      permissions,
      roles,
    };
  });
}

export async function runDatabaseSeeders(): Promise<DatabaseSeedResult> {
  const connection = getDatabaseConnection();

  if (connection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to MongoDB before running database seeders.",
    );
  }

  return seedDatabase({ connection });
}

export {
  connectDatabase,
  disconnectDatabase,
  getDatabaseConnection,
  isDatabaseConnected,
  runAdminSeeder,
  runMastersSeeder,
  runPermissionsSeeder,
  runRolesSeeder,
  seedAdmin,
  seedMasters,
  seedPermissions,
  seedRoles,
};
import mongoose, {
  type ConnectOptions,
  type Connection,
} from "mongoose";

import { ENV } from "./env";

/**
 * MongoDB connection options.
 *
 * Mongoose 8 already enables modern MongoDB driver behaviour by default,
 * so deprecated options such as `useNewUrlParser` and `useUnifiedTopology`
 * are intentionally not used.
 */
const DATABASE_OPTIONS: ConnectOptions = {
  dbName: ENV.DB_NAME,
  maxPoolSize: ENV.DB_MAX_POOL_SIZE,
  minPoolSize: ENV.DB_MIN_POOL_SIZE,
  serverSelectionTimeoutMS: ENV.DB_SERVER_SELECTION_TIMEOUT_MS,
  socketTimeoutMS: ENV.DB_SOCKET_TIMEOUT_MS,
  family: 4,
};

/**
 * Returns the current MongoDB connection.
 *
 * Keeping this in one place allows health checks, shutdown handling and
 * future infrastructure code to reuse the same Mongoose connection.
 */
export const getDatabaseConnection = (): Connection => {
  return mongoose.connection;
};

/**
 * Establishes the MongoDB connection.
 *
 * The function is idempotent:
 * - already connected  -> returns immediately
 * - currently connecting -> waits for the existing connection
 * - disconnected -> creates a new connection
 */
export const connectDatabase = async (): Promise<void> => {
  const connectionState = mongoose.connection.readyState;

  // 1 = connected
  if (connectionState === 1) {
    return;
  }

  // 2 = connecting
  if (connectionState === 2) {
    await waitForDatabaseConnection();
    return;
  }

  try {
    await mongoose.connect(ENV.DB_URL, DATABASE_OPTIONS);

    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "MongoDB connection was not established successfully.",
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown MongoDB connection error.";

    throw new Error(`MongoDB connection failed: ${message}`);
  }
};

/**
 * Waits for an already-running Mongoose connection attempt.
 *
 * This prevents multiple application initialization paths from creating
 * competing connection attempts.
 */
const waitForDatabaseConnection = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = (): void => {
      mongoose.connection.removeListener("connected", handleConnected);
      mongoose.connection.removeListener("error", handleError);
      mongoose.connection.removeListener("disconnected", handleDisconnected);
    };

    const resolveOnce = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const rejectOnce = (error: Error): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    const handleConnected = (): void => {
      resolveOnce();
    };

    const handleError = (error: unknown): void => {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("MongoDB connection failed while connecting.");

      rejectOnce(normalizedError);
    };

    const handleDisconnected = (): void => {
      rejectOnce(
        new Error(
          "MongoDB connection was disconnected before the connection was established.",
        ),
      );
    };

    mongoose.connection.once("connected", handleConnected);
    mongoose.connection.once("error", handleError);
    mongoose.connection.once("disconnected", handleDisconnected);

    // The connection may have completed between the initial state check
    // and listener registration.
    if (mongoose.connection.readyState === 1) {
      resolveOnce();
    }
  });
};

/**
 * Gracefully closes the MongoDB connection.
 *
 * This is used during application shutdown so that active MongoDB
 * operations can finish before the process exits.
 */
export const disconnectDatabase = async (): Promise<void> => {
  const connectionState = mongoose.connection.readyState;

  // 0 = disconnected
  if (connectionState === 0) {
    return;
  }

  await mongoose.disconnect();
};

/**
 * Indicates whether MongoDB is currently connected.
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
import { createClient } from "redis";

import { ENV } from "./env";

const redisClient = createClient({
  url: ENV.REDIS_URL,
  username: ENV.REDIS_USERNAME || undefined,
  password: ENV.REDIS_PASSWORD || undefined,
  database: Number(ENV.REDIS_DB),
});

let redisConnectingPromise: Promise<void> | null = null;
let lastRedisError: Error | null = null;

redisClient.on("error", (error: Error) => {
  lastRedisError = error;
});

redisClient.on("connect", () => {
  lastRedisError = null;
});

redisClient.on("ready", () => {
  lastRedisError = null;
});

export function getRedisClient() {
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  if (redisClient.isReady) {
    return;
  }

  if (redisConnectingPromise) {
    await redisConnectingPromise;
    return;
  }

  redisConnectingPromise = (async () => {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      await redisClient.ping();

      lastRedisError = null;
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Failed to connect to Redis.");

      lastRedisError = normalizedError;

      throw normalizedError;
    } finally {
      redisConnectingPromise = null;
    }
  })();

  await redisConnectingPromise;
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.quit();
  } finally {
    redisConnectingPromise = null;
  }
}

export async function pingRedis(): Promise<boolean> {
  try {
    if (!redisClient.isReady) {
      await connectRedis();
    }

    return (await redisClient.ping()) === "PONG";
  } catch (error) {
    lastRedisError =
      error instanceof Error
        ? error
        : new Error("Redis health check failed.");

    return false;
  }
}

export function isRedisConnected(): boolean {
  return redisClient.isReady;
}

export function getLastRedisError(): Error | null {
  return lastRedisError;
}

export async function ensureRedisConnection() {
  await connectRedis();

  return redisClient;
}
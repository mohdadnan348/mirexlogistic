import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import { ENV } from "./env";

let socketServer: Server | null = null;

function getAllowedOrigins(): string[] {
  return ENV.CLIENT_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createSocketServer(
  httpServer: HttpServer,
): Server {
  if (socketServer) {
    return socketServer;
  }

  socketServer = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  socketServer.on("connection", (socket) => {
    socket.on("socket:join-user", (userId: string) => {
      if (!userId || typeof userId !== "string") {
        return;
      }

      socket.join(`user:${userId}`);
    });

    socket.on("socket:join-branch", (branchId: string) => {
      if (!branchId || typeof branchId !== "string") {
        return;
      }

      socket.join(`branch:${branchId}`);
    });

    socket.on("socket:join-shipment", (shipmentId: string) => {
      if (!shipmentId || typeof shipmentId !== "string") {
        return;
      }

      socket.join(`shipment:${shipmentId}`);
    });

    socket.on("socket:leave-user", (userId: string) => {
      if (!userId || typeof userId !== "string") {
        return;
      }

      socket.leave(`user:${userId}`);
    });

    socket.on("socket:leave-branch", (branchId: string) => {
      if (!branchId || typeof branchId !== "string") {
        return;
      }

      socket.leave(`branch:${branchId}`);
    });

    socket.on("socket:leave-shipment", (shipmentId: string) => {
      if (!shipmentId || typeof shipmentId !== "string") {
        return;
      }

      socket.leave(`shipment:${shipmentId}`);
    });
  });

  return socketServer;
}

export function getSocketServer(): Server {
  if (!socketServer) {
    throw new Error(
      "Socket.io server has not been initialized. Call createSocketServer() first.",
    );
  }

  return socketServer;
}

export function isSocketServerInitialized(): boolean {
  return socketServer !== null;
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  if (!socketServer || !userId || !event) {
    return;
  }

  socketServer.to(`user:${userId}`).emit(event, payload);
}

export function emitToBranch(
  branchId: string,
  event: string,
  payload: unknown,
): void {
  if (!socketServer || !branchId || !event) {
    return;
  }

  socketServer.to(`branch:${branchId}`).emit(event, payload);
}

export function emitToShipment(
  shipmentId: string,
  event: string,
  payload: unknown,
): void {
  if (!socketServer || !shipmentId || !event) {
    return;
  }

  socketServer.to(`shipment:${shipmentId}`).emit(event, payload);
}

export function emitToRoom(
  room: string,
  event: string,
  payload: unknown,
): void {
  if (!socketServer || !room || !event) {
    return;
  }

  socketServer.to(room).emit(event, payload);
}

export function broadcast(
  event: string,
  payload: unknown,
): void {
  if (!socketServer || !event) {
    return;
  }

  socketServer.emit(event, payload);
}

export async function closeSocketServer(): Promise<void> {
  if (!socketServer) {
    return;
  }

  const server = socketServer;
  socketServer = null;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
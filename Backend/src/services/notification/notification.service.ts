import {
  logError,
  logInfo,
} from "../../utils/logger";

export type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "SMS"
  | "WHATSAPP"
  | "PUSH";

export type NotificationPriority =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "URGENT";

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "SYSTEM"
  | "SHIPMENT"
  | "BOOKING"
  | "QUOTATION"
  | "INVOICE"
  | "PAYMENT"
  | "TASK"
  | "DOCUMENT"
  | "CUSTOMER"
  | "LEAD";

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  recipient: NotificationRecipient;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface NotificationResult {
  success: boolean;
  notificationId: string;
  channels: NotificationChannel[];
  sentAt: Date;
  errors: NotificationChannelError[];
}

export interface NotificationChannelError {
  channel: NotificationChannel;
  message: string;
}

export interface NotificationRecord {
  id: string;
  recipient: NotificationRecipient;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationQuery {
  userId: string;
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
}

export interface NotificationServiceDependencies {
  sendEmail?: (
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ) => Promise<void>;

  sendSms?: (
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ) => Promise<void>;

  sendWhatsApp?: (
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ) => Promise<void>;

  sendPush?: (
    recipient: NotificationRecipient,
    payload: NotificationPayload,
  ) => Promise<void>;

  emitInApp?: (
    recipient: NotificationRecipient,
    notification: NotificationRecord,
  ) => Promise<void>;
}

const DEFAULT_CHANNELS: NotificationChannel[] =
  ["IN_APP"];

const DEFAULT_PRIORITY: NotificationPriority =
  "NORMAL";

const DEFAULT_TYPE: NotificationType =
  "INFO";

const MAX_TITLE_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_CHANNELS = 5;

const notificationStore =
  new Map<string, NotificationRecord>();

const notificationDependencies: NotificationServiceDependencies =
  {};

function createNotificationId(): string {
  const timestamp =
    Date.now().toString(36);

  const random =
    Math.random()
      .toString(36)
      .slice(2, 12);

  return `NTF_${timestamp}_${random}`.toUpperCase();
}

function normalizeChannels(
  channels?: NotificationChannel[],
): NotificationChannel[] {
  const source =
    channels?.length
      ? channels
      : DEFAULT_CHANNELS;

  const uniqueChannels =
    Array.from(
      new Set(source),
    );

  if (
    uniqueChannels.length >
    MAX_CHANNELS
  ) {
    throw new Error(
      `A maximum of ${MAX_CHANNELS} notification channels is allowed`,
    );
  }

  return uniqueChannels;
}

function validatePayload(
  payload: NotificationPayload,
): void {
  if (
    !payload.title ||
    payload.title.trim().length === 0
  ) {
    throw new Error(
      "Notification title is required",
    );
  }

  if (
    payload.title.length >
    MAX_TITLE_LENGTH
  ) {
    throw new Error(
      `Notification title cannot exceed ${MAX_TITLE_LENGTH} characters`,
    );
  }

  if (
    !payload.message ||
    payload.message.trim().length === 0
  ) {
    throw new Error(
      "Notification message is required",
    );
  }

  if (
    payload.message.length >
    MAX_MESSAGE_LENGTH
  ) {
    throw new Error(
      `Notification message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  const recipient =
    payload.recipient;

  if (
    !recipient.userId &&
    !recipient.email &&
    !recipient.phone
  ) {
    throw new Error(
      "Notification recipient is required",
    );
  }

  if (
    payload.scheduledAt &&
    Number.isNaN(
      payload.scheduledAt.getTime(),
    )
  ) {
    throw new Error(
      "Invalid notification scheduledAt",
    );
  }

  if (
    payload.expiresAt &&
    Number.isNaN(
      payload.expiresAt.getTime(),
    )
  ) {
    throw new Error(
      "Invalid notification expiresAt",
    );
  }

  if (
    payload.scheduledAt &&
    payload.expiresAt &&
    payload.scheduledAt >=
      payload.expiresAt
  ) {
    throw new Error(
      "Notification expiresAt must be later than scheduledAt",
    );
  }
}

function createRecord(
  payload: NotificationPayload,
  channels: NotificationChannel[],
): NotificationRecord {
  const now = new Date();

  return {
    id: createNotificationId(),
    recipient: {
      ...payload.recipient,
    },
    title: payload.title.trim(),
    message: payload.message.trim(),
    type:
      payload.type ?? DEFAULT_TYPE,
    priority:
      payload.priority ??
      DEFAULT_PRIORITY,
    channels,
    ...(payload.actionUrl
      ? {
          actionUrl:
            payload.actionUrl,
        }
      : {}),
    ...(payload.metadata
      ? {
          metadata: {
            ...payload.metadata,
          },
        }
      : {}),
    createdAt: now,
    ...(payload.expiresAt
      ? {
          expiresAt:
            new Date(
              payload.expiresAt,
            ),
        }
      : {}),
  };
}

async function dispatchChannel(
  channel: NotificationChannel,
  record: NotificationRecord,
): Promise<void> {
  const payload: NotificationPayload = {
    title: record.title,
    message: record.message,
    type: record.type,
    priority: record.priority,
    channels: record.channels,
    recipient:
      record.recipient,
    ...(record.actionUrl
      ? {
          actionUrl:
            record.actionUrl,
        }
      : {}),
    ...(record.metadata
      ? {
          metadata:
            record.metadata,
        }
      : {}),
    ...(record.expiresAt
      ? {
          expiresAt:
            record.expiresAt,
        }
      : {}),
  };

  switch (channel) {
    case "IN_APP":
      if (
        notificationDependencies.emitInApp
      ) {
        await notificationDependencies.emitInApp(
          record.recipient,
          record,
        );
      }
      return;

    case "EMAIL":
      if (
        !notificationDependencies.sendEmail
      ) {
        throw new Error(
          "Email notification provider is not configured",
        );
      }

      await notificationDependencies.sendEmail(
        record.recipient,
        payload,
      );
      return;

    case "SMS":
      if (
        !notificationDependencies.sendSms
      ) {
        throw new Error(
          "SMS notification provider is not configured",
        );
      }

      await notificationDependencies.sendSms(
        record.recipient,
        payload,
      );
      return;

    case "WHATSAPP":
      if (
        !notificationDependencies.sendWhatsApp
      ) {
        throw new Error(
          "WhatsApp notification provider is not configured",
        );
      }

      await notificationDependencies.sendWhatsApp(
        record.recipient,
        payload,
      );
      return;

    case "PUSH":
      if (
        !notificationDependencies.sendPush
      ) {
        throw new Error(
          "Push notification provider is not configured",
        );
      }

      await notificationDependencies.sendPush(
        record.recipient,
        payload,
      );
      return;

    default: {
      const exhaustiveChannel: never =
        channel;

      throw new Error(
        `Unsupported notification channel: ${String(
          exhaustiveChannel,
        )}`,
      );
    }
  }
}

export function configureNotificationService(
  dependencies: NotificationServiceDependencies,
): void {
  Object.assign(
    notificationDependencies,
    dependencies,
  );

  logInfo(
    "Notification service configured",
    {
      providers: Object.keys(
        notificationDependencies,
      ),
    },
  );
}

export async function sendNotification(
  payload: NotificationPayload,
): Promise<NotificationResult> {
  validatePayload(payload);

  const channels =
    normalizeChannels(
      payload.channels,
    );

  const record =
    createRecord(
      payload,
      channels,
    );

  notificationStore.set(
    record.id,
    record,
  );

  const errors: NotificationChannelError[] =
    [];

  for (const channel of channels) {
    try {
      await dispatchChannel(
        channel,
        record,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown notification error";

      errors.push({
        channel,
        message,
      });

      logError(
        "Notification channel delivery failed",
        {
          notificationId:
            record.id,
          channel,
          error: message,
        },
      );
    }
  }

  const successfulChannels =
    channels.filter(
      (channel) =>
        !errors.some(
          (error) =>
            error.channel ===
            channel,
        ),
    );

  const success =
    successfulChannels.length > 0;

  if (success) {
    logInfo(
      "Notification dispatched",
      {
        notificationId:
          record.id,
        channels:
          successfulChannels,
        failedChannels:
          errors.map(
            (error) =>
              error.channel,
          ),
      },
    );
  }

  return {
    success,
    notificationId:
      record.id,
    channels:
      successfulChannels,
    sentAt: new Date(),
    errors,
  };
}

export async function sendInAppNotification(
  payload: Omit<
    NotificationPayload,
    "channels"
  >,
): Promise<NotificationResult> {
  return sendNotification({
    ...payload,
    channels: ["IN_APP"],
  });
}

export async function sendEmailNotification(
  payload: Omit<
    NotificationPayload,
    "channels"
  >,
): Promise<NotificationResult> {
  return sendNotification({
    ...payload,
    channels: ["EMAIL"],
  });
}

export async function sendSmsNotification(
  payload: Omit<
    NotificationPayload,
    "channels"
  >,
): Promise<NotificationResult> {
  return sendNotification({
    ...payload,
    channels: ["SMS"],
  });
}

export async function sendWhatsAppNotification(
  payload: Omit<
    NotificationPayload,
    "channels"
  >,
): Promise<NotificationResult> {
  return sendNotification({
    ...payload,
    channels: ["WHATSAPP"],
  });
}

export async function sendMultiChannelNotification(
  payload: NotificationPayload,
  channels: NotificationChannel[],
): Promise<NotificationResult> {
  return sendNotification({
    ...payload,
    channels,
  });
}

export function getNotification(
  notificationId: string,
): NotificationRecord | undefined {
  const notification =
    notificationStore.get(
      notificationId,
    );

  if (!notification) {
    return undefined;
  }

  return {
    ...notification,
    recipient: {
      ...notification.recipient,
    },
    ...(notification.metadata
      ? {
          metadata: {
            ...notification.metadata,
          },
        }
      : {}),
  };
}

export function markNotificationAsRead(
  notificationId: string,
): NotificationRecord | undefined {
  const notification =
    notificationStore.get(
      notificationId,
    );

  if (!notification) {
    return undefined;
  }

  notification.readAt =
    new Date();

  notificationStore.set(
    notificationId,
    notification,
  );

  return {
    ...notification,
  };
}

export function deleteNotification(
  notificationId: string,
): boolean {
  return notificationStore.delete(
    notificationId,
  );
}

export function listNotifications(
  query: NotificationQuery,
): NotificationRecord[] {
  const limit = Math.min(
    Math.max(
      Number(query.limit ?? 20),
      1,
    ),
    100,
  );

  const notifications =
    Array.from(
      notificationStore.values(),
    )
      .filter(
        (notification) =>
          notification.recipient
            .userId ===
          query.userId,
      )
      .filter(
        (notification) => {
          if (!query.unreadOnly) {
            return true;
          }

          return !notification.readAt;
        },
      )
      .filter(
        (notification) => {
          if (!query.type) {
            return true;
          }

          return (
            notification.type ===
            query.type
          );
        },
      )
      .filter(
        (notification) => {
          if (
            !notification.expiresAt
          ) {
            return true;
          }

          return (
            notification.expiresAt >
            new Date()
          );
        },
      )
      .sort(
        (a, b) =>
          b.createdAt.getTime() -
          a.createdAt.getTime(),
      );

  return notifications
    .slice(0, limit)
    .map(
      (notification) => ({
        ...notification,
        recipient: {
          ...notification.recipient,
        },
        ...(notification.metadata
          ? {
              metadata: {
                ...notification.metadata,
              },
            }
          : {}),
      }),
    );
}

export function getUnreadNotificationCount(
  userId: string,
): number {
  return Array.from(
    notificationStore.values(),
  ).filter(
    (notification) =>
      notification.recipient
        .userId === userId &&
      !notification.readAt &&
      (!notification.expiresAt ||
        notification.expiresAt >
          new Date()),
  ).length;
}

export function markAllNotificationsAsRead(
  userId: string,
): number {
  let updatedCount = 0;

  for (const notification of notificationStore.values()) {
    if (
      notification.recipient
        .userId !== userId ||
      notification.readAt
    ) {
      continue;
    }

    notification.readAt =
      new Date();

    notificationStore.set(
      notification.id,
      notification,
    );

    updatedCount += 1;
  }

  return updatedCount;
}

export function clearExpiredNotifications(): number {
  const now = Date.now();
  let deletedCount = 0;

  for (const [
    notificationId,
    notification,
  ] of notificationStore.entries()) {
    if (
      notification.expiresAt &&
      notification.expiresAt.getTime() <=
        now
    ) {
      notificationStore.delete(
        notificationId,
      );

      deletedCount += 1;
    }
  }

  return deletedCount;
}
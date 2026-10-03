import {
  Queue,
  type JobsOptions,
  type Job,
  type QueueOptions,
} from "bullmq";

import { ENV } from "../../config/env";
import {
  logError,
  logInfo,
} from "../../utils/logger";

export type QueueName =
  | "default"
  | "email"
  | "notification"
  | "sms"
  | "whatsapp"
  | "document"
  | "report"
  | "shipment";

export interface QueueJobData
  extends Record<string, unknown> {
  type: string;
}

export interface AddJobOptions {
  jobId?: string;
  delay?: number;
  attempts?: number;
  backoff?: number | {
    type: "fixed" | "exponential";
    delay: number;
  };
  removeOnComplete?:
    | boolean
    | number;
  removeOnFail?:
    | boolean
    | number;
  priority?: number;
  lifo?: boolean;
}

export interface QueueServiceStatus {
  initialized: boolean;
  connected: boolean;
  queues: string[];
}

const QUEUE_NAMES: QueueName[] = [
  "default",
  "email",
  "notification",
  "sms",
  "whatsapp",
  "document",
  "report",
  "shipment",
];

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

const queues = new Map<
  QueueName,
  Queue<QueueJobData>
>();

let initialized = false;

function getRedisConnectionOptions(): QueueOptions["connection"] {
  const connection: Record<
    string,
    unknown
  > = {
    host:
      ENV.REDIS_HOST || "127.0.0.1",
    port:
      Number(ENV.REDIS_PORT) || 6379,
    db:
      Number(ENV.REDIS_DB) || 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (ENV.REDIS_USERNAME) {
    connection.username =
      ENV.REDIS_USERNAME;
  }

  if (ENV.REDIS_PASSWORD) {
    connection.password =
      ENV.REDIS_PASSWORD;
  }

  return connection as QueueOptions["connection"];
}

function createQueue(
  name: QueueName,
): Queue<QueueJobData> {
  const queue =
    new Queue<QueueJobData>(
      `mirexcargo:${name}`,
      {
        connection:
          getRedisConnectionOptions(),
        defaultJobOptions:
          DEFAULT_JOB_OPTIONS,
      },
    );

  queue.on(
    "error",
    (error) => {
      logError(
        "BullMQ queue error",
        {
          queue: name,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );
    },
  );

  return queue;
}

export function initializeQueues(): void {
  if (initialized) {
    return;
  }

  for (const name of QUEUE_NAMES) {
    queues.set(
      name,
      createQueue(name),
    );
  }

  initialized = true;

  logInfo(
    "BullMQ queues initialized",
    {
      queues: QUEUE_NAMES,
    },
  );
}

export function getQueue(
  name: QueueName,
): Queue<QueueJobData> {
  if (!initialized) {
    initializeQueues();
  }

  const queue = queues.get(name);

  if (!queue) {
    throw new Error(
      `Queue "${name}" is not initialized`,
    );
  }

  return queue;
}

export function getQueueName(
  name: QueueName,
): string {
  return `mirexcargo:${name}`;
}

export async function addJob<
  T extends QueueJobData = QueueJobData,
>(
  queueName: QueueName,
  jobName: string,
  data: T,
  options: AddJobOptions = {},
): Promise<Job<T>> {
  const queue =
    getQueue(queueName);

  const jobOptions: JobsOptions = {
    ...DEFAULT_JOB_OPTIONS,

    ...(options.jobId
      ? {
          jobId: options.jobId,
        }
      : {}),

    ...(options.delay !== undefined
      ? {
          delay: options.delay,
        }
      : {}),

    ...(options.attempts !== undefined
      ? {
          attempts:
            options.attempts,
        }
      : {}),

    ...(options.backoff !== undefined
      ? {
          backoff:
            options.backoff,
        }
      : {}),

    ...(options.removeOnComplete !==
    undefined
      ? {
          removeOnComplete:
            options.removeOnComplete,
        }
      : {}),

    ...(options.removeOnFail !== undefined
      ? {
          removeOnFail:
            options.removeOnFail,
        }
      : {}),

    ...(options.priority !== undefined
      ? {
          priority:
            options.priority,
        }
      : {}),

    ...(options.lifo !== undefined
      ? {
          lifo: options.lifo,
        }
      : {}),
  };

  const job =
    await queue.add(
      jobName,
      data,
      jobOptions,
    );

  logInfo(
    "Queue job added",
    {
      queue: queueName,
      jobName,
      jobId: job.id,
    },
  );

  return job as Job<T>;
}

export async function addEmailJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "email",
    jobName,
    data,
    options,
  );
}

export async function addNotificationJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "notification",
    jobName,
    data,
    options,
  );
}

export async function addSmsJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "sms",
    jobName,
    data,
    options,
  );
}

export async function addWhatsAppJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "whatsapp",
    jobName,
    data,
    options,
  );
}

export async function addDocumentJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "document",
    jobName,
    data,
    options,
  );
}

export async function addReportJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "report",
    jobName,
    data,
    options,
  );
}

export async function addShipmentJob(
  jobName: string,
  data: QueueJobData,
  options?: AddJobOptions,
): Promise<Job<QueueJobData>> {
  return addJob(
    "shipment",
    jobName,
    data,
    options,
  );
}

export async function getJob(
  queueName: QueueName,
  jobId: string,
): Promise<Job<QueueJobData> | undefined> {
  const queue =
    getQueue(queueName);

  return queue.getJob(jobId);
}

export async function removeJob(
  queueName: QueueName,
  jobId: string,
): Promise<void> {
  const queue =
    getQueue(queueName);

  const job =
    await queue.getJob(jobId);

  if (!job) {
    return;
  }

  await job.remove();

  logInfo(
    "Queue job removed",
    {
      queue: queueName,
      jobId,
    },
  );
}

export async function retryJob(
  queueName: QueueName,
  jobId: string,
): Promise<void> {
  const queue =
    getQueue(queueName);

  const job =
    await queue.getJob(jobId);

  if (!job) {
    throw new Error(
      `Job "${jobId}" not found in queue "${queueName}"`,
    );
  }

  await job.retry(
    "failed",
  );

  logInfo(
    "Queue job retried",
    {
      queue: queueName,
      jobId,
    },
  );
}

export async function pauseQueue(
  queueName: QueueName,
): Promise<void> {
  const queue =
    getQueue(queueName);

  await queue.pause();

  logInfo(
    "Queue paused",
    {
      queue: queueName,
    },
  );
}

export async function resumeQueue(
  queueName: QueueName,
): Promise<void> {
  const queue =
    getQueue(queueName);

  await queue.resume();

  logInfo(
    "Queue resumed",
    {
      queue: queueName,
    },
  );
}

export async function getQueueCounts(
  queueName: QueueName,
) {
  const queue =
    getQueue(queueName);

  return queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  );
}

export async function cleanQueue(
  queueName: QueueName,
  graceMs: number,
  limit = 1000,
): Promise<void> {
  if (
    !Number.isFinite(graceMs) ||
    graceMs < 0
  ) {
    throw new Error(
      "Queue cleanup grace period must be a non-negative number",
    );
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1
  ) {
    throw new Error(
      "Queue cleanup limit must be a positive integer",
    );
  }

  const queue =
    getQueue(queueName);

  await queue.clean(
    graceMs,
    limit,
    "completed",
  );

  await queue.clean(
    graceMs,
    limit,
    "failed",
  );

  logInfo(
    "Queue cleaned",
    {
      queue: queueName,
      graceMs,
      limit,
    },
  );
}

export async function obliterateQueue(
  queueName: QueueName,
): Promise<void> {
  const queue =
    getQueue(queueName);

  await queue.obliterate({
    force: true,
  });

  logInfo(
    "Queue obliterated",
    {
      queue: queueName,
    },
  );
}

export async function closeQueue(
  queueName: QueueName,
): Promise<void> {
  const queue =
    queues.get(queueName);

  if (!queue) {
    return;
  }

  await queue.close();

  queues.delete(queueName);

  logInfo(
    "Queue closed",
    {
      queue: queueName,
    },
  );
}

export async function closeAllQueues(): Promise<void> {
  const queueEntries =
    Array.from(
      queues.entries(),
    );

  for (const [
    name,
    queue,
  ] of queueEntries) {
    try {
      await queue.close();
    } catch (error) {
      logError(
        "Failed to close queue",
        {
          queue: name,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );
    }
  }

  queues.clear();
  initialized = false;

  logInfo(
    "All BullMQ queues closed",
  );
}

export async function checkQueueHealth(): Promise<QueueServiceStatus> {
  if (!initialized) {
    return {
      initialized: false,
      connected: false,
      queues: [],
    };
  }

  const queueNames =
    Array.from(queues.keys());

  try {
    for (const queue of queues.values()) {
      await queue.getJobCounts(
        "waiting",
        "active",
      );
    }

    return {
      initialized: true,
      connected: true,
      queues: queueNames,
    };
  } catch (error) {
    logError(
      "BullMQ health check failed",
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return {
      initialized: true,
      connected: false,
      queues: queueNames,
    };
  }
}

export function isQueueServiceInitialized(): boolean {
  return initialized;
}
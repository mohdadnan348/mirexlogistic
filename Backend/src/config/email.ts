import nodemailer, {
  type SendMailOptions,
  type Transporter,
} from "nodemailer";

import { ENV } from "./env";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: SendMailOptions["attachments"];
}

let transporter: Transporter | null = null;

/**
 * Returns the normalized SMTP configuration from the central ENV object.
 */
export const getEmailConfig = (): EmailConfig => ({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: ENV.SMTP_SECURE,
  user: ENV.SMTP_USER,
  password: ENV.SMTP_PASSWORD,
  fromName: ENV.SMTP_FROM_NAME,
  fromEmail: ENV.SMTP_FROM_EMAIL,
});

/**
 * Creates the Nodemailer transporter only when email credentials
 * are configured.
 *
 * SMTP authentication is optional during local development because
 * ENABLE_EMAIL can be disabled in .env.
 */
const createTransporter = (): Transporter | null => {
  if (!ENV.ENABLE_EMAIL) {
    return null;
  }

  const config = getEmailConfig();

  if (!config.host || !config.user || !config.password || !config.fromEmail) {
    throw new Error(
      "Email is enabled, but SMTP configuration is incomplete. " +
        "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM_EMAIL.",
    );
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
};

/**
 * Returns the shared Nodemailer transporter.
 *
 * A singleton transporter is used so SMTP connections can be reused
 * instead of creating a new connection for every email.
 */
export const getEmailTransporter = (): Transporter => {
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    throw new Error(
      "Email service is disabled. Set ENABLE_EMAIL=true to send emails.",
    );
  }

  return transporter;
};

/**
 * Verifies the SMTP connection.
 *
 * This is useful during application startup and health checks.
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  if (!ENV.ENABLE_EMAIL) {
    return false;
  }

  const emailTransporter = getEmailTransporter();

  try {
    await emailTransporter.verify();
    return true;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown SMTP verification error.";

    throw new Error(`SMTP connection verification failed: ${message}`);
  }
};

/**
 * Sends an email through the configured SMTP provider.
 *
 * Higher-level email templates/services should use this configuration
 * instead of creating their own Nodemailer transporter.
 */
export const sendEmail = async (
  options: SendEmailOptions,
): Promise<{ messageId: string }> => {
  const emailTransporter = getEmailTransporter();
  const config = getEmailConfig();

  if (!options.text && !options.html) {
    throw new Error(
      "Email content is required. Provide either text or html.",
    );
  }

  const message: SendMailOptions = {
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    cc: options.cc,
    bcc: options.bcc,
    replyTo: options.replyTo,
    attachments: options.attachments,
  };

  try {
    const result = await emailTransporter.sendMail(message);

    return {
      messageId: result.messageId,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown email sending error.";

    throw new Error(`Email delivery failed: ${message}`);
  }
};

/**
 * Closes the SMTP transporter during graceful application shutdown.
 */
export const closeEmailTransporter = async (): Promise<void> => {
  if (!transporter) {
    return;
  }

  transporter.close();
  transporter = null;
};
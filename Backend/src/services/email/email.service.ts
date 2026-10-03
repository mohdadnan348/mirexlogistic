import {
  getEmailTransporter,
} from "../../config/email";
import { ENV } from "../../config/env";
import {
  logError,
  logInfo,
} from "../../utils/logger";

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface SendEmailOptions {
  to:
    | string
    | EmailAddress
    | Array<string | EmailAddress>;
  subject: string;
  text?: string;
  html?: string;
  cc?:
    | string
    | EmailAddress
    | Array<string | EmailAddress>;
  bcc?:
    | string
    | EmailAddress
    | Array<string | EmailAddress>;
  replyTo?: string | EmailAddress;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response?: string;
}

export interface EmailTemplateData {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined;
}

export interface SendTemplateEmailOptions
  extends Omit<
    SendEmailOptions,
    "html" | "text"
  > {
  template: string;
  data?: EmailTemplateData;
  text?: string;
}

export interface EmailVerificationResult {
  verified: boolean;
  error?: string;
}

function normalizeEmailAddress(
  address: string | EmailAddress,
): string {
  if (typeof address === "string") {
    const normalized = address.trim();

    if (!normalized) {
      throw new Error(
        "Email address is required",
      );
    }

    return normalized;
  }

  const email = address.email?.trim();

  if (!email) {
    throw new Error(
      "Email address is required",
    );
  }

  const name = address.name?.trim();

  if (!name) {
    return email;
  }

  return `"${name.replace(
    /"/g,
    '\\"',
  )}" <${email}>`;
}

function normalizeRecipients(
  recipients:
    | string
    | EmailAddress
    | Array<string | EmailAddress>,
): string | string[] {
  if (Array.isArray(recipients)) {
    if (recipients.length === 0) {
      throw new Error(
        "At least one email recipient is required",
      );
    }

    return recipients.map(
      normalizeEmailAddress,
    );
  }

  return normalizeEmailAddress(
    recipients,
  );
}

function escapeHtml(
  value: string,
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTemplateValue(
  data: EmailTemplateData,
  path: string,
): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (current, segment) => {
        if (
          current === null ||
          current === undefined
        ) {
          return undefined;
        }

        if (
          typeof current !== "object"
        ) {
          return undefined;
        }

        return (
          current as Record<
            string,
            unknown
          >
        )[segment];
      },
      data,
    );
}

function renderTemplate(
  template: string,
  data: EmailTemplateData = {},
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_match, key: string) => {
      const value =
        getTemplateValue(data, key);

      if (
        value === null ||
        value === undefined
      ) {
        return "";
      }

      return escapeHtml(
        String(value),
      );
    },
  );
}

function validateSubject(
  subject: string,
): void {
  if (
    typeof subject !== "string" ||
    subject.trim().length === 0
  ) {
    throw new Error(
      "Email subject is required",
    );
  }

  if (subject.length > 998) {
    throw new Error(
      "Email subject is too long",
    );
  }
}

function validateContent(
  text?: string,
  html?: string,
): void {
  const hasText =
    typeof text === "string" &&
    text.trim().length > 0;

  const hasHtml =
    typeof html === "string" &&
    html.trim().length > 0;

  if (!hasText && !hasHtml) {
    throw new Error(
      "Email must contain text or HTML content",
    );
  }
}

function normalizeAttachments(
  attachments?: EmailAttachment[],
): EmailAttachment[] | undefined {
  if (
    !attachments ||
    attachments.length === 0
  ) {
    return undefined;
  }

  return attachments.map(
    (attachment) => {
      if (
        !attachment.filename?.trim()
      ) {
        throw new Error(
          "Email attachment filename is required",
        );
      }

      if (
        attachment.content ===
          undefined &&
        !attachment.path
      ) {
        throw new Error(
          `Attachment "${attachment.filename}" must contain content or path`,
        );
      }

      return {
        ...attachment,
        filename:
          attachment.filename.trim(),
      };
    },
  );
}

function getDefaultFrom(): string {
  const email =
    ENV.SMTP_FROM_EMAIL?.trim();

  if (!email) {
    throw new Error(
      "SMTP_FROM_EMAIL is not configured",
    );
  }

  const name =
    ENV.SMTP_FROM_NAME?.trim();

  if (!name) {
    return email;
  }

  return `"${name.replace(
    /"/g,
    '\\"',
  )}" <${email}>`;
}

function normalizeResponseValue(
  value: unknown,
): string | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  return String(value);
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<EmailResult> {
  validateSubject(options.subject);

  validateContent(
    options.text,
    options.html,
  );

  const transporter =
    getEmailTransporter();

  const info =
    await transporter.sendMail({
      from: getDefaultFrom(),

      to: normalizeRecipients(
        options.to,
      ),

      subject:
        options.subject.trim(),

      ...(options.text
        ? {
            text: options.text,
          }
        : {}),

      ...(options.html
        ? {
            html: options.html,
          }
        : {}),

      ...(options.cc
        ? {
            cc: normalizeRecipients(
              options.cc,
            ),
          }
        : {}),

      ...(options.bcc
        ? {
            bcc: normalizeRecipients(
              options.bcc,
            ),
          }
        : {}),

      ...(options.replyTo
        ? {
            replyTo:
              normalizeEmailAddress(
                options.replyTo,
              ),
          }
        : {}),

      ...(options.attachments
        ? {
            attachments:
              normalizeAttachments(
                options.attachments,
              ),
          }
        : {}),

      ...(options.headers
        ? {
            headers: options.headers,
          }
        : {}),
    });

  const accepted = Array.isArray(
    info.accepted,
  )
    ? info.accepted.map(String)
    : [];

  const rejected = Array.isArray(
    info.rejected,
  )
    ? info.rejected.map(String)
    : [];

  const response =
    normalizeResponseValue(
      info.response,
    );

  logInfo(
    "Email sent successfully",
    {
      messageId: info.messageId,
      subject: options.subject,
      accepted,
      rejected,
    },
  );

  return {
    messageId: info.messageId,
    accepted,
    rejected,
    ...(response
      ? {
          response,
        }
      : {}),
  };
}

export async function sendTextEmail(
  options: Omit<
    SendEmailOptions,
    "html"
  > & {
    text: string;
  },
): Promise<EmailResult> {
  return sendEmail({
    ...options,
    text: options.text,
  });
}

export async function sendHtmlEmail(
  options: Omit<
    SendEmailOptions,
    "text"
  > & {
    html: string;
  },
): Promise<EmailResult> {
  return sendEmail({
    ...options,
    html: options.html,
  });
}

export async function sendTemplateEmail(
  options: SendTemplateEmailOptions,
): Promise<EmailResult> {
  const html =
    renderTemplate(
      options.template,
      options.data,
    );

  const text =
    options.text
      ? renderTemplate(
          options.text,
          options.data,
        )
      : undefined;

  return sendEmail({
    to: options.to,
    subject: options.subject,

    ...(text
      ? {
          text,
        }
      : {}),

    html,

    ...(options.cc
      ? {
          cc: options.cc,
        }
      : {}),

    ...(options.bcc
      ? {
          bcc: options.bcc,
        }
      : {}),

    ...(options.replyTo
      ? {
          replyTo:
            options.replyTo,
        }
      : {}),

    ...(options.attachments
      ? {
          attachments:
            options.attachments,
        }
      : {}),

    ...(options.headers
      ? {
          headers: options.headers,
        }
      : {}),
  });
}

export async function verifyEmailService(): Promise<EmailVerificationResult> {
  try {
    const transporter =
      getEmailTransporter();

    await transporter.verify();

    logInfo(
      "Email service verified successfully",
    );

    return {
      verified: true,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown email service error";

    logError(
      "Email service verification failed",
      {
        error: message,
      },
    );

    return {
      verified: false,
      error: message,
    };
  }
}
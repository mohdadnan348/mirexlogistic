import {
  sendWhatsAppTextMessage as sendConfiguredWhatsAppTextMessage,
  sendWhatsAppTemplateMessage as sendConfiguredWhatsAppTemplateMessage,
  verifyWhatsAppConnection,
} from "../../config/whatsapp";

export type WhatsAppMessageType = "text" | "template";

export interface WhatsAppRecipient {
  phone: string;
  name?: string;
}

export interface SendWhatsAppTextOptions {
  recipient: WhatsAppRecipient;
  message: string;
}

export interface SendWhatsAppTemplateOptions {
  recipient: WhatsAppRecipient;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

export interface WhatsAppResult {
  success: boolean;
  messageId: string;
  phone: string;
  type: WhatsAppMessageType;
  error?: string;
}

export interface WhatsAppVerificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface WhatsAppTemplateData {
  [key: string]: string | number | boolean | null | undefined;
}

function normalizePhone(phone: string): string {
  const normalized = phone.trim().replace(/[^\d+]/g, "");

  if (normalized.startsWith("+")) {
    return normalized.substring(1);
  }

  if (normalized.startsWith("00")) {
    return normalized.substring(2);
  }

  if (normalized.length === 10) {
    return `91${normalized}`;
  }

  return normalized;
}

function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhone(phone);

  return /^\d{8,15}$/.test(normalized);
}

function normalizeMessage(message: string): string {
  return message.trim();
}

function extractMessageId(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "";
  }

  const data = result as Record<string, unknown>;

  if (typeof data.messageId === "string") {
    return data.messageId;
  }

  if (typeof data.id === "string") {
    return data.id;
  }

  if (typeof data.messages === "object" && data.messages !== null) {
    const messages = data.messages as Record<string, unknown>;

    if (typeof messages.id === "string") {
      return messages.id;
    }
  }

  return "";
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const data = error as Record<string, unknown>;

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof data.error === "string") {
      return data.error;
    }
  }

  return "WhatsApp message could not be sent";
}

function renderTemplate(
  template: string,
  data: WhatsAppTemplateData,
): string {
  return template.replace(
    /\{\{\s*([^}]+?)\s*\}\}/g,
    (_match: string, key: string): string => {
      const value = data[key.trim()];

      if (value === null || value === undefined) {
        return "";
      }

      return String(value);
    },
  );
}

export async function sendWhatsAppTextMessage(
  options: SendWhatsAppTextOptions,
): Promise<WhatsAppResult> {
  const phone = normalizePhone(options.recipient.phone);
  const message = normalizeMessage(options.message);

  if (!isValidPhoneNumber(phone)) {
    return {
      success: false,
      messageId: "",
      phone,
      type: "text",
      error: "Invalid WhatsApp phone number",
    };
  }

  if (!message) {
    return {
      success: false,
      messageId: "",
      phone,
      type: "text",
      error: "WhatsApp message cannot be empty",
    };
  }

  try {
    const providerResult = await sendConfiguredWhatsAppTextMessage({
      to: phone,
      message,
    });

    return {
      success: true,
      messageId: extractMessageId(providerResult),
      phone,
      type: "text",
    };
  } catch (error) {
    return {
      success: false,
      messageId: "",
      phone,
      type: "text",
      error: extractErrorMessage(error),
    };
  }
}

export async function sendWhatsAppTemplateMessageService(
  options: SendWhatsAppTemplateOptions,
): Promise<WhatsAppResult> {
  const phone = normalizePhone(options.recipient.phone);
  const templateName = options.templateName.trim();

  if (!isValidPhoneNumber(phone)) {
    return {
      success: false,
      messageId: "",
      phone,
      type: "template",
      error: "Invalid WhatsApp phone number",
    };
  }

  if (!templateName) {
    return {
      success: false,
      messageId: "",
      phone,
      type: "template",
      error: "WhatsApp template name is required",
    };
  }

  try {
    const providerResult = await sendConfiguredWhatsAppTemplateMessage({
      to: phone,
      templateName,
      languageCode: options.languageCode ?? "en_US",
      parameters: options.parameters ?? [],
    });

    return {
      success: true,
      messageId: extractMessageId(providerResult),
      phone,
      type: "template",
    };
  } catch (error) {
    return {
      success: false,
      messageId: "",
      phone,
      type: "template",
      error: extractErrorMessage(error),
    };
  }
}

export async function sendWhatsAppTemplateWithData(
  recipient: WhatsAppRecipient,
  templateName: string,
  data: WhatsAppTemplateData,
  languageCode = "en_US",
): Promise<WhatsAppResult> {
  const renderedValues = Object.values(data).map((value) => {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  });

  return sendWhatsAppTemplateMessageService({
    recipient,
    templateName,
    languageCode,
    parameters: renderedValues,
  });
}

export async function sendShipmentUpdateWhatsApp(options: {
  recipient: WhatsAppRecipient;
  shipmentNumber: string;
  status: string;
  location?: string;
}): Promise<WhatsAppResult> {
  const locationText = options.location
    ? `\nLocation: ${options.location}`
    : "";

  const message = [
    `Shipment Update`,
    ``,
    `Shipment: ${options.shipmentNumber}`,
    `Status: ${options.status}`,
    locationText,
  ]
    .join("\n")
    .trim();

  return sendWhatsAppTextMessage({
    recipient: options.recipient,
    message,
  });
}

export async function sendDeliveryNotificationWhatsApp(options: {
  recipient: WhatsAppRecipient;
  shipmentNumber: string;
  deliveryDate?: string;
}): Promise<WhatsAppResult> {
  const deliveryDateText = options.deliveryDate
    ? `\nDelivery Date: ${options.deliveryDate}`
    : "";

  const message = [
    `Delivery Notification`,
    ``,
    `Shipment: ${options.shipmentNumber}`,
    `Your shipment has been marked as delivered.`,
    deliveryDateText,
  ]
    .join("\n")
    .trim();

  return sendWhatsAppTextMessage({
    recipient: options.recipient,
    message,
  });
}

export async function sendWhatsAppOtp(options: {
  recipient: WhatsAppRecipient;
  otp: string;
  expiresInMinutes?: number;
}): Promise<WhatsAppResult> {
  const expiresInMinutes = options.expiresInMinutes ?? 10;

  const message = [
    `Your MirexCargo verification code is: ${options.otp}`,
    ``,
    `This OTP will expire in ${expiresInMinutes} minutes.`,
    `Do not share this code with anyone.`,
  ].join("\n");

  return sendWhatsAppTextMessage({
    recipient: options.recipient,
    message,
  });
}

export async function verifyWhatsAppService(): Promise<WhatsAppVerificationResult> {
  try {
    const result = await verifyWhatsAppConnection();

    if (result === true) {
      return {
        success: true,
        message: "WhatsApp connection verified successfully",
      };
    }

    if (result && typeof result === "object") {
      const data = result as Record<string, unknown>;

      if (data.success === true) {
        return {
          success: true,
          message:
            typeof data.message === "string"
              ? data.message
              : "WhatsApp connection verified successfully",
        };
      }

      return {
        success: false,
        error:
          typeof data.error === "string"
            ? data.error
            : "WhatsApp connection verification failed",
      };
    }

    return {
      success: true,
      message: "WhatsApp connection verified successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

export function isValidWhatsAppPhone(phone: string): boolean {
  return isValidPhoneNumber(phone);
}

export function getWhatsAppCharacterCount(message: string): number {
  return [...message].length;
}

export function canSendWhatsAppText(message: string): boolean {
  const normalizedMessage = normalizeMessage(message);

  return normalizedMessage.length > 0 && normalizedMessage.length <= 4096;
}

export function buildWhatsAppTemplateParameters(
  template: string,
  data: WhatsAppTemplateData,
): string[] {
  const renderedTemplate = renderTemplate(template, data);

  return renderedTemplate
    .split(/\s+/)
    .filter((value) => value.length > 0);
}
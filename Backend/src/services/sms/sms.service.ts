import {
  sendSms as sendConfiguredSms,
  verifySmsConnection,
} from "../../config/sms";

export interface SmsRecipient {
  phone: string;
  name?: string;
}

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  statusCallback?: string;
}

export interface SmsResult {
  success: boolean;
  messageId: string;
  to: string;
  status?: string;
  provider: "twilio";
  error?: string;
}

export interface SmsTemplateData {
  [key: string]: string | number | boolean | null | undefined;
}

export interface SendTemplateSmsOptions {
  to: string;
  template: string;
  data?: SmsTemplateData;
}

export interface SmsVerificationResult {
  success: boolean;
  message: string;
}

function normalizePhone(phone: string): string {
  const normalized = phone.trim().replace(/[\s()-]/g, "");

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error(
      "Invalid phone number. Phone number must be in E.164 format.",
    );
  }

  return normalized;
}

function normalizeBody(body: string): string {
  const normalized = body.trim();

  if (!normalized) {
    throw new Error("SMS body is required");
  }

  if (normalized.length > 1600) {
    throw new Error("SMS body cannot exceed 1600 characters");
  }

  return normalized;
}

function renderTemplate(
  template: string,
  data: SmsTemplateData = {},
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (match, key: string) => {
      const value = data[key];

      if (value === undefined || value === null) {
        return match;
      }

      return String(value);
    },
  );
}

function extractMessageId(result: unknown): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "messageId" in result &&
    typeof (result as { messageId?: unknown }).messageId === "string" &&
    (result as { messageId: string }).messageId.trim()
  ) {
    return (result as { messageId: string }).messageId;
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "sid" in result &&
    typeof (result as { sid?: unknown }).sid === "string" &&
    (result as { sid: string }).sid.trim()
  ) {
    return (result as { sid: string }).sid;
  }

  throw new Error("SMS provider did not return a valid message ID");
}

function extractStatus(result: unknown): string | undefined {
  if (
    typeof result === "object" &&
    result !== null &&
    "status" in result &&
    typeof (result as { status?: unknown }).status === "string"
  ) {
    return (result as { status: string }).status;
  }

  return undefined;
}

export async function sendSms(
  options: SendSmsOptions,
): Promise<SmsResult> {
  const to = normalizePhone(options.to);
  const body = normalizeBody(options.body);

  try {
    const providerResult = await sendConfiguredSms({
      to,
      body,
    });

    const messageId = extractMessageId(providerResult);
    const status = extractStatus(providerResult);

    return {
      success: true,
      messageId,
      to,
      status,
      provider: "twilio",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send SMS";

    return {
      success: false,
      messageId: "",
      to,
      provider: "twilio",
      error: message,
    };
  }
}

export async function sendTextSms(
  to: string,
  body: string,
): Promise<SmsResult> {
  return sendSms({
    to,
    body,
  });
}

export async function sendTemplateSms(
  options: SendTemplateSmsOptions,
): Promise<SmsResult> {
  const body = renderTemplate(options.template, options.data);

  return sendSms({
    to: options.to,
    body,
  });
}

export async function sendOtpSms(
  to: string,
  otp: string,
  expiresInMinutes = 10,
): Promise<SmsResult> {
  if (!/^\d{4,8}$/.test(otp)) {
    throw new Error("OTP must contain between 4 and 8 digits");
  }

  if (
    !Number.isInteger(expiresInMinutes) ||
    expiresInMinutes <= 0 ||
    expiresInMinutes > 60
  ) {
    throw new Error("OTP expiry must be between 1 and 60 minutes");
  }

  const body = `Your MirexCargo verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share this code with anyone.`;

  return sendSms({
    to,
    body,
  });
}

export async function sendShipmentUpdateSms(
  to: string,
  shipmentNumber: string,
  status: string,
): Promise<SmsResult> {
  if (!shipmentNumber.trim()) {
    throw new Error("Shipment number is required");
  }

  if (!status.trim()) {
    throw new Error("Shipment status is required");
  }

  const body = `MirexCargo shipment update: Shipment ${shipmentNumber.trim()} is now ${status.trim()}.`;

  return sendSms({
    to,
    body,
  });
}

export async function sendDeliveryNotificationSms(
  to: string,
  shipmentNumber: string,
  deliveryDate?: Date,
): Promise<SmsResult> {
  if (!shipmentNumber.trim()) {
    throw new Error("Shipment number is required");
  }

  const dateText = deliveryDate
    ? deliveryDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "today";

  const body = `MirexCargo delivery update: Shipment ${shipmentNumber.trim()} is scheduled for delivery on ${dateText}.`;

  return sendSms({
    to,
    body,
  });
}

export async function verifySmsService(): Promise<SmsVerificationResult> {
  try {
    const verified = await verifySmsConnection();

    if (!verified) {
      return {
        success: false,
        message: "SMS provider verification failed",
      };
    }

    return {
      success: true,
      message: "SMS provider connection verified successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "SMS provider verification failed",
    };
  }
}

export function isValidSmsPhone(phone: string): boolean {
  try {
    normalizePhone(phone);
    return true;
  } catch {
    return false;
  }
}

export function getSmsCharacterCount(message: string): number {
  return message.length;
}

export function canSendSms(message: string): boolean {
  const normalized = message.trim();

  return normalized.length > 0 && normalized.length <= 1600;
}
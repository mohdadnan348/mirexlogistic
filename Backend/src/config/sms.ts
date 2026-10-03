import twilio from "twilio";

import { ENV } from "./env";

export interface SendSmsOptions {
  to: string;
  body: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}

let twilioClient: ReturnType<typeof twilio> | null = null;

function isSmsConfigured(): boolean {
  return Boolean(
    ENV.ENABLE_SMS &&
      ENV.TWILIO_ACCOUNT_SID &&
      ENV.TWILIO_AUTH_TOKEN &&
      ENV.TWILIO_PHONE_NUMBER,
  );
}

function getTwilioClient(): ReturnType<typeof twilio> {
  if (!isSmsConfigured()) {
    throw new Error(
      "SMS service is not configured. Check the Twilio environment variables.",
    );
  }

  if (!twilioClient) {
    twilioClient = twilio(
      ENV.TWILIO_ACCOUNT_SID,
      ENV.TWILIO_AUTH_TOKEN,
    );
  }

  return twilioClient;
}

function normalizePhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.trim();

  if (!normalized) {
    throw new Error("Recipient phone number is required.");
  }

  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error(
      "Recipient phone number must be in international E.164 format.",
    );
  }

  return normalized;
}

function validateMessage(body: string): string {
  const message = body.trim();

  if (!message) {
    throw new Error("SMS message cannot be empty.");
  }

  if (message.length > 1600) {
    throw new Error("SMS message cannot exceed 1600 characters.");
  }

  return message;
}

export function getSmsConfigurationStatus(): {
  enabled: boolean;
  configured: boolean;
} {
  return {
    enabled: ENV.ENABLE_SMS,
    configured: isSmsConfigured(),
  };
}

export async function sendSms(
  options: SendSmsOptions,
): Promise<SmsResult> {
  const to = normalizePhoneNumber(options.to);
  const body = validateMessage(options.body);

  const client = getTwilioClient();

  try {
    const message = await client.messages.create({
      to,
      from: ENV.TWILIO_PHONE_NUMBER,
      body,
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to send SMS.";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function verifySmsConnection(): Promise<boolean> {
  if (!isSmsConfigured()) {
    return false;
  }

  try {
    const client = getTwilioClient();

    await client.api.accounts(ENV.TWILIO_ACCOUNT_SID).fetch();

    return true;
  } catch {
    return false;
  }
}

export function resetSmsClient(): void {
  twilioClient = null;
}
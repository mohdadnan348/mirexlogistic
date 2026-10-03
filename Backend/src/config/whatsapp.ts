import { ENV } from "./env";

export interface WhatsAppTextMessageOptions {
  to: string;
  message: string;
}

export interface WhatsAppTemplateMessageOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppApiResponse {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_data?: {
      details?: string;
    };
  };
}

function getWhatsAppApiUrl(path: string): string {
  const baseUrl = ENV.WHATSAPP_API_URL.replace(/\/+$/g, "");
  const apiVersion = ENV.WHATSAPP_API_VERSION.replace(/^\/+|\/+$/g, "");

  return `${baseUrl}/${apiVersion}/${ENV.WHATSAPP_PHONE_NUMBER_ID}/${path.replace(/^\/+/g, "")}`;
}

function getAccessToken(): string {
  if (!ENV.WHATSAPP_ACCESS_TOKEN) {
    throw new Error(
      "WhatsApp Cloud API access token is not configured.",
    );
  }

  return ENV.WHATSAPP_ACCESS_TOKEN;
}

function normalizePhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.trim().replace(/[^\d+]/g, "");

  if (!normalized) {
    throw new Error("WhatsApp recipient phone number is required.");
  }

  const digits = normalized.replace(/\+/g, "");

  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error(
      "WhatsApp recipient phone number must contain 8 to 15 digits.",
    );
  }

  return digits;
}

function validateMessage(message: string): string {
  const normalized = message.trim();

  if (!normalized) {
    throw new Error("WhatsApp message cannot be empty.");
  }

  return normalized;
}

async function sendWhatsAppRequest(
  payload: Record<string, unknown>,
): Promise<WhatsAppMessageResult> {
  const response = await fetch(getWhatsAppApiUrl("messages"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: WhatsAppApiResponse;

  try {
    data = (await response.json()) as WhatsAppApiResponse;
  } catch {
    return {
      success: false,
      error: `WhatsApp API returned an invalid response. HTTP ${response.status}.`,
    };
  }

  if (!response.ok) {
    const apiError =
      data.error?.error_data?.details ??
      data.error?.message ??
      "WhatsApp API request failed.";

    return {
      success: false,
      error: apiError,
    };
  }

  const messageId = data.messages?.[0]?.id;

  if (!messageId) {
    return {
      success: false,
      error: "WhatsApp API did not return a message ID.",
    };
  }

  return {
    success: true,
    messageId,
  };
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    ENV.ENABLE_WHATSAPP &&
      ENV.WHATSAPP_API_URL &&
      ENV.WHATSAPP_API_VERSION &&
      ENV.WHATSAPP_PHONE_NUMBER_ID &&
      ENV.WHATSAPP_ACCESS_TOKEN,
  );
}

export function getWhatsAppConfigurationStatus(): {
  enabled: boolean;
  configured: boolean;
} {
  return {
    enabled: ENV.ENABLE_WHATSAPP,
    configured: isWhatsAppConfigured(),
  };
}

export async function sendWhatsAppTextMessage(
  options: WhatsAppTextMessageOptions,
): Promise<WhatsAppMessageResult> {
  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      error: "WhatsApp Cloud API is not configured.",
    };
  }

  try {
    const to = normalizePhoneNumber(options.to);
    const message = validateMessage(options.message);

    return await sendWhatsAppRequest({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send WhatsApp message.",
    };
  }
}

export async function sendWhatsAppTemplateMessage(
  options: WhatsAppTemplateMessageOptions,
): Promise<WhatsAppMessageResult> {
  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      error: "WhatsApp Cloud API is not configured.",
    };
  }

  try {
    const to = normalizePhoneNumber(options.to);
    const templateName = options.templateName.trim();

    if (!templateName) {
      throw new Error("WhatsApp template name is required.");
    }

    const languageCode =
      options.languageCode?.trim() || "en_US";

    const parameters = options.parameters ?? [];

    const components =
      parameters.length > 0
        ? [
            {
              type: "body",
              parameters: parameters.map((text) => ({
                type: "text",
                text,
              })),
            },
          ]
        : undefined;

    return await sendWhatsAppRequest({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        ...(components ? { components } : {}),
      },
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send WhatsApp template message.",
    };
  }
}

export async function verifyWhatsAppConnection(): Promise<boolean> {
  if (!isWhatsAppConfigured()) {
    return false;
  }

  try {
    const response = await fetch(
      `${ENV.WHATSAPP_API_URL.replace(/\/+$/g, "")}/${ENV.WHATSAPP_API_VERSION.replace(/^\/+|\/+$/g, "")}/${ENV.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}
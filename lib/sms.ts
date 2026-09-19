/**
 * Source Code (sourcecode.co.ke) Bulk SMS gateway — the transport behind
 * phone OTP on /auth. Docs: https://portal.sourcecode.co.ke/developers
 *
 * Requires SOURCECODE_API_KEY (Settings → Developers/API on the portal —
 * server-side only, never NEXT_PUBLIC_). SOURCECODE_SENDER_ID defaults to
 * the approved "NAVAC" transactional sender ID; SOURCECODE_SERVICE_ID
 * defaults to 0 (standard bulk SMS, per the API docs' own example).
 */

const SEND_SMS_URL = "https://api.sourcecode.co.ke/sms/sendsms";

export class SmsSendError extends Error {
  statusCode?: string;

  constructor(message: string, statusCode?: string) {
    super(message);
    this.name = "SmsSendError";
    this.statusCode = statusCode;
  }
}

type SourceCodeSendResponse = {
  status_code?: string | number;
  status_desc?: string;
  message_id?: number;
  mobile_number?: string;
  network_id?: string;
  message_cost?: number;
  credit_balance?: number;
};

/** 254XXXXXXXXX, no leading +, no spaces — the format the gateway expects. */
export function normalizeKenyanMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  if (digits.startsWith("1") && digits.length === 9) return `254${digits}`;
  return null;
}

export async function sendSms(mobile: string, message: string): Promise<SourceCodeSendResponse> {
  const apiKey = process.env.SOURCECODE_API_KEY;
  if (!apiKey) {
    throw new SmsSendError("SOURCECODE_API_KEY is not configured on the server.");
  }
  const shortcode = process.env.SOURCECODE_SENDER_ID || "NAVAC";
  const serviceId = process.env.SOURCECODE_SERVICE_ID || "0";

  const res = await fetch(SEND_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      service_id: Number(serviceId),
      mobile,
      response_type: "json",
      shortcode,
      message,
    }),
    cache: "no-store",
  });

  let data: SourceCodeSendResponse;
  try {
    data = (await res.json()) as SourceCodeSendResponse;
  } catch {
    throw new SmsSendError(`Gateway returned a non-JSON response (HTTP ${res.status}).`);
  }

  const status = String(data.status_code ?? "");
  if (status !== "1000" && status !== "1") {
    throw new SmsSendError(data.status_desc || "SMS gateway rejected the message.", status);
  }

  return data;
}

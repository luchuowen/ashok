import { NextRequest, NextResponse } from "next/server";
import { normalizeKenyanMobile, sendSms, SmsSendError } from "@/lib/sms";
import { createOtpToken, generateOtpCode } from "@/lib/otp";

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const mobile = normalizeKenyanMobile(body.phone ?? "");
  if (!mobile) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid Kenyan phone number." },
      { status: 400 },
    );
  }

  const code = generateOtpCode();
  const token = createOtpToken(mobile, code);

  try {
    await sendSms(mobile, `Your Ashok Sunny Tailored verification code is ${code}. It expires in 5 minutes.`);
  } catch (error) {
    // Never surface gateway/config details to visitors; keep them in the server log.
    console.error("[auth/send-otp] SMS failed:", error instanceof Error ? error.message : error);
    const message =
      error instanceof SmsSendError && /invalid|not a valid|number/i.test(error.message) && !/configured|api key/i.test(error.message)
        ? "That number couldn't receive a text. Check it and try again."
        : "We couldn't send the code just now. Try again in a minute, or WhatsApp us.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, token, mobile });
}

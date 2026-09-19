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
    const message = error instanceof SmsSendError ? error.message : "Could not send the code. Try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, token, mobile });
}

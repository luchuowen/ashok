import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import { upsertPreferences } from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in to save preferences." }, { status: 401 });
  }

  let body: {
    fitPreference?: string;
    preferredFabricWeight?: string;
    lapelStyle?: string;
    communicationChannel?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    await upsertPreferences(session.phone, {
      clientName: session.phone,
      fitPreference: (body.fitPreference as "Slim" | "Classic" | "Relaxed") ?? "Classic",
      preferredFabricWeight: body.preferredFabricWeight?.trim() ?? "",
      lapelStyle: (body.lapelStyle as "Notch" | "Peak" | "Shawl") ?? "Notch",
      communicationChannel: (body.communicationChannel as "WhatsApp" | "Email" | "Phone") ?? "WhatsApp",
      notes: body.notes?.trim() ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[portal/preferences] write failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save your preferences. Try again." }, { status: 502 });
  }
}

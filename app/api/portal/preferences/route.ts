import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/otp";
import { getCustomer, upsertPreferences } from "@/lib/db";

const FIT_OPTIONS = ["Slim", "Classic", "Relaxed"] as const;
const LAPEL_OPTIONS = ["Notch", "Peak", "Shawl"] as const;
const CHANNEL_OPTIONS = ["WhatsApp", "Email", "Phone"] as const;

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
    communicationChannels?: unknown;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Validate the enum fields instead of casting whatever the client sent
  // straight into Firestore.
  const fit = FIT_OPTIONS.find((o) => o === body.fitPreference);
  const lapel = LAPEL_OPTIONS.find((o) => o === body.lapelStyle);
  const channels = Array.isArray(body.communicationChannels)
    ? CHANNEL_OPTIONS.filter((o) => (body.communicationChannels as unknown[]).includes(o))
    : [];
  if (!fit || !lapel) {
    return NextResponse.json({ ok: false, error: "Invalid preference." }, { status: 400 });
  }
  if (channels.length === 0) {
    return NextResponse.json({ ok: false, error: "Pick at least one communication channel." }, { status: 400 });
  }

  try {
    // clientName used to be written as the phone number, clobbering the
    // customer's real name on this record.
    const customer = await getCustomer(session.phone);
    await upsertPreferences(session.phone, {
      clientName: customer?.name || session.phone,
      fitPreference: fit,
      preferredFabricWeight: body.preferredFabricWeight?.trim() ?? "",
      lapelStyle: lapel,
      communicationChannels: channels,
      notes: body.notes?.trim() ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[portal/preferences] write failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Could not save your preferences. Try again." }, { status: 502 });
  }
}

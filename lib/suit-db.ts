import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import { verifySessionToken } from "@/lib/otp";
import type { FitProfile, SuitConfig } from "@/lib/suit/types";

/**
 * Server-only persistence for the custom-suit engine.
 *
 *  - suit_designs/{autoId}  — designs a signed-in customer saved to come
 *    back to (the wishlist equivalent). Queried by clientId only, so the
 *    automatic single-field index covers it; sorted in memory like every
 *    other per-client list in lib/db.ts.
 *  - fit_profiles/{phone}   — the customer's latest self-reported fit
 *    profile, reused on their next order. Distinct from the staff-owned
 *    `measurements` collection ("entered by staff, never self-reported"),
 *    which stays the authoritative record once the atelier measures them.
 *
 * Orders themselves stay in `orders` (see lib/db.ts) with the full suit
 * spec embedded — one document per order keeps reads, payment reconcile
 * and the admin/portal views single-fetch.
 */

const DESIGNS = "suit_designs";
const FIT_PROFILES = "fit_profiles";
export const MAX_SAVED_DESIGNS = 30;

export interface SavedDesign {
  id: string;
  clientId: string;
  name: string;
  config: SuitConfig;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export function getSessionPhone(): string | null {
  const token = cookies().get("ashok_session")?.value;
  const session = token ? verifySessionToken(token) : null;
  return session?.phone ?? null;
}

export async function listDesigns(clientId: string): Promise<SavedDesign[]> {
  const snap = await adminDb().collection(DESIGNS).where("clientId", "==", clientId).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<SavedDesign, "id">) }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createDesign(data: Omit<SavedDesign, "id">): Promise<string> {
  const ref = await adminDb().collection(DESIGNS).add(data);
  return ref.id;
}

export async function updateDesign(id: string, clientId: string, patch: Partial<Omit<SavedDesign, "id" | "clientId">>): Promise<boolean> {
  const ref = adminDb().collection(DESIGNS).doc(id);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as SavedDesign).clientId !== clientId) return false;
  await ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export async function deleteDesign(id: string, clientId: string): Promise<boolean> {
  const ref = adminDb().collection(DESIGNS).doc(id);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as SavedDesign).clientId !== clientId) return false;
  await ref.delete();
  return true;
}

export async function getFitProfile(clientId: string): Promise<FitProfile | null> {
  const snap = await adminDb().collection(FIT_PROFILES).doc(clientId).get();
  if (!snap.exists) return null;
  return (snap.data() as { profile: FitProfile }).profile ?? null;
}

export async function saveFitProfile(clientId: string, profile: FitProfile): Promise<void> {
  await adminDb()
    .collection(FIT_PROFILES)
    .doc(clientId)
    .set({ clientId, profile, updatedAt: new Date().toISOString() });
}

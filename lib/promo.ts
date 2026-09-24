import { adminDb } from "@/lib/firebase-admin";
import { normalizeCode, type PromoCode } from "@/lib/promo-shared";

/** Server-only promo code store: promo_codes/{CODE}. */
const PROMOS = "promo_codes";

export async function getPromo(code: string): Promise<PromoCode | null> {
  const id = normalizeCode(code);
  if (!id) return null;
  const snap = await adminDb().collection(PROMOS).doc(id).get();
  return snap.exists ? (snap.data() as PromoCode) : null;
}

export async function listPromos(): Promise<PromoCode[]> {
  const snap = await adminDb().collection(PROMOS).get();
  return snap.docs.map((d) => d.data() as PromoCode).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function savePromo(promo: PromoCode): Promise<void> {
  await adminDb().collection(PROMOS).doc(promo.code).set(promo);
}

export async function patchPromo(code: string, patch: Partial<PromoCode>): Promise<boolean> {
  const ref = adminDb().collection(PROMOS).doc(normalizeCode(code));
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

/** Count one paid use (called once per order, on its first payment). Gift
 *  cards also have the amount spent drawn off their balance. */
export async function recordPromoUse(code: string, discountUsed = 0): Promise<void> {
  const ref = adminDb().collection(PROMOS).doc(normalizeCode(code));
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const p = snap.data() as PromoCode;
    const patch: Partial<PromoCode> = { uses: (p.uses ?? 0) + 1, updatedAt: new Date().toISOString() };
    if (p.kind === "giftcard") {
      patch.value = Math.max(0, p.value - Math.max(0, discountUsed));
      if (patch.value === 0) patch.active = false;
    }
    tx.set(ref, patch, { merge: true });
  });
}

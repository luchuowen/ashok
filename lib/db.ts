import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Firestore-backed client record store. Field names deliberately mirror
 * lib/fixtures/*.ts (the Phase 1 mock data every portal page used to read
 * from) — those files documented the intended shape of these collections
 * from day one ("Field names mirror the eventual `X` Firestore collection").
 * `clientId` is always the customer's normalised Kenyan mobile number
 * (see lib/sms.ts normalizeKenyanMobile) — the only stable identity the
 * phone+OTP auth system produces.
 *
 * Every write here can fail (missing IAM grant, Firestore outage, bad
 * input) — callers on the customer-facing path (booking, checkout, the
 * webhook) must treat these as best-effort and never let a persistence
 * failure break the email/payment flow that already works without it.
 */

export type OrderStage =
  | "Consultation"
  | "Measurements Taken"
  | "Cutting"
  | "First Fitting"
  | "Final Fitting"
  | "Ready for Collection"
  | "Collected"
  | "Payment Pending"
  | "Paid";

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  item: string;
  stage: OrderStage;
  statusNote: string;
  startedAt: string; // ISO date
  estimatedCompletion: string; // ISO date
  price: number;
  currency: "KES";
  balanceDue: number;
  source: "shop" | "bespoke";
  transactionId?: string;
}

export type PaymentStatus = "Paid" | "Outstanding" | "Failed";

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  orderId: string;
  amount: number;
  currency: "KES";
  method: "M-Pesa" | "Card" | "Bank Transfer" | "Cash";
  date: string; // ISO date
  status: PaymentStatus;
  transactionId?: string;
  /** Staff-entered context for a manually recorded payment (a receipt
   *  number, "paid via Sarah's M-Pesa", etc.) -- gateway payments never
   *  set this. */
  note?: string;
}

export type AppointmentType = "Consultation" | "Measurement" | "Fitting";
export type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled";

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  type: AppointmentType;
  date: string; // ISO date
  time: string; // e.g. "14:30"
  location: string;
  status: AppointmentStatus;
}

export interface ClientMeasurements {
  id: string;
  clientId: string;
  clientName: string;
  takenAt: string; // ISO date
  chest: number;
  waist: number;
  hips: number;
  shoulder: number;
  sleeveLength: number;
  inseam: number;
  neck: number;
  notes: string;
}

export type QuoteStatus = "Pending" | "Approved" | "Declined" | "Expired";

export interface Quote {
  id: string;
  clientId: string;
  clientName: string;
  item: string;
  amount: number;
  currency: "KES";
  status: QuoteStatus;
  issuedAt: string; // ISO date
  expiresAt: string; // ISO date
}

export interface ClientPreferences {
  clientId: string;
  clientName: string;
  fitPreference: "Slim" | "Classic" | "Relaxed";
  preferredFabricWeight: string;
  lapelStyle: "Notch" | "Peak" | "Shawl";
  communicationChannel: "WhatsApp" | "Email" | "Phone";
  notes: string;
}

export interface Customer {
  phone: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

const COLLECTIONS = {
  customers: "customers",
  orders: "orders",
  payments: "payments",
  appointments: "appointments",
  measurements: "measurements",
  quotes: "quotes",
  preferences: "preferences",
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

// ---- Customers -------------------------------------------------------

export async function getCustomer(phone: string): Promise<Customer | null> {
  const snap = await adminDb().collection(COLLECTIONS.customers).doc(phone).get();
  if (!snap.exists) return null;
  return snap.data() as Customer;
}

export async function getOrCreateCustomer(
  phone: string,
  patch?: Partial<Pick<Customer, "name" | "email">>,
): Promise<Customer> {
  const ref = adminDb().collection(COLLECTIONS.customers).doc(phone);
  const snap = await ref.get();
  const iso = nowIso();
  if (!snap.exists) {
    const customer: Customer = {
      phone,
      name: patch?.name?.trim() || "",
      email: patch?.email?.trim() || "",
      createdAt: iso,
      updatedAt: iso,
    };
    await ref.set(customer);
    return customer;
  }
  const existing = snap.data() as Customer;
  const nameChanged = patch?.name?.trim() && patch.name.trim() !== existing.name;
  const emailChanged = patch?.email?.trim() && patch.email.trim() !== existing.email;
  if (nameChanged || emailChanged) {
    const update: Partial<Customer> = { updatedAt: iso };
    if (nameChanged) update.name = patch!.name!.trim();
    if (emailChanged) update.email = patch!.email!.trim();
    await ref.set(update, { merge: true });
    return { ...existing, ...update };
  }
  return existing;
}

export async function updateCustomer(phone: string, patch: Partial<Customer>): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.customers)
    .doc(phone)
    .set({ ...patch, updatedAt: nowIso() }, { merge: true });
}

export async function listCustomers(limit = 50): Promise<Customer[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.customers)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => doc.data() as Customer);
}

// Staff type phone numbers in whatever format is on hand (07XX..., 7XX...,
// or the full 254XXXXXXXXX a customer record is actually keyed by) — a raw
// digit prefix match against the stored `phone` field (always 254-prefixed,
// see normalizeKenyanMobile) silently returns nothing for the exact
// "07XX XXX XXX" format the search field's own placeholder suggests.
// Normalize the query the same way a phone is normalized before storing,
// tolerating a partial/in-progress number, so the prefix search below
// actually lines up with what's stored.
function normalizeSearchPrefix(query: string): string {
  const digits = query.replace(/[^\d]/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export async function searchCustomersByPhone(query: string, limit = 20): Promise<Customer[]> {
  const prefix = normalizeSearchPrefix(query);
  if (!prefix) return [];
  const snap = await adminDb()
    .collection(COLLECTIONS.customers)
    .orderBy("phone")
    .startAt(prefix)
    .endAt(`${prefix}`)
    .limit(limit)
    .get();
  return snap.docs.map((doc) => doc.data() as Customer);
}

/**
 * Substring match on customer name, case-insensitive. Firestore has no
 * native text search, and most customers have no name on file at all (it's
 * optional -- phone is the only guaranteed identity), so a name index field
 * would need a backfill migration for every existing record just to make
 * old customers findable. Given this business's scale (a single atelier's
 * customer list, not a call-center-sized database), pulling a bounded,
 * most-recently-active window and filtering in memory is simpler and
 * strictly more useful -- it matches anywhere in the name, not just a
 * prefix. Revisit with a real search index if the customer list ever grows
 * past a few thousand.
 */
export async function searchCustomersByName(query: string, limit = 20): Promise<Customer[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const snap = await adminDb()
    .collection(COLLECTIONS.customers)
    .orderBy("updatedAt", "desc")
    .limit(1000)
    .get();
  const matches: Customer[] = [];
  for (const doc of snap.docs) {
    const customer = doc.data() as Customer;
    if (customer.name && customer.name.toLowerCase().includes(needle)) {
      matches.push(customer);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

// ---- Generic per-client collection helpers ---------------------------

async function listForClient<T>(collection: string, clientId: string, sortKey: keyof T): Promise<T[]> {
  const snap = await adminDb().collection(collection).where("clientId", "==", clientId).get();
  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
  return rows.sort((a, b) => String(b[sortKey]).localeCompare(String(a[sortKey])));
}

async function listRecent<T>(collection: string, sortKey: string, limit: number): Promise<T[]> {
  const snap = await adminDb().collection(collection).orderBy(sortKey, "desc").limit(limit).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
}

// ---- Orders ------------------------------------------------------------

export async function listOrdersForCustomer(clientId: string): Promise<Order[]> {
  return listForClient<Order>(COLLECTIONS.orders, clientId, "startedAt");
}

export async function listRecentOrders(limit = 20): Promise<Order[]> {
  return listRecent<Order>(COLLECTIONS.orders, "startedAt", limit);
}

export async function createOrder(data: Omit<Order, "id">): Promise<string> {
  const ref = await adminDb().collection(COLLECTIONS.orders).add(data);
  return ref.id;
}

export async function getOrder(id: string): Promise<Order | null> {
  const snap = await adminDb().collection(COLLECTIONS.orders).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Order, "id">) };
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<void> {
  await adminDb().collection(COLLECTIONS.orders).doc(id).set(patch, { merge: true });
}

export async function updateOrderByTransactionId(
  transactionId: string,
  patch: Partial<Order>,
): Promise<boolean> {
  const snap = await adminDb()
    .collection(COLLECTIONS.orders)
    .where("transactionId", "==", transactionId)
    .limit(1)
    .get();
  if (snap.empty) return false;
  await snap.docs[0]!.ref.set(patch, { merge: true });
  return true;
}

// ---- Payments ------------------------------------------------------------

export async function listPaymentsForCustomer(clientId: string): Promise<Payment[]> {
  return listForClient<Payment>(COLLECTIONS.payments, clientId, "date");
}

export async function listRecentPayments(limit = 20): Promise<Payment[]> {
  return listRecent<Payment>(COLLECTIONS.payments, "date", limit);
}

export async function createPayment(data: Omit<Payment, "id">): Promise<string> {
  const ref = await adminDb().collection(COLLECTIONS.payments).add(data);
  return ref.id;
}

export async function updatePaymentByTransactionId(
  transactionId: string,
  patch: Partial<Payment>,
): Promise<boolean> {
  const snap = await adminDb()
    .collection(COLLECTIONS.payments)
    .where("transactionId", "==", transactionId)
    .limit(1)
    .get();
  if (snap.empty) return false;
  await snap.docs[0]!.ref.set(patch, { merge: true });
  return true;
}

// ---- Appointments ------------------------------------------------------

export async function listAppointmentsForCustomer(clientId: string): Promise<Appointment[]> {
  return listForClient<Appointment>(COLLECTIONS.appointments, clientId, "date");
}

export async function listRecentAppointments(limit = 20): Promise<Appointment[]> {
  return listRecent<Appointment>(COLLECTIONS.appointments, "date", limit);
}

export async function createAppointment(data: Omit<Appointment, "id">): Promise<string> {
  const ref = await adminDb().collection(COLLECTIONS.appointments).add(data);
  return ref.id;
}

export async function updateAppointment(id: string, patch: Partial<Appointment>): Promise<void> {
  await adminDb().collection(COLLECTIONS.appointments).doc(id).set(patch, { merge: true });
}

// ---- Measurements --------------------------------------------------------

export async function listMeasurementsForCustomer(clientId: string): Promise<ClientMeasurements[]> {
  return listForClient<ClientMeasurements>(COLLECTIONS.measurements, clientId, "takenAt");
}

export async function createMeasurement(data: Omit<ClientMeasurements, "id">): Promise<string> {
  const ref = await adminDb().collection(COLLECTIONS.measurements).add(data);
  return ref.id;
}

// ---- Quotes --------------------------------------------------------------

export async function listQuotesForCustomer(clientId: string): Promise<Quote[]> {
  return listForClient<Quote>(COLLECTIONS.quotes, clientId, "issuedAt");
}

export async function listRecentQuotes(limit = 20): Promise<Quote[]> {
  return listRecent<Quote>(COLLECTIONS.quotes, "issuedAt", limit);
}

export async function createQuote(data: Omit<Quote, "id">): Promise<string> {
  const ref = await adminDb().collection(COLLECTIONS.quotes).add(data);
  return ref.id;
}

export async function getQuote(id: string): Promise<Quote | null> {
  const snap = await adminDb().collection(COLLECTIONS.quotes).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Quote, "id">) };
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<void> {
  await adminDb().collection(COLLECTIONS.quotes).doc(id).set(patch, { merge: true });
}

// ---- Preferences (one doc per client, keyed by phone like Customers) ----

export async function getPreferences(clientId: string): Promise<ClientPreferences | null> {
  const snap = await adminDb().collection(COLLECTIONS.preferences).doc(clientId).get();
  if (!snap.exists) return null;
  return snap.data() as ClientPreferences;
}

export async function upsertPreferences(
  clientId: string,
  patch: Partial<Omit<ClientPreferences, "clientId">>,
): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.preferences)
    .doc(clientId)
    .set({ clientId, ...patch }, { merge: true });
}

export const FieldDelete = FieldValue.delete;

import { adminDb } from "@/lib/firebase-admin";

/**
 * Shop catalogue + inventory: products, categories, stock movements,
 * suppliers, purchase orders, stock-takes, and returns. Kept separate from
 * lib/db.ts (customers/orders/appointments/etc — the bespoke-tailoring CRM
 * side) because this is a genuinely separate domain that only the Shop
 * touches; Order itself (in lib/db.ts) gains a `items?: OrderItem[]` field
 * so a shop order's line items can reference the productId/variantId here
 * for stock deduction and returns.
 *
 * Stock lives embedded on each product's `variants[]` (not a separate
 * `stock_levels` collection) so a deduction/restock is a single-document
 * Firestore transaction — read the product, adjust one variant's stockQty,
 * write it back — with no risk of two collections drifting out of sync.
 * Every change to a variant's stockQty is also appended to the
 * `stock_movements` collection as an immutable audit trail (never
 * updated/deleted, only ever added to), which is what stock-taking,
 * reconciliation reporting, and "what happened to this unit" all read from.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  createdAt: string;
}

export interface ProductVariant {
  /** Stable within the product — e.g. a shoe size ("42") or "one-size". */
  id: string;
  label: string;
  sku: string;
  stockQty: number;
  lowStockThreshold: number;
  /** Overrides Product.price for this one variant when set. */
  priceOverride?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  currency: "KES";
  /** 0–100. Applied off `price` (or a variant's priceOverride) wherever a
   *  price is shown or charged. Omitted/0 = no discount. */
  discountPercent?: number;
  images: string[];
  imageLabel: string;
  /** Published/visible in the shop. Archiving (rather than deleting) keeps
   *  past orders' denormalized product/variant names meaningful and keeps
   *  stock-movement history intact. */
  active: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | "restock" // purchase order received
  | "sale" // deducted for a shop order at checkout
  | "cancellation-restock" // shop order's payment failed/was cancelled
  | "return-restock" // an approved, restocked return
  | "adjustment" // manual admin correction
  | "stock-take"; // variance found during a stock-take, applied as an adjustment

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  type: StockMovementType;
  /** Signed — negative for a deduction, positive for a restock/return/adjustment-up. */
  qtyChange: number;
  balanceAfter: number;
  reason?: string;
  relatedOrderId?: string;
  relatedPurchaseOrderId?: string;
  relatedStockTakeId?: string;
  relatedReturnId?: string;
  actor: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseOrderStatus = "Draft" | "Ordered" | "Partially Received" | "Received" | "Cancelled";

export interface PurchaseOrderLine {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderedAt?: string;
  receivedAt?: string;
}

export type StockTakeStatus = "In Progress" | "Completed";

export interface StockTakeLine {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
}

export interface StockTake {
  id: string;
  status: StockTakeStatus;
  lines: StockTakeLine[];
  notes?: string;
  startedAt: string;
  completedAt?: string;
}

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Refunded";

export interface ReturnLine {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  qty: number;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  clientId: string;
  clientName: string;
  lines: ReturnLine[];
  reason: string;
  status: ReturnStatus;
  refundAmount?: number;
  refundMethod?: "M-Pesa" | "Card" | "Bank Transfer" | "Cash" | "Store Credit";
  restocked: boolean;
  requestedAt: string;
  resolvedAt?: string;
  notes?: string;
}

const COLLECTIONS = {
  categories: "categories",
  products: "products",
  stockMovements: "stock_movements",
  suppliers: "suppliers",
  purchaseOrders: "purchase_orders",
  stockTakes: "stock_takes",
  returns: "returns",
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

export class InsufficientStockError extends Error {
  productId: string;
  variantId: string;
  available: number;
  requested: number;
  constructor(productId: string, variantId: string, available: number, requested: number) {
    super(`Only ${available} left of this size (requested ${requested}).`);
    this.name = "InsufficientStockError";
    this.productId = productId;
    this.variantId = variantId;
    this.available = available;
    this.requested = requested;
  }
}

// ---- Categories ------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const snap = await adminDb().collection(COLLECTIONS.categories).orderBy("sortOrder", "asc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Category, "id">) }));
}

export async function createCategory(data: Omit<Category, "id" | "createdAt">): Promise<string> {
  const ref = await adminDb()
    .collection(COLLECTIONS.categories)
    .add({ ...data, createdAt: nowIso() });
  return ref.id;
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<void> {
  await adminDb().collection(COLLECTIONS.categories).doc(id).set(patch, { merge: true });
}

export async function deleteCategory(id: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.categories).doc(id).delete();
}

// ---- Products ----------------------------------------------------------

export async function listProducts(opts?: { includeInactive?: boolean }): Promise<Product[]> {
  const snap = await adminDb().collection(COLLECTIONS.products).get();
  const all = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Product, "id">) }));
  return opts?.includeInactive ? all : all.filter((p) => p.active);
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await adminDb().collection(COLLECTIONS.products).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, "id">) };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const snap = await adminDb().collection(COLLECTIONS.products).where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<Product, "id">) };
}

export async function createProduct(data: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const iso = nowIso();
  const ref = await adminDb()
    .collection(COLLECTIONS.products)
    .add({ ...data, createdAt: iso, updatedAt: iso });
  return ref.id;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.products)
    .doc(id)
    .set({ ...patch, updatedAt: nowIso() }, { merge: true });
}

/** Lowercase, hyphenated, alnum-only slug — shared by category and product
 *  admin routes so "A Name Like This!" always becomes "a-name-like-this". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ProductVariantInput {
  id?: string;
  label?: string;
  sku?: string;
  stockQty?: number;
  lowStockThreshold?: number;
  priceOverride?: number;
}

/**
 * Turns admin-form variant rows into real ProductVariant records. Keeps an
 * existing variant's id stable across an edit (stock movements, cart lines,
 * and past orders' items[] all reference variantId), and only mints a fresh
 * slug-derived id for a genuinely new row — de-duped against both the ids
 * already in use on this product and any sibling row in the same submit.
 */
export function buildProductVariants(
  input: ProductVariantInput[],
  existingVariants: ProductVariant[] = [],
): ProductVariant[] {
  const existingById = new Map(existingVariants.map((v) => [v.id, v]));
  const used = new Set<string>();
  return input
    .filter((v) => v.label?.trim())
    .map((v) => {
      const label = v.label!.trim();
      const base = slugify(label) || "variant";
      const matched = v.id?.trim() ? existingById.get(v.id.trim()) : undefined;
      let id = matched ? matched.id : base;
      let suffix = 2;
      while (used.has(id)) {
        id = `${base}-${suffix++}`;
      }
      used.add(id);
      // A matched (already-existing) variant keeps its stockQty no matter
      // what the caller sends -- stock only ever moves through
      // deductStockForOrder/restockForOrder/adjustStock, each of which logs
      // a stock_movements entry. Editing a product here must never be a
      // back door around that ledger. A genuinely new row (no match) has no
      // history yet, so its starting quantity is whatever was entered.
      const stockQty = matched
        ? matched.stockQty
        : Number.isFinite(Number(v.stockQty))
          ? Math.max(0, Math.trunc(Number(v.stockQty)))
          : 0;
      const lowStockThreshold = Number.isFinite(Number(v.lowStockThreshold))
        ? Math.max(0, Math.trunc(Number(v.lowStockThreshold)))
        : 0;
      const variant: ProductVariant = {
        id,
        label,
        sku: v.sku?.trim() || id.toUpperCase(),
        stockQty,
        lowStockThreshold,
      };
      if (Number.isFinite(Number(v.priceOverride)) && Number(v.priceOverride) > 0) {
        variant.priceOverride = Number(v.priceOverride);
      }
      return variant;
    });
}

export { effectivePrice } from "@/lib/pricing";

// ---- Stock movements (ledger) -------------------------------------------

async function appendStockMovement(
  tx: FirebaseFirestore.Transaction,
  data: Omit<StockMovement, "id" | "createdAt">,
): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.stockMovements).doc();
  // Belt and braces with firebase-admin.ts's ignoreUndefinedProperties:
  // never hand Firestore an undefined field from the optional related-* ids.
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  tx.set(ref, { ...clean, createdAt: nowIso() });
}

// A where("productId", ...) combined with orderBy("createdAt", ...) needs a
// Firestore composite index that this project doesn't (yet) declare
// anywhere (there's no firestore.indexes.json at all — see
// firebase-admin.ts). Rather than ship a query that throws in production
// until someone clicks the console link Firestore's error would print,
// this always sorts by createdAt alone (a single-field index Firestore
// creates automatically) and filters by productId in memory when asked —
// the same tradeoff lib/db.ts's searchCustomersByName already makes for
// this business's scale.
export async function listStockMovements(opts?: { productId?: string; limit?: number }): Promise<StockMovement[]> {
  const fetchLimit = opts?.productId ? 500 : (opts?.limit ?? 100);
  const snap = await adminDb()
    .collection(COLLECTIONS.stockMovements)
    .orderBy("createdAt", "desc")
    .limit(fetchLimit)
    .get();
  const all = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<StockMovement, "id">) }));
  const filtered = opts?.productId ? all.filter((m) => m.productId === opts.productId) : all;
  return filtered.slice(0, opts?.limit ?? 100);
}

/**
 * Applies a signed quantity change to one variant's stockQty and appends the
 * matching ledger entry, atomically (a Firestore transaction on the single
 * product document — see the file header). `allowNegative` is only ever true
 * for a manual admin adjustment; every stock-reducing business flow
 * (checkout, in particular) must never oversell, so it throws
 * InsufficientStockError instead of letting stockQty go below zero.
 */
async function applyStockChange(params: {
  productId: string;
  variantId: string;
  qtyChange: number;
  type: StockMovementType;
  reason?: string;
  relatedOrderId?: string;
  relatedPurchaseOrderId?: string;
  relatedStockTakeId?: string;
  relatedReturnId?: string;
  actor: string;
  allowNegative?: boolean;
}): Promise<{ product: Product; balanceAfter: number }> {
  const ref = adminDb().collection(COLLECTIONS.products).doc(params.productId);
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`Product ${params.productId} not found.`);
    const product = { id: snap.id, ...(snap.data() as Omit<Product, "id">) } as Product;
    const variantIndex = product.variants.findIndex((v) => v.id === params.variantId);
    if (variantIndex === -1) {
      throw new Error(`Variant ${params.variantId} not found on product ${params.productId}.`);
    }
    const variant = product.variants[variantIndex]!;
    const nextQty = variant.stockQty + params.qtyChange;
    if (nextQty < 0 && !params.allowNegative) {
      throw new InsufficientStockError(params.productId, params.variantId, variant.stockQty, -params.qtyChange);
    }
    const nextVariants = product.variants.slice();
    nextVariants[variantIndex] = { ...variant, stockQty: nextQty };
    tx.set(ref, { variants: nextVariants, updatedAt: nowIso() }, { merge: true });
    await appendStockMovement(tx, {
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantLabel: variant.label,
      type: params.type,
      qtyChange: params.qtyChange,
      balanceAfter: nextQty,
      reason: params.reason,
      relatedOrderId: params.relatedOrderId,
      relatedPurchaseOrderId: params.relatedPurchaseOrderId,
      relatedStockTakeId: params.relatedStockTakeId,
      relatedReturnId: params.relatedReturnId,
      actor: params.actor,
    });
    return { product: { ...product, variants: nextVariants }, balanceAfter: nextQty };
  });
}

export async function deductStockForOrder(
  lines: { productId: string; variantId: string; qty: number }[],
  orderId: string,
): Promise<void> {
  // Sequential, not Promise.all: each line is its own transaction (a
  // different product document per line), so a failure partway through
  // (e.g. line 2 of 3 is out of stock) leaves a clear, deterministic set of
  // already-deducted lines. Self-heals on that failure — restocks every
  // line that DID succeed before re-throwing — so a caller (the checkout
  // route) never has to reconstruct "which lines actually went through" to
  // avoid stock getting stuck permanently held for an order that never
  // actually got its invoice created.
  const succeeded: { productId: string; variantId: string; qty: number }[] = [];
  try {
    for (const line of lines) {
      await applyStockChange({
        productId: line.productId,
        variantId: line.variantId,
        qtyChange: -line.qty,
        type: "sale",
        relatedOrderId: orderId,
        actor: "system",
      });
      succeeded.push(line);
    }
  } catch (error) {
    if (succeeded.length > 0) {
      await restockForOrder(succeeded, orderId, "cancellation-restock").catch((restockError) => {
        console.error(
          `[inventory] Failed to roll back a partial stock deduction for order ${orderId} — ` +
            `manual correction needed:`,
          restockError instanceof Error ? restockError.message : restockError,
        );
      });
    }
    throw error;
  }
}

/** Reverses deductStockForOrder — used when a checkout partially deducted
 *  stock and then failed, and when a paid order is later cancelled/returned. */
export async function restockForOrder(
  lines: { productId: string; variantId: string; qty: number }[],
  orderId: string,
  type: "cancellation-restock" | "return-restock" = "cancellation-restock",
  relatedReturnId?: string,
): Promise<void> {
  for (const line of lines) {
    await applyStockChange({
      productId: line.productId,
      variantId: line.variantId,
      qtyChange: line.qty,
      type,
      relatedOrderId: orderId,
      relatedReturnId,
      actor: "system",
      allowNegative: true, // a restock always succeeds regardless of current balance
    });
  }
}

export async function adjustStock(params: {
  productId: string;
  variantId: string;
  qtyChange: number;
  reason: string;
}): Promise<{ balanceAfter: number }> {
  const { balanceAfter } = await applyStockChange({
    productId: params.productId,
    variantId: params.variantId,
    qtyChange: params.qtyChange,
    type: "adjustment",
    reason: params.reason,
    actor: "staff",
    allowNegative: true,
  });
  return { balanceAfter };
}

// ---- Suppliers -----------------------------------------------------------

export async function listSuppliers(): Promise<Supplier[]> {
  const snap = await adminDb().collection(COLLECTIONS.suppliers).orderBy("name", "asc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Supplier, "id">) }));
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const snap = await adminDb().collection(COLLECTIONS.suppliers).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Supplier, "id">) };
}

export async function createSupplier(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const iso = nowIso();
  const ref = await adminDb()
    .collection(COLLECTIONS.suppliers)
    .add({ ...data, createdAt: iso, updatedAt: iso });
  return ref.id;
}

export async function updateSupplier(id: string, patch: Partial<Supplier>): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.suppliers)
    .doc(id)
    .set({ ...patch, updatedAt: nowIso() }, { merge: true });
}

// ---- Purchase orders -------------------------------------------------

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const snap = await adminDb().collection(COLLECTIONS.purchaseOrders).orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<PurchaseOrder, "id">) }));
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const snap = await adminDb().collection(COLLECTIONS.purchaseOrders).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<PurchaseOrder, "id">) };
}

export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt" | "status"> & { status?: PurchaseOrderStatus },
): Promise<string> {
  const iso = nowIso();
  const ref = await adminDb()
    .collection(COLLECTIONS.purchaseOrders)
    .add({ ...data, status: data.status ?? "Draft", createdAt: iso, updatedAt: iso });
  return ref.id;
}

export async function updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.purchaseOrders)
    .doc(id)
    .set({ ...patch, updatedAt: nowIso() }, { merge: true });
}

/**
 * Receives some or all of a PO's outstanding quantity, one line at a time
 * (qty 0 for a line not received this round). Each received unit becomes a
 * "restock" stock movement and raises that variant's stockQty; the PO's own
 * status/qtyReceived move to Partially Received or Received accordingly.
 * Never receives more than a line's remaining qtyOrdered - qtyReceived.
 */
export async function receivePurchaseOrder(
  id: string,
  receipts: { productId: string; variantId: string; qty: number }[],
): Promise<PurchaseOrder> {
  const po = await getPurchaseOrder(id);
  if (!po) throw new Error(`Purchase order ${id} not found.`);
  if (po.status === "Cancelled") throw new Error("This purchase order was cancelled.");

  const nextLines = po.lines.map((line) => ({ ...line }));
  for (const receipt of receipts) {
    if (receipt.qty <= 0) continue;
    const line = nextLines.find((l) => l.productId === receipt.productId && l.variantId === receipt.variantId);
    if (!line) continue;
    const remaining = line.qtyOrdered - line.qtyReceived;
    const qty = Math.min(receipt.qty, remaining);
    if (qty <= 0) continue;
    await applyStockChange({
      productId: receipt.productId,
      variantId: receipt.variantId,
      qtyChange: qty,
      type: "restock",
      relatedPurchaseOrderId: id,
      actor: "staff",
      allowNegative: true,
    });
    line.qtyReceived += qty;
  }

  const fullyReceived = nextLines.every((l) => l.qtyReceived >= l.qtyOrdered);
  const anyReceived = nextLines.some((l) => l.qtyReceived > 0);
  const status: PurchaseOrderStatus = fullyReceived ? "Received" : anyReceived ? "Partially Received" : po.status;
  const patch: Partial<PurchaseOrder> = { lines: nextLines, status };
  if (fullyReceived) patch.receivedAt = nowIso();
  await updatePurchaseOrder(id, patch);
  return { ...po, ...patch };
}

// ---- Stock takes -----------------------------------------------------

export async function listStockTakes(): Promise<StockTake[]> {
  const snap = await adminDb().collection(COLLECTIONS.stockTakes).orderBy("startedAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<StockTake, "id">) }));
}

export async function getStockTake(id: string): Promise<StockTake | null> {
  const snap = await adminDb().collection(COLLECTIONS.stockTakes).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<StockTake, "id">) };
}

/** Snapshots every active product's variants at their current stockQty as
 *  the "expected" count a physical count will be checked against. */
export async function startStockTake(notes?: string): Promise<string> {
  const products = await listProducts({ includeInactive: true });
  const lines: StockTakeLine[] = products.flatMap((product) =>
    product.variants.map((variant) => ({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantLabel: variant.label,
      expectedQty: variant.stockQty,
      countedQty: null,
      variance: null,
    })),
  );
  const ref = await adminDb().collection(COLLECTIONS.stockTakes).add({
    status: "In Progress",
    lines,
    notes: notes ?? "",
    startedAt: nowIso(),
  } satisfies Omit<StockTake, "id">);
  return ref.id;
}

export async function recordStockTakeCounts(
  id: string,
  counts: { productId: string; variantId: string; countedQty: number }[],
): Promise<void> {
  const stockTake = await getStockTake(id);
  if (!stockTake) throw new Error(`Stock take ${id} not found.`);
  const nextLines = stockTake.lines.map((line) => {
    const count = counts.find((c) => c.productId === line.productId && c.variantId === line.variantId);
    if (!count) return line;
    return { ...line, countedQty: count.countedQty, variance: count.countedQty - line.expectedQty };
  });
  await adminDb().collection(COLLECTIONS.stockTakes).doc(id).set({ lines: nextLines }, { merge: true });
}

/** Closes a stock take: every counted line with a non-zero variance becomes
 *  a "stock-take" adjustment movement that brings stockQty in line with the
 *  physical count. An uncounted line (countedQty still null) is left alone
 *  — it was never physically checked, so there's nothing to reconcile. */
export async function completeStockTake(id: string): Promise<StockTake> {
  const stockTake = await getStockTake(id);
  if (!stockTake) throw new Error(`Stock take ${id} not found.`);
  for (const line of stockTake.lines) {
    if (line.countedQty === null || !line.variance) continue;
    await applyStockChange({
      productId: line.productId,
      variantId: line.variantId,
      qtyChange: line.variance,
      type: "stock-take",
      reason: `Stock take ${id}: counted ${line.countedQty}, expected ${line.expectedQty}`,
      relatedStockTakeId: id,
      actor: "staff",
      allowNegative: true,
    });
  }
  const patch: Partial<StockTake> = { status: "Completed", completedAt: nowIso() };
  await adminDb().collection(COLLECTIONS.stockTakes).doc(id).set(patch, { merge: true });
  return { ...stockTake, ...patch };
}

// ---- Returns -----------------------------------------------------------

export async function listReturns(): Promise<ReturnRequest[]> {
  const snap = await adminDb().collection(COLLECTIONS.returns).orderBy("requestedAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ReturnRequest, "id">) }));
}

export async function listReturnsForOrder(orderId: string): Promise<ReturnRequest[]> {
  const snap = await adminDb().collection(COLLECTIONS.returns).where("orderId", "==", orderId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ReturnRequest, "id">) }));
}

export async function getReturn(id: string): Promise<ReturnRequest | null> {
  const snap = await adminDb().collection(COLLECTIONS.returns).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<ReturnRequest, "id">) };
}

export async function createReturn(
  data: Omit<ReturnRequest, "id" | "status" | "restocked" | "requestedAt">,
): Promise<string> {
  const ref = await adminDb()
    .collection(COLLECTIONS.returns)
    .add({
      ...data,
      status: "Requested",
      restocked: false,
      requestedAt: nowIso(),
    } satisfies Omit<ReturnRequest, "id">);
  return ref.id;
}

export async function updateReturn(id: string, patch: Partial<ReturnRequest>): Promise<void> {
  await adminDb().collection(COLLECTIONS.returns).doc(id).set(patch, { merge: true });
}

// ---- One-time bootstrap ---------------------------------------------

/**
 * The Shop shipped with its 4 products hardcoded in lib/fixtures/products.ts
 * (that file's own comment: "Field names mirror the eventual `products`
 * Firestore collection"). This is that migration, run lazily and once: the
 * first request that needs the product list (GET /api/shop/products) calls
 * this first, and it's a no-op after the very first call ever finds the
 * `products` collection non-empty. No manual admin step, no separate script
 * needing production credentials this environment doesn't have.
 */
export async function ensureShopSeeded(): Promise<void> {
  const existing = await adminDb().collection(COLLECTIONS.products).limit(1).get();
  if (!existing.empty) return;

  const iso = nowIso();
  const categoryByName = new Map<string, string>();
  const categoryDefs = [
    { name: "Shoes", slug: "shoes", sortOrder: 0 },
    { name: "Ties", slug: "ties", sortOrder: 1 },
    { name: "Cufflinks", slug: "cufflinks", sortOrder: 2 },
  ];
  for (const def of categoryDefs) {
    const id = await createCategory(def);
    categoryByName.set(def.name, id);
  }

  const shoeSizes = ["40", "41", "42", "43", "44", "45"];
  const shoeVariants = (skuPrefix: string): ProductVariant[] =>
    shoeSizes.map((size) => ({
      id: size,
      label: size,
      sku: `${skuPrefix}-${size}`,
      stockQty: 3,
      lowStockThreshold: 2,
    }));
  const oneSizeVariant = (sku: string, stockQty: number): ProductVariant[] => [
    { id: "one-size", label: "One Size", sku, stockQty, lowStockThreshold: 5 },
  ];

  const seedProducts: Omit<Product, "id" | "createdAt" | "updatedAt">[] = [
    {
      slug: "derby-shoes",
      name: "Derby Shoes",
      categoryId: categoryByName.get("Shoes")!,
      description: "Black calf leather derby, hand-welted, sits well under a full suit.",
      price: 24500,
      currency: "KES",
      images: ["/photos/products/derby-shoes.jpg"],
      imageLabel: "IMG-11 · derby shoes, black calf",
      active: true,
      variants: shoeVariants("ASHOK-DERBY"),
    },
    {
      slug: "silk-tie-oxblood",
      name: "Silk Tie — Oxblood",
      categoryId: categoryByName.get("Ties")!,
      description: "Woven silk in oxblood, cut narrow to sit close under a two-button jacket.",
      price: 5800,
      currency: "KES",
      images: ["/photos/products/silk-tie-oxblood.jpg"],
      imageLabel: "IMG-12 · silk tie, oxblood",
      active: true,
      variants: oneSizeVariant("ASHOK-TIE-OXBLOOD", 25),
    },
    {
      slug: "cufflinks-brass",
      name: "Cufflinks — Brass",
      categoryId: categoryByName.get("Cufflinks")!,
      description: "Solid brass, weighted, a plain face that doesn't compete with a cuff.",
      price: 3200,
      currency: "KES",
      images: ["/photos/products/cufflinks-brass.jpg"],
      imageLabel: "IMG-13 · cufflinks, brass",
      active: true,
      variants: oneSizeVariant("ASHOK-CUFFLINKS-BRASS", 25),
    },
    {
      slug: "oxford-shoes-black-calf",
      name: "Oxford Shoes — Black Calf",
      categoryId: categoryByName.get("Shoes")!,
      description: "Closed-lacing oxford in black calf, built for the formal end of the wardrobe.",
      price: 27500,
      currency: "KES",
      images: ["/photos/products/oxford-shoes-black-calf.jpg"],
      imageLabel: "IMG-14 · oxford shoes, black calf",
      active: true,
      variants: shoeVariants("ASHOK-OXFORD"),
    },
  ];

  const batch = adminDb().batch();
  for (const product of seedProducts) {
    const ref = adminDb().collection(COLLECTIONS.products).doc();
    batch.set(ref, { ...product, createdAt: iso, updatedAt: iso });
  }
  await batch.commit();
}

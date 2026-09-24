import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK — full read/write access to Firestore,
 * bypassing security rules entirely (this file must never be imported from
 * a "use client" component or shipped to the browser).
 *
 * initializeApp() with no arguments auto-discovers the project ID and
 * credentials from the GCP metadata server when running on Firebase App
 * Hosting / Cloud Run — no service-account key needed. Locally (tsc, lint,
 * `next build`) nothing calls this until a request actually hits a route
 * handler, so the absence of real credentials off-GCP never breaks the
 * build.
 */
let app: App | undefined;

function getAdminApp(): App {
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp();
  }
  return app;
}

let firestore: Firestore | undefined;

export function adminDb(): Firestore {
  // Local development only: an in-memory stand-in so the whole journey can
  // run without GCP credentials (see lib/dev/fake-firestore.ts). Never on in
  // a production build.
  if (process.env.ASHOK_FAKE_FIRESTORE === "1" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FakeFirestore } = require("./dev/fake-firestore") as typeof import("./dev/fake-firestore");
    const g = globalThis as unknown as { __ashokFakeDb?: Firestore };
    return (g.__ashokFakeDb ??= new FakeFirestore() as unknown as Firestore);
  }
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
    // Firestore rejects a document containing any `undefined` value
    // ("Cannot use 'undefined' as a Firestore value"). Several writers spread
    // optional fields straight into a document — the stock-movement ledger
    // (`reason`, `relatedPurchaseOrderId`, ...) being the one that broke
    // checkout: every sale's deduction transaction threw and the customer
    // saw "couldn't reserve stock". Dropping undefined keys at the SDK level
    // is the documented fix and matches how these records are typed.
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

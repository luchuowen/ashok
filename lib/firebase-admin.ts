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
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
  }
  return firestore;
}

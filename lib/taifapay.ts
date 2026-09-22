/**
 * TaifaPay (merchants.taifapay.africa) — hosted-checkout payment links.
 *
 * We use Flow 2 from the TaifaPay docs (POST /checkout/invoices, then
 * redirect to the returned checkoutUrl): no card/M-Pesa PIN data ever
 * touches this server, the hosted page handles method selection, and we
 * only ever see an invoiceNo / transactionId plus a final status.
 *
 * Credentials are per-environment (sandbox and production are entirely
 * separate client_id/client_secret pairs and hosts) — see .env.example.
 * TAIFAPAY_ENV picks which one this deploy talks to; defaults to sandbox
 * so a stray local/dev/preview build can never move real money.
 */

export type TaifaPayEnv = "sandbox" | "production";

export class TaifaPayError extends Error {
  status?: number;
  /**
   * True only when `message` came from TaifaPay's own API response (a real
   * business-level rejection, e.g. a bad account reference) and is safe to
   * show a customer as-is. Every other failure here — token/auth plumbing,
   * a non-JSON response, a redirect landing on the wrong page — is an
   * infra detail a customer should never see verbatim; callers must fall
   * back to a generic message for those. Defaults to false so a new call
   * site can't accidentally leak an internal error by forgetting to set it.
   */
  customerSafe: boolean;
  constructor(message: string, status?: number, customerSafe = false) {
    super(message);
    this.name = "TaifaPayError";
    this.status = status;
    this.customerSafe = customerSafe;
  }
}

function getEnv(): TaifaPayEnv {
  return process.env.TAIFAPAY_ENV === "production" ? "production" : "sandbox";
}

function getBaseUrl(env: TaifaPayEnv): string {
  // Root cause of the production payment outage (found by comparing against
  // NAVAC CRM's working TaifaPay integration, which reads its base URL from
  // a secret whose live value is confirmed to be .../api/v1): TaifaPay's
  // merchants.taifapay.africa host runs its merchant dashboard's Next.js
  // locale-detection middleware in front of every route EXCEPT genuine
  // `/api/*` routes (the framework's own default middleware matcher excludes
  // `/api`). A path of `/v1/...` looks like a dashboard page route to that
  // middleware, so it gets 307-redirected into `/en/v1/...` regardless of
  // headers (the previous `Accept-Language: en` workaround addressed a
  // symptom, not this). `/api/v1/...` is a real API route and is never
  // touched by the redirect. NAVAC CRM has always called .../api/v1 and has
  // never hit this; Ashok's URL was simply missing the `/api` segment.
  return env === "production"
    ? "https://merchants.taifapay.africa/api/v1"
    : "https://sandbox.merchants.taifapay.africa/api/v1";
}

function getCredentials(env: TaifaPayEnv): { clientId: string; clientSecret: string } {
  const clientId =
    env === "production"
      ? process.env.TAIFAPAY_PRODUCTION_CLIENT_ID
      : process.env.TAIFAPAY_SANDBOX_CLIENT_ID;
  const clientSecret =
    env === "production"
      ? process.env.TAIFAPAY_PRODUCTION_CLIENT_SECRET
      : process.env.TAIFAPAY_SANDBOX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new TaifaPayError(
      `TaifaPay ${env} credentials are not configured on the server.`,
    );
  }
  return { clientId, clientSecret };
}

// Module-scoped token cache, keyed by environment, so we don't fetch a new
// bearer token on every request — tokens are valid for ~1hr (see docs).
const tokenCache: Record<TaifaPayEnv, { token: string; expiresAt: number } | null> = {
  sandbox: null,
  production: null,
};

async function getAccessToken(env: TaifaPayEnv): Promise<string> {
  const cached = tokenCache[env];
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const { clientId, clientSecret } = getCredentials(env);
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  // TaifaPay's production host (merchants.taifapay.africa) also serves
  // their merchant dashboard, and runs locale-detection middleware in
  // front of every route, /v1/* API routes included. Confirmed via
  // production logs: our POST to /v1/auth/token was 307-redirected to
  // /en/v1/auth/token, which isn't a real API route — it lands on the
  // dashboard's own Next.js HTML shell instead of returning a token.
  // Asking for application/json (below) doesn't stop this: it's a
  // *locale* redirect, not a content-negotiation one. Explicitly
  // declaring an Accept-Language does, since the middleware only needs
  // to guess a locale when the request doesn't already state one, and
  // "en" happens to be the exact locale it was redirecting into anyway.
  const url = `${getBaseUrl(env)}/auth/token`;
  const res = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "en",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  // With redirect: "manual", a locale redirect surfaces as an opaqueredirect
  // (or a plain 3xx) instead of being silently followed into the wrong
  // page. Retry once, following redirects normally, only if the first
  // attempt didn't redirect (a genuine same-URL response) — this keeps
  // the Accept-Language fix as the primary path while still working if
  // TaifaPay's middleware ever stops redirecting altogether.
  let finalRes = res;
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    console.error(
      `[taifapay] token request to ${url} was redirected (status=${res.status || "opaque"}) ` +
        `despite Accept-Language: en — retrying once with redirects followed.`,
    );
    finalRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": "en",
      },
      body: JSON.stringify({ grant_type: "client_credentials" }),
      cache: "no-store",
    });
  }

  if (!finalRes.ok) {
    const bodyText = await finalRes.text().catch(() => "");
    console.error(
      `[taifapay] token request failed: status=${finalRes.status} body=${bodyText.slice(0, 500)}`,
    );
    throw new TaifaPayError(`TaifaPay token request failed (${finalRes.status}).`, finalRes.status);
  }

  const rawBody = await finalRes.text();
  let data: { access_token: string; expires_in: string };
  try {
    data = JSON.parse(rawBody) as { access_token: string; expires_in: string };
  } catch (err) {
    console.error(
      `[taifapay] token response (status ${finalRes.status}) was not valid JSON. ` +
        `content-type=${finalRes.headers.get("content-type")} url=${finalRes.url} body=${rawBody.slice(0, 800)}`,
      err,
    );
    throw new TaifaPayError("TaifaPay token response was not valid JSON.");
  }
  tokenCache[env] = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000,
  };
  return data.access_token;
}

async function taifaPayFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const env = getEnv();
  const token = await getAccessToken(env);

  const res = await fetch(`${getBaseUrl(env)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `TaifaPay request failed (${res.status}).`;
    let customerSafe = false;
    let bodyText = "";
    try {
      bodyText = await res.clone().text();
      const body = JSON.parse(bodyText) as { message?: string };
      if (body?.message) {
        message = body.message;
        // A parsed JSON error body from TaifaPay's own invoice/transaction
        // API is a genuine business rejection (bad reference, expired
        // invoice, etc.) — safe to show the customer as-is. The exception
        // is a *merchant account* misconfiguration ("Your company has no
        // identifierLetters configured…"): that's for staff to fix in the
        // TaifaPay dashboard, meaningless to a customer, so it stays
        // internal and gets a pointer in the log.
        customerSafe = !/identifierLetters|your company/i.test(message);
        if (!customerSafe) {
          message += " [Fix in TaifaPay merchant dashboard: Company settings → set the invoice identifier letters (e.g. ASH), then retry.]";
        }
      }
    } catch {
      // Non-JSON error body — likely an infra page, not a real API error.
    }
    console.error(
      `[taifapay] request failed: path=${path} status=${res.status} body=${bodyText.slice(0, 500)}`,
    );
    throw new TaifaPayError(message, res.status, customerSafe);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    const bodyText = await res.clone().text().catch(() => "");
    console.error(
      `[taifapay] success response was not valid JSON: path=${path} body=${bodyText.slice(0, 500)}`,
      err,
    );
    throw new TaifaPayError("TaifaPay returned an unexpected response.");
  }
}

export interface CreateInvoiceParams {
  /** Amount in KES, computed server-side — never trust a client-supplied amount. */
  amount: number;
  /** Unique per company. Letters, numbers, ., _, - only. */
  accountReference: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  /** 254XXXXXXXXX format. */
  customerPhone?: string;
  /** Your own id for reconciliation. */
  externalId?: string;
  returnUrl?: string;
  expiresInMinutes?: number;
}

export interface TaifaPayInvoice {
  transactionId: string;
  checkoutUrl: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  status: string;
  methods: string[];
  expiresAt: string;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<TaifaPayInvoice> {
  const data = await taifaPayFetch<{ invoice: TaifaPayInvoice }>("/checkout/invoices", {
    method: "POST",
    body: JSON.stringify({
      currency: "KES",
      ...params,
    }),
  });
  return data.invoice;
}

export interface TaifaPayTransaction {
  transactionId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  amount: number;
  currency: string;
  accountReference?: string;
  [key: string]: unknown;
}

interface RawTaifaPayTransaction {
  transactionId: string;
  // TaifaPay's own API, confirmed live (dashboard DOM, 18 Sept 2026): lowercase,
  // non-past-tense values ("complete", "failed" — not "COMPLETED"/"FAILED").
  // getTransaction() below normalizes this before it ever reaches a caller,
  // the same way app/api/webhooks/taifapay/route.ts already normalizes the
  // webhook's own copy of this same field — so every consumer in this app
  // compares against one canonical PENDING/COMPLETED/FAILED, never the raw
  // provider string.
  status: string;
  amount: number;
  currency: string;
  accountReference?: string;
  [key: string]: unknown;
}

export function normalizeTransactionStatus(raw: string): "PENDING" | "COMPLETED" | "FAILED" {
  const s = (raw || "").toLowerCase();
  if (s.includes("complete")) return "COMPLETED";
  if (/fail|cancel|expire/.test(s)) return "FAILED";
  return "PENDING";
}

export async function getTransaction(transactionId: string): Promise<TaifaPayTransaction> {
  const raw = await taifaPayFetch<RawTaifaPayTransaction>(
    `/transactions/${encodeURIComponent(transactionId)}`,
  );
  return { ...raw, status: normalizeTransactionStatus(raw.status) };
}

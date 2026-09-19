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
  constructor(message: string, status?: number) {
    super(message);
    this.name = "TaifaPayError";
    this.status = status;
  }
}

function getEnv(): TaifaPayEnv {
  return process.env.TAIFAPAY_ENV === "production" ? "production" : "sandbox";
}

function getBaseUrl(env: TaifaPayEnv): string {
  return env === "production"
    ? "https://merchants.taifapay.africa/v1"
    : "https://sandbox.merchants.taifapay.africa/v1";
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

  const res = await fetch(`${getBaseUrl(env)}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    console.error(
      `[taifapay] token request failed: status=${res.status} body=${bodyText.slice(0, 500)}`,
    );
    throw new TaifaPayError(`TaifaPay token request failed (${res.status}).`, res.status);
  }

  const rawBody = await res.text();
  let data: { access_token: string; expires_in: string };
  try {
    data = JSON.parse(rawBody) as { access_token: string; expires_in: string };
  } catch (err) {
    console.error(
      `[taifapay] token response (status ${res.status}) was not valid JSON. ` +
        `content-type=${res.headers.get("content-type")} url=${res.url} body=${rawBody.slice(0, 800)}`,
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
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `TaifaPay request failed (${res.status}).`;
    let bodyText = "";
    try {
      bodyText = await res.clone().text();
      const body = JSON.parse(bodyText) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore — non-JSON error body
    }
    console.error(
      `[taifapay] request failed: path=${path} status=${res.status} body=${bodyText.slice(0, 500)}`,
    );
    throw new TaifaPayError(message, res.status);
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
  status: "PENDING" | "COMPLETED" | "FAILED" | string;
  amount: number;
  currency: string;
  accountReference?: string;
  [key: string]: unknown;
}

export async function getTransaction(transactionId: string): Promise<TaifaPayTransaction> {
  return taifaPayFetch<TaifaPayTransaction>(
    `/transactions/${encodeURIComponent(transactionId)}`,
  );
}

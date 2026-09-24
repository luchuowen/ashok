/**
 * In-memory Firestore stand-in for LOCAL DEVELOPMENT ONLY.
 *
 * Enabled with ASHOK_FAKE_FIRESTORE=1, and hard-gated in lib/firebase-admin.ts
 * to NODE_ENV !== "production" — production builds always use the real Admin
 * SDK. It implements exactly the subset of the Admin SDK surface this app
 * uses (doc/collection CRUD, where ==, orderBy, limit, startAt/endAt, simple
 * transactions and batches) so the full shop → custom suit → checkout →
 * payment → admin journey can be exercised without GCP credentials or the
 * Java emulator. Optionally persisted to a JSON file between restarts.
 */
import fs from "fs";

type Data = Record<string, unknown>;
type Store = Record<string, Record<string, Data>>;

const FILE = process.env.ASHOK_FAKE_FIRESTORE_FILE;
const g = globalThis as unknown as { __ashokFakeStore?: Store };

function load(): Store {
  if (g.__ashokFakeStore) return g.__ashokFakeStore;
  let s: Store = {};
  if (FILE && fs.existsSync(FILE)) {
    try {
      s = JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
    } catch {
      s = {};
    }
  }
  g.__ashokFakeStore = s;
  return s;
}

let flushTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  if (!FILE) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    try {
      fs.writeFileSync(FILE, JSON.stringify(load(), null, 1));
    } catch {
      // best-effort
    }
  }, 50);
}

function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

function isDelete(v: unknown): boolean {
  const name = (v as { constructor?: { name?: string } } | null)?.constructor?.name ?? "";
  return typeof v === "object" && v !== null && /Delete/i.test(name);
}

function applyPatch(target: Data, patch: Data, merge: boolean): Data {
  const out: Data = merge ? clone(target) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const path = key.split(".");
    let node = out;
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i]!;
      if (typeof node[p] !== "object" || node[p] === null) node[p] = {};
      node = node[p] as Data;
    }
    const leaf = path[path.length - 1]!;
    if (isDelete(value)) delete node[leaf];
    else node[leaf] = clone(value);
  }
  return out;
}

let autoCounter = 0;
function autoId(): string {
  autoCounter += 1;
  return `${Date.now().toString(36)}${autoCounter.toString(36)}${Math.random().toString(36).slice(2, 10)}`.padEnd(20, "x").slice(0, 20);
}

function getField(d: Data, path: string): unknown {
  return path.split(".").reduce<unknown>((n, p) => (n && typeof n === "object" ? (n as Data)[p] : undefined), d);
}

class DocSnap {
  constructor(
    public readonly ref: DocRef,
    private readonly value: Data | undefined,
  ) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return this.value !== undefined;
  }
  data() {
    return this.value === undefined ? undefined : clone(this.value);
  }
  get(field: string) {
    return this.value ? getField(this.value, field) : undefined;
  }
}

class DocRef {
  constructor(
    public readonly collection: string,
    public readonly id: string,
  ) {}
  get path() {
    return `${this.collection}/${this.id}`;
  }
  private get table() {
    const s = load();
    return (s[this.collection] ??= {});
  }
  async get() {
    return new DocSnap(this, this.table[this.id]);
  }
  async set(data: Data, opts?: { merge?: boolean }) {
    this.table[this.id] = applyPatch(this.table[this.id] ?? {}, data, Boolean(opts?.merge));
    persist();
  }
  async update(data: Data) {
    if (!this.table[this.id]) throw new Error(`NOT_FOUND: ${this.path}`);
    this.table[this.id] = applyPatch(this.table[this.id]!, data, true);
    persist();
  }
  async delete() {
    delete this.table[this.id];
    persist();
  }
}

type Filter = { field: string; op: string; value: unknown };

class Query {
  constructor(
    protected readonly name: string,
    private readonly filters: Filter[] = [],
    private readonly orders: { field: string; dir: "asc" | "desc" }[] = [],
    private readonly max?: number,
    private readonly start?: unknown,
    private readonly end?: unknown,
  ) {}
  where(field: string, op: string, value: unknown) {
    return new Query(this.name, [...this.filters, { field, op, value }], this.orders, this.max, this.start, this.end);
  }
  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    return new Query(this.name, this.filters, [...this.orders, { field, dir }], this.max, this.start, this.end);
  }
  limit(n: number) {
    return new Query(this.name, this.filters, this.orders, n, this.start, this.end);
  }
  startAt(v: unknown) {
    return new Query(this.name, this.filters, this.orders, this.max, v, this.end);
  }
  endAt(v: unknown) {
    return new Query(this.name, this.filters, this.orders, this.max, this.start, v);
  }
  select() {
    return this;
  }
  async get() {
    const table = load()[this.name] ?? {};
    let rows = Object.entries(table).map(([id, data]) => ({ id, data }));
    for (const f of this.filters) {
      rows = rows.filter(({ data }) => {
        const v = getField(data, f.field);
        switch (f.op) {
          case "==":
            return v === f.value;
          case "!=":
            return v !== f.value;
          case "in":
            return Array.isArray(f.value) && f.value.includes(v);
          case "array-contains":
            return Array.isArray(v) && v.includes(f.value);
          case ">":
            return (v as number) > (f.value as number);
          case ">=":
            return (v as number) >= (f.value as number);
          case "<":
            return (v as number) < (f.value as number);
          case "<=":
            return (v as number) <= (f.value as number);
          default:
            return true;
        }
      });
    }
    for (const o of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const av = String(getField(a.data, o.field) ?? "");
        const bv = String(getField(b.data, o.field) ?? "");
        return o.dir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }
    const first = this.orders[0]?.field;
    if (first && this.start !== undefined) rows = rows.filter((r) => String(getField(r.data, first) ?? "") >= String(this.start));
    if (first && this.end !== undefined) rows = rows.filter((r) => String(getField(r.data, first) ?? "") <= String(this.end));
    if (this.max !== undefined) rows = rows.slice(0, this.max);
    const docs = rows.map((r) => new DocSnap(new DocRef(this.name, r.id), r.data));
    return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn: (d: DocSnap) => void) => docs.forEach(fn) };
  }
}

class CollectionRef extends Query {
  constructor(name: string) {
    super(name);
  }
  get id() {
    return this.name;
  }
  doc(id?: string) {
    return new DocRef(this.name, id ?? autoId());
  }
  async add(data: Data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class FakeTransaction {
  private writes: (() => Promise<void>)[] = [];
  async get(ref: DocRef | Query) {
    return ref.get();
  }
  set(ref: DocRef, data: Data, opts?: { merge?: boolean }) {
    this.writes.push(() => ref.set(data, opts));
    return this;
  }
  update(ref: DocRef, data: Data) {
    this.writes.push(() => ref.update(data));
    return this;
  }
  delete(ref: DocRef) {
    this.writes.push(() => ref.delete());
    return this;
  }
  async commit() {
    for (const w of this.writes) await w();
  }
}

// Serialise transactions so read-modify-write stays atomic in-process.
let chain: Promise<unknown> = Promise.resolve();

export class FakeFirestore {
  collection(name: string) {
    return new CollectionRef(name);
  }
  doc(path: string) {
    const [c, id] = path.split("/");
    return new DocRef(c!, id!);
  }
  settings() {
    // no-op
  }
  batch() {
    return new FakeTransaction();
  }
  runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const tx = new FakeTransaction();
      const result = await fn(tx);
      await tx.commit();
      return result;
    });
    chain = run.catch(() => undefined);
    return run;
  }
}

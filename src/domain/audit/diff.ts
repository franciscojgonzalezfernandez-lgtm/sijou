/**
 * Audit log diffs (F-018 CA-3, CA-5): what changed in a document, field by field, as
 * `{ path, before, after }`, without passwords, tokens or other secrets.
 */
export interface Change {
  path: string;
  before: unknown;
  after: unknown;
}

export type AuditAction = "create" | "update" | "delete" | "status";

export const MAX_TEXT_LENGTH = 2000;
const TRUNCATED = "… [recortado]";

/** Never stored, not even as "changed" (CA-5). */
export const SENSITIVE_KEYS = [
  "password",
  "hash",
  "salt",
  "token",
  "resetPasswordToken",
  "resetPasswordExpiration",
  "_verificationToken",
  "apiKey",
  "enableAPIKey",
  "secret",
  "sessions",
  "loginAttempts",
  "lockUntil",
] as const;

const SENSITIVE = new Set<string>(SENSITIVE_KEYS.map((key) => key.toLowerCase()));
const SENSITIVE_PARTS = ["password", "token", "secret"];

/** Payload bookkeeping that is not a change anyone made. */
const IGNORED_KEYS = new Set(["id", "createdAt", "updatedAt", "_status", "__v", "globalType"]);

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE.has(lower) || SENSITIVE_PARTS.some((part) => lower.includes(part));
}

/** True when any segment of a dotted path is sensitive. */
export function isSensitivePath(path: string): boolean {
  return path.split(".").some(isSensitiveKey);
}

/** Drops every change whose path is sensitive (defence in depth before inserting). */
export function redact(changes: Change[]): Change[] {
  return changes.filter((change) => !isSensitivePath(change.path));
}

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A populated relationship or upload: a stored document, compared by its id. */
function isDocument(value: Plain): boolean {
  return "id" in value && ("createdAt" in value || "updatedAt" in value);
}

/** Lexical rich text: `{ root: { children } }`. */
function isRichText(value: Plain): boolean {
  return isPlainObject(value.root) && Array.isArray(value.root.children);
}

function richTextToPlain(node: unknown): string {
  if (!isPlainObject(node)) return "";
  if (typeof node.text === "string") return node.text;
  const children = Array.isArray(node.children) ? node.children : [];
  const separator = node.type === "root" ? "\n" : "";
  return children.map(richTextToPlain).join(separator);
}

function truncate(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) + TRUNCATED : text;
}

/** A comparable, storable value: relations as ids, rich text as text, no secrets, sorted keys. */
function normalize(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return truncate(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (!isPlainObject(value)) return value;
  if (isDocument(value)) return value.id;
  if (isRichText(value)) {
    const text = richTextToPlain(value.root);
    return text ? truncate(text) : null;
  }
  const result: Plain = {};
  for (const key of Object.keys(value).sort()) {
    if (IGNORED_KEYS.has(key) || isSensitiveKey(key)) continue;
    result[key] = normalize(value[key]);
  }
  return result;
}

/**
 * Flattens nested groups into dotted paths (`seo.title`, `name.de`). Arrays, relations and rich
 * text stay whole values: for a gallery what matters is the resulting list and its order.
 */
function flatten(value: unknown, prefix: string, into: Map<string, unknown>): void {
  if (isPlainObject(value) && !isDocument(value) && !isRichText(value)) {
    for (const key of Object.keys(value)) {
      if (IGNORED_KEYS.has(key) || isSensitiveKey(key)) continue;
      flatten(value[key], `${prefix}.${key}`, into);
    }
    return;
  }
  into.set(prefix, normalize(value));
}

/** The document itself opens up field by field, even though it has an id and timestamps. */
function flattenDocument(doc: unknown, into: Map<string, unknown>): void {
  if (!isPlainObject(doc)) return;
  for (const key of Object.keys(doc)) {
    if (IGNORED_KEYS.has(key) || isSensitiveKey(key)) continue;
    flatten(doc[key], key, into);
  }
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Field-by-field changes from `before` to `after`. No changes → `[]`. `ignore` lists top-level
 * fields that are not the document's own data (join fields: a product's list of variants).
 */
export function diffDocs(
  before: unknown,
  after: unknown,
  ignore: readonly string[] = [],
): Change[] {
  const left = new Map<string, unknown>();
  const right = new Map<string, unknown>();
  flattenDocument(before, left);
  flattenDocument(after, right);
  const ignored = (path: string) =>
    ignore.some((field) => path === field || path.startsWith(`${field}.`));
  const paths = [...new Set([...left.keys(), ...right.keys()])].filter((p) => !ignored(p)).sort();
  const changes: Change[] = [];
  for (const path of paths) {
    const from = left.get(path) ?? null;
    const to = right.get(path) ?? null;
    if (!same(from, to)) changes.push({ path, before: from, after: to });
  }
  return changes;
}

/** CA-3: a change of `status` counts as a status change even when other fields change too. */
export function actionFor(
  operation: "create" | "update" | "delete",
  changes: Change[],
): AuditAction {
  if (operation !== "update") return operation;
  return changes.some((change) => change.path === "status") ? "status" : "update";
}

export interface Actor {
  actorId: number | null;
  actorEmail: string | null;
}

/** Who made the change. No admin user (seed, migrations, webhooks, crons) = System. */
export function describeActor(user: unknown): Actor {
  if (!isPlainObject(user)) return { actorId: null, actorEmail: null };
  const id = typeof user.id === "number" ? user.id : null;
  const email = typeof user.email === "string" ? user.email : null;
  return { actorId: id, actorEmail: email };
}

// Reads shared themes straight from the database's public web API, so
// visitors browsing the gallery never download the Firebase library.
import { firebaseConfig } from "./firebase-config.js";
import { DOCS_ORIGIN } from "./emulator.js";

const DOCS = `${DOCS_ORIGIN}/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const KEY = `key=${firebaseConfig.apiKey}`;

/** Only links into the site's own storage are ever shown or followed. */
export const FILE_PREFIX = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/themes%2F`;
export const isOwnFile = (url) => typeof url === "string" && url.startsWith(FILE_PREFIX);

function decode(value) {
  if (value == null) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  return null;
}
const decodeFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

export function fromDocument(doc) {
  return { id: doc.name.split("/").pop(), ...decodeFields(doc.fields || {}) };
}

const equals = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } });

/** Approved themes, newest first, optionally for one target. */
export async function listApproved({ target, limit = 60 } = {}) {
  const filters = [equals("status", "approved")];
  if (target) filters.push(equals("target", target));
  const structuredQuery = {
    from: [{ collectionId: "themes" }],
    where: filters.length > 1 ? { compositeFilter: { op: "AND", filters } } : filters[0],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit,
  };
  const res = await fetch(`${DOCS}:runQuery?${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) throw new Error(`The gallery couldn't be loaded (${res.status}).`);
  return (await res.json()).filter((row) => row.document).map((row) => fromDocument(row.document));
}

/** One approved theme, or null if it doesn't exist or isn't public. */
export async function getApproved(id) {
  if (!/^[A-Za-z0-9_-]{1,60}$/.test(id || "")) return null;
  const res = await fetch(`${DOCS}/themes/${id}?${KEY}`);
  if (!res.ok) return null;
  return fromDocument(await res.json());
}

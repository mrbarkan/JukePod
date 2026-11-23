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

const string = (value) => ({ stringValue: value });
const equals = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: string(value) } });
const contains = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: "ARRAY_CONTAINS", value: string(value) } });
const containsAny = (field, values) => ({ fieldFilter: { field: { fieldPath: field }, op: "ARRAY_CONTAINS_ANY", value: { arrayValue: { values: values.map(string) } } } });

async function runQuery(extra, limit) {
  const filters = [equals("status", "approved"), ...(extra ? [extra] : [])];
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

/**
 * Approved themes, newest first. `target` keeps those that work on one
 * firmware or app (the one they were made for, or one they're tagged with);
 * `anyOf` keeps those that work on any of a list of them (ten at most).
 */
export function listApproved({ target, anyOf, limit = 60 } = {}) {
  if (target) return runQuery(contains("worksOn", target), limit);
  if (anyOf?.length) return runQuery(containsAny("worksOn", anyOf.slice(0, 10)), limit);
  return runQuery(null, limit);
}

/** Approved themes that say they are a remix of this one. */
export function remixesOf(themeId, limit = 24) {
  return runQuery(contains("remixIds", themeId), limit);
}

export const THEME_ID = /^[A-Za-z0-9]{1,40}$/;

/** One approved theme, or null if it doesn't exist or isn't public. */
export async function getApproved(id) {
  if (!THEME_ID.test(id || "")) return null;
  const res = await fetch(`${DOCS}/themes/${id}?${KEY}`);
  if (!res.ok) return null;
  return fromDocument(await res.json());
}

/**
 * The theme ID in a link to a theme page on this site (any of its
 * addresses), or "" if the link points somewhere else.
 */
export function themeIdFromLink(text) {
  let url;
  try {
    url = new URL(String(text).trim(), location.href);
  } catch {
    return "";
  }
  const ours = url.origin === location.origin || ["quitanda.mrbarkan.com", "mrbarkan.github.io"].includes(url.hostname);
  const id = url.searchParams.get("id") || "";
  return ours && /\/themes\/view\/?$/.test(url.pathname) && THEME_ID.test(id) ? id : "";
}

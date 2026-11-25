// Nightly community refresh. Reads the listings and fixes published from
// suggestions (the public `community` collection in Firestore) and writes
// them to src/data/community.json, which src/lib/community.js folds into
// the catalog at build time.
//
//   node scripts/refresh-community.mjs
//
// Needs no secret: the collection is public by design, and the project's
// web API key identifies the project. If the database can't be reached,
// the previous file is kept, so a build never loses listings.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { firebaseConfig } from "../src/lib/firebase-config.js";

const root = new URL("..", import.meta.url);
const outPath = fileURLToPath(new URL("src/data/community.json", root));
const FIELDS = ["kind", "action", "itemId", "name", "url", "devices", "maker", "blurb", "category", "credit", "publishedAt"];

/** Turns one Firestore REST value into plain JSON. */
export function decode(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]));
  return null;
}

/** One REST document to a community entry, keeping only the known fields. */
export function toEntry(doc) {
  const id = doc.name.split("/").pop();
  const data = Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]));
  const entry = { id };
  for (const key of FIELDS) if (data[key] != null) entry[key] = data[key];
  return entry;
}

/** Every document in the collection, page by page. */
export async function collect({ fetchImpl = fetch, config = firebaseConfig } = {}) {
  const base = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/community`;
  const entries = [];
  let pageToken = "";
  for (let page = 0; page < 50; page++) {
    const url = `${base}?pageSize=300&key=${config.apiKey}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`Firestore answered ${res.status}`);
    const body = await res.json();
    entries.push(...(body.documents || []).map(toEntry));
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return entries.sort((a, b) => String(a.publishedAt || "").localeCompare(String(b.publishedAt || "")) || a.id.localeCompare(b.id));
}

async function main() {
  const previous = JSON.parse(readFileSync(outPath, "utf8"));
  let entries;
  try {
    entries = await collect();
  } catch (err) {
    console.warn(`Couldn't read community listings (${err.message}); keeping the previous file.`);
    return;
  }
  if (JSON.stringify(entries) === JSON.stringify(previous.entries)) {
    console.log(`Community listings unchanged (${entries.length}).`);
    return;
  }
  writeFileSync(outPath, JSON.stringify({ fetchedAt: new Date().toISOString(), entries }, null, 2) + "\n");
  console.log(`Wrote ${entries.length} community entries.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

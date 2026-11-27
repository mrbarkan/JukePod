// Emails release alerts: "something for your iPod has a new version".
//
// The nightly job runs this right after refresh-github.mjs:
//   node scripts/send-alerts.mjs <stats-before.json>
// It compares the stats file from before the refresh with the one just
// written, and emails each person who asked to hear about the iPods a new
// release runs on. One email per person per night, however many releases.
//
// It needs two secrets and does nothing without them:
//   BREVO_API_KEY             sends the email (brevo.com)
//   FIREBASE_SERVICE_ACCOUNT  a read-only key (JSON) to read who signed up
// Optional: ALERTS_FROM_EMAIL, ALERTS_FROM_NAME, SITE_URL.
//
//   --dry-run       say what would be sent, send nothing
//   --test <id>     pretend listing <id> was just released, and email only
//                   the site's admins who signed up for it
//
// Addresses are never printed, here or in the job's log.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const statsPath = fileURLToPath(new URL("src/data/github-stats.json", root));

export const DAILY_CAP = 280; // Brevo's free plan sends 300 a day
const RECENT_DAYS = 14;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s) => String(s ?? "").replace(/`/g, "");
const isNumbered = (v) => !!v && /^v?\d/i.test(v);
const fits = (item) => [...(item.devices || []), ...(item.partial || [])];
const daysAgo = (iso, today) => (new Date(today) - new Date(String(iso).length === 7 ? `${iso}-01` : iso)) / 86400000;

/**
 * Listings whose version changed between two stats files, plus listings
 * tracked for the first time whose release is recent. Old releases that are
 * only new to the tracker stay quiet.
 */
export function newReleases(before, after, listings, today = new Date().toISOString().slice(0, 10)) {
  const out = [];
  for (const item of listings) {
    const now = after.repos?.[item.id];
    if (!now || !isNumbered(now.version)) continue;
    const was = before.repos?.[item.id];
    const changed = was?.version && was.version !== now.version;
    const firstSeen = !was?.version && now.updated && daysAgo(now.updated, today) <= RECENT_DAYS;
    if (changed || firstSeen) out.push({ ...item, version: now.version, updated: now.updated });
  }
  return out;
}

/** Who gets told about what: [{ person, releases }] for everyone with at least one match. */
export function matchPeople(people, releases) {
  return people
    .filter((p) => !p.off && p.email && Array.isArray(p.devices))
    .map((person) => ({
      person,
      releases: releases.filter((r) => person.devices.includes("all") || fits(r).some((d) => person.devices.includes(d))),
    }))
    .filter((m) => m.releases.length > 0);
}

const title = (r) => (r.name.includes(r.version) ? r.name : `${r.name} ${r.version}`);

/** The email for one person: { subject, html }. Everything from the catalog is escaped. */
export function compose({ person, releases, site, deviceNames = {} }) {
  const url = (path) => site.replace(/\/$/, "") + path;
  const first = title(releases[0]);
  const subject = releases.length === 1 ? `${first} is out` : `${first} and ${releases.length - 1} more ${releases.length === 2 ? "update" : "updates"} for your iPod`;
  const asked = person.devices.includes("all") ? "every release" : person.devices.map((d) => deviceNames[d] || d).join(", ");
  const off = url(`/alerts/off/?u=${encodeURIComponent(person.uid)}&k=${encodeURIComponent(person.key)}`);
  const rows = releases
    .map((r) => {
      const runsOn = fits(r).map((d) => deviceNames[d] || d).join(", ");
      const kind = r.type === "app" ? "Library app" : "Firmware";
      return `<p style="margin:0 0 18px"><a href="${esc(url(r.path))}" style="font-size:18px;font-weight:bold;color:#12161a">${esc(title(r))}</a><br>
<span style="color:#5b646c;font-size:14px">${esc(kind)}${runsOn ? ` · ${esc(r.type === "app" ? "syncs" : "runs on")} ${esc(runsOn)}` : ""}</span><br>
${esc(plain(r.blurb))}</p>`;
    })
    .join("\n");
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px;background:#f3f4f0;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#12161a">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#9c3f00">Quitanda · fresh in</p>
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.2">${releases.length === 1 ? "A new version is out" : `${releases.length} new versions are out`}</h1>
${rows}
<p style="margin:0 0 24px"><a href="${esc(url("/releases/"))}" style="color:#12161a">See everything that's new</a></p>
<hr style="border:0;border-top:1px solid #dcdfd8;margin:0 0 16px">
<p style="margin:0;font-size:13px;color:#5b646c">You asked Quitanda to email you about: ${esc(asked)}. This address is used for these alerts and nothing else.<br>
<a href="${esc(off)}" style="color:#5b646c">Stop these emails</a> · <a href="${esc(url("/account/#alerts"))}" style="color:#5b646c">Change which iPods</a> · <a href="${esc(url("/privacy/"))}" style="color:#5b646c">Privacy</a></p>
</div></body></html>`;
  return { subject, html };
}

/* ---------- reading who signed up ---------- */

const b64url = (input) => Buffer.from(input).toString("base64url");

/** Trades a service-account key for a short-lived token that can read the database. */
export async function accessToken(account, fetchImpl = fetch) {
  const now = Math.floor(Date.now() / 1000);
  const aud = account.token_uri || "https://oauth2.googleapis.com/token";
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/datastore", aud, iat: now, exp: now + 600,
  }))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");
  const res = await fetchImpl(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google refused the database key (${res.status}).`);
  return (await res.json()).access_token;
}

const text = (field) => field?.stringValue ?? "";

/** Every document in a collection, read a page at a time. */
async function listDocs({ origin, project, token, collection, fetchImpl }) {
  const docs = [];
  let pageToken = "";
  do {
    const url = `${origin}/v1/projects/${project}/databases/(default)/documents/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`The database refused to list ${collection} (${res.status}).`);
    const page = await res.json();
    docs.push(...(page.documents || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return docs;
}

export async function loadPeople(options) {
  const docs = await listDocs({ ...options, collection: "alerts" });
  return docs.map((d) => ({
    uid: d.name.split("/").pop(),
    email: text(d.fields?.email),
    key: text(d.fields?.key),
    off: !!text(d.fields?.off),
    devices: (d.fields?.devices?.arrayValue?.values || []).map(text).filter(Boolean),
  }));
}

export const loadAdminIds = async (options) => (await listDocs({ ...options, collection: "admins" })).map((d) => d.name.split("/").pop());

/* ---------- sending ---------- */

const noAddresses = (s) => String(s ?? "").replace(/[^\s"'<>]+@[^\s"'<>]+/g, "(address)").slice(0, 200);

/** Sends one email through Brevo. Resolves to null on success, or a short reason. */
export async function sendOne({ origin = "https://api.brevo.com", apiKey, from, to, subject, html, fetchImpl = fetch }) {
  const res = await fetchImpl(`${origin}/v3/smtp/email`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html, tags: ["release-alert"] }),
  });
  if (res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return `${res.status} ${noAddresses(body.code || "")} ${noAddresses(body.message || "")}`.trim();
}

/**
 * Emails everyone who matches. Returns { sent, failed, skipped, reasons }.
 * Stops at the daily cap, and after three failures in a row (a bad key or an
 * unverified sender fails every time, so there is no point going on).
 */
export async function sendAll({ matches, site, deviceNames, dryRun = false, log = console.log, ...brevo }) {
  const result = { sent: 0, failed: 0, skipped: 0, reasons: [] };
  let streak = 0;
  for (const match of matches) {
    if (result.sent >= DAILY_CAP || streak >= 3) { result.skipped++; continue; }
    const { subject, html } = compose({ ...match, site, deviceNames });
    if (dryRun) { result.sent++; continue; }
    const problem = await sendOne({ ...brevo, to: match.person.email, subject, html });
    if (problem) {
      result.failed++;
      streak++;
      if (!result.reasons.includes(problem)) result.reasons.push(problem);
    } else {
      result.sent++;
      streak = 0;
    }
  }
  if (result.skipped && streak >= 3) log("Stopped after three failures in a row.");
  else if (result.skipped) log(`Reached today's limit of ${DAILY_CAP} emails. ${result.skipped} people weren't emailed.`);
  return result;
}

/* ---------- the nightly run ---------- */

async function loadListings() {
  const { default: written } = await import(new URL("src/data/catalog.js", root));
  const { applyCommunity } = await import(new URL("src/lib/community.js", root));
  const community = JSON.parse(readFileSync(fileURLToPath(new URL("src/data/community.json", root)), "utf8"));
  const catalog = applyCommunity(written, community);
  const tag = (list, type, prefix) => (list || []).filter((x) => !x.draft).map((x) => ({ ...x, type, path: `${prefix}${x.id}/` }));
  return {
    listings: [...tag(catalog.firmwares, "firmware", "/firmware/"), ...tag(catalog.apps, "app", "/apps/")],
    deviceNames: Object.fromEntries(catalog.devices.map((d) => [d.id, d.short])),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const testId = args.includes("--test") ? args[args.indexOf("--test") + 1] : "";
  const beforePath = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--test");
  const env = process.env;

  const { listings, deviceNames } = await loadListings();
  const after = JSON.parse(readFileSync(statsPath, "utf8"));
  let releases;
  if (testId) {
    const item = listings.find((x) => x.id === testId);
    if (!item) throw new Error(`No listing called "${testId}".`);
    releases = [{ ...item, version: after.repos?.[testId]?.version || item.version || "(test)", updated: after.repos?.[testId]?.updated || item.updated }];
  } else {
    if (!beforePath) throw new Error("Give the stats file from before the refresh, or use --test <listing id>.");
    releases = newReleases(JSON.parse(readFileSync(beforePath, "utf8")), after, listings);
  }
  if (!releases.length) return console.log("No new releases tonight. No alerts to send.");
  console.log(`${testId ? "Test alert" : "New"}: ${releases.map(title).join(", ")}`);

  if (!env.FIREBASE_SERVICE_ACCOUNT && !env.FIRESTORE_ORIGIN) return console.log("FIREBASE_SERVICE_ACCOUNT isn't set, so nobody can be looked up. No alerts sent.");
  if (!env.BREVO_API_KEY && !dryRun) return console.log("BREVO_API_KEY isn't set. No alerts sent.");

  // Tests point FIRESTORE_ORIGIN at the local emulator, which takes "owner" as a token.
  const account = env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) : {};
  const db = {
    origin: env.FIRESTORE_ORIGIN || "https://firestore.googleapis.com",
    project: account.project_id || "quitanda-95fa7",
    token: env.FIRESTORE_ORIGIN ? "owner" : await accessToken(account),
    fetchImpl: fetch,
  };
  let people = await loadPeople(db);
  if (testId) {
    const admins = new Set(await loadAdminIds(db));
    people = people.filter((p) => admins.has(p.uid));
  }
  const matches = matchPeople(people, releases);
  console.log(`${people.length} ${testId ? "admin sign-ups" : "sign-ups"}, ${matches.length} to email.`);
  if (!matches.length) return;

  const result = await sendAll({
    matches,
    site: env.SITE_URL || "https://quitanda.mrbarkan.com",
    deviceNames,
    dryRun,
    origin: env.BREVO_ORIGIN || "https://api.brevo.com",
    apiKey: env.BREVO_API_KEY,
    from: { name: env.ALERTS_FROM_NAME || "Quitanda", email: env.ALERTS_FROM_EMAIL || "opa@mrbarkan.com" },
  });
  console.log(`${dryRun ? "Would send" : "Sent"} ${result.sent}. Failed ${result.failed}.`);
  for (const reason of result.reasons) console.log(`Brevo said: ${reason}`);
  if (result.failed) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(noAddresses(err.message));
    process.exitCode = 1;
  });
}

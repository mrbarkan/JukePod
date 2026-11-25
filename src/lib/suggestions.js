// Listings people suggest: a new firmware, app or mod, or a fix to one that
// is already listed. Loaded on demand, like the rest of the Firebase code.
//
// Approving a suggestion publishes it: its public side is saved in
// `community`, and the nightly build (scripts/refresh-community.mjs) turns
// that into a listing page, or applies the fix, and credits the sender.
// Trusted people's suggestions publish the moment they're sent.
import "./auth.js"; // sets up sign-in (and the emulators, when testing) first
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, writeBatch, query, where, limit, serverTimestamp } from "firebase/firestore/lite";
import { app } from "./firebase-app.js";

const auth = getAuth(app);
const db = getFirestore(app);

const clean = (text, max) => String(text || "").trim().slice(0, max);
const isSlug = (v) => /^[a-z0-9-]{1,60}$/.test(v || "");
const slug = (text) => clean(text, 120).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "") || "listing";
const plainDoc = (snap) => {
  const data = snap.data();
  for (const key of ["createdAt", "reviewedAt", "publishedAt", "addedAt"]) if (data[key]?.toDate) data[key] = data[key].toDate().toISOString();
  return { id: snap.id, ...data };
};
const newestFirst = (list) => list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

export const KINDS = { firmware: "Firmware", app: "Library app", mod: "Hardware mod", other: "Something else" };
export const FIXES = { link: "The link is broken or wrong", ipods: "The iPods it works on are wrong", text: "Something else in the text" };

/**
 * What the signed-in person may publish without review: "all" for admins,
 * "new" (new listings, not fixes) for trusted contributors, or "" for nothing.
 */
export async function trustLevel(uid = auth.currentUser?.uid) {
  if (!uid) return "";
  try {
    if ((await getDoc(doc(db, "admins", uid))).exists()) return "all";
  } catch { /* not an admin */ }
  try {
    return (await getDoc(doc(db, "trusted", uid))).exists() ? "new" : "";
  } catch {
    return "";
  }
}

/** True if this suggestion would publish straight away at this trust level. */
export const publishesNow = (level, action) => level === "all" || (level === "new" && action !== "fix");

/**
 * The public record the nightly build reads. `edits` are the reviewer's
 * changes (name, url, devices, maker, blurb, category); the rest comes from
 * the suggestion. Only the name of someone who asked to be credited goes in.
 */
export function communityRecord(s, edits = {}) {
  const pick = (key, max) => clean(edits[key] ?? s[key], max);
  const name = pick("title", 80) || clean(s.title, 80);
  const record = {
    kind: KINDS[s.kind] ? s.kind : "other",
    action: s.action === "fix" ? "fix" : "add",
    itemId: s.action === "fix" && isSlug(s.itemId) ? s.itemId : slug(name),
    name,
    publishedAt: serverTimestamp(),
  };
  if (s.credit && clean(s.name, 40)) record.credit = clean(s.name, 40);
  const url = pick("url", 300);
  const fixes = s.fixes || [];
  const wantsLink = record.action === "add" || fixes.includes("link");
  const wantsIpods = record.action === "add" || fixes.includes("ipods");
  if (url && /^https?:\/\/[^ ]+$/.test(url) && wantsLink) record.url = url;
  const devices = (edits.devices ?? s.devices ?? []).filter(isSlug).slice(0, 20);
  if (devices.length && wantsIpods) record.devices = devices;
  if (record.action === "add") {
    if (pick("maker", 60)) record.maker = pick("maker", 60);
    const blurb = clean(edits.blurb ?? s.details, 600);
    if (blurb) record.blurb = blurb;
    if (clean(edits.category, 40)) record.category = clean(edits.category, 40);
  }
  return record;
}

/**
 * Saves a suggestion from the signed-in person. A trusted person's goes
 * straight to the site. Returns { id, published }. Throws with a message to show.
 */
export async function sendSuggestion({ kind, action, itemId, title, url, details, devices, maker, fixes, credit }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (!clean(title, 80)) throw new Error("Give it a name.");
  if (!clean(details, 2000)) throw new Error("Add a few details, so it can be checked.");
  const link = clean(url, 300);
  if (link && !/^https?:\/\/[^ ]+$/.test(link)) throw new Error("The link should start with https://");
  const [profile, level] = await Promise.all([getDoc(doc(db, "users", user.uid)), trustLevel(user.uid)]);
  const trusted = publishesNow(level, action);
  const record = {
    uid: user.uid,
    name: clean(profile.data()?.displayName || user.displayName, 40) || "Friend",
    kind: KINDS[kind] ? kind : "other",
    action: action === "fix" ? "fix" : "add",
    title: clean(title, 80),
    details: clean(details, 2000),
    credit: !!credit,
    status: trusted ? "added" : "new",
    createdAt: serverTimestamp(),
  };
  if (link) record.url = link;
  if (record.action === "fix" && isSlug(itemId)) record.itemId = itemId;
  const ipods = (devices || []).filter(isSlug).slice(0, 20);
  if (ipods.length) record.devices = ipods;
  if (record.action === "add" && clean(maker, 60)) record.maker = clean(maker, 60);
  const fixList = (fixes || []).filter((f) => FIXES[f]).slice(0, 3);
  if (record.action === "fix" && fixList.length) record.fixes = fixList;

  const ref = doc(collection(db, "suggestions"));
  if (!trusted) {
    await setDoc(ref, record);
    return { id: ref.id, published: false };
  }
  const batch = writeBatch(db);
  batch.set(ref, record);
  batch.set(doc(db, "community", ref.id), communityRecord(record));
  await batch.commit();
  return { id: ref.id, published: true };
}

export async function mySuggestions(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, "suggestions"), where("uid", "==", uid), limit(200)));
  return newestFirst(snap.docs.map(plainDoc));
}

/** Removes a suggestion, and takes it off the site at the next build if it was published. */
export async function deleteSuggestion(id) {
  // The public record goes first: once the suggestion is gone, nobody can.
  await deleteDoc(doc(db, "community", id));
  await deleteDoc(doc(db, "suggestions", id));
}

/** Everything published from suggestions. Public. */
export async function communityList() {
  const snap = await getDocs(query(collection(db, "community"), limit(500)));
  return snap.docs.map(plainDoc).sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
}

/* ---------- admins ---------- */

export async function suggestionsByStatus(status) {
  const snap = await getDocs(query(collection(db, "suggestions"), where("status", "==", status), limit(100)));
  return newestFirst(snap.docs.map(plainDoc));
}

/** Marks a suggestion declined, or back to waiting. */
export async function reviewSuggestion(id, status, note) {
  const change = { status, reviewedAt: serverTimestamp() };
  if (clean(note, 500)) change.reviewNote = clean(note, 500);
  await updateDoc(doc(db, "suggestions", id), change);
}

/**
 * Approves a suggestion and publishes it in one step. `edits` are the
 * reviewer's touch-ups to what goes on the site. For "Something else" and
 * fixes to the wording, nothing changes on the site by itself: the record
 * still credits the sender, and the change is made by hand.
 */
export async function publishSuggestion(s, edits = {}, note = "") {
  const batch = writeBatch(db);
  const change = { status: "added", reviewedAt: serverTimestamp() };
  if (clean(note, 500)) change.reviewNote = clean(note, 500);
  batch.update(doc(db, "suggestions", s.id), change);
  batch.set(doc(db, "community", s.id), communityRecord(s, edits));
  await batch.commit();
}

/** Takes something off the site at the next build. The suggestion itself is kept. */
export function unpublish(id) {
  return deleteDoc(doc(db, "community", id));
}

export async function trustedList() {
  const snap = await getDocs(query(collection(db, "trusted"), limit(200)));
  return snap.docs.map(plainDoc).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function trust(uid, name) {
  return setDoc(doc(db, "trusted", uid), { name: clean(name, 40) || "Friend", addedAt: serverTimestamp() });
}

export function untrust(uid) {
  return deleteDoc(doc(db, "trusted", uid));
}

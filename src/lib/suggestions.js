// Listings people suggest: a new firmware, app or mod, or a fix to one that
// is already listed. Loaded on demand, like the rest of the Firebase code.
import "./auth.js"; // sets up sign-in (and the emulators, when testing) first
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, limit, where, writeBatch, serverTimestamp } from "firebase/firestore/lite";
import { app } from "./firebase-app.js";

const auth = getAuth(app);
const db = getFirestore(app);

const clean = (text, max) => String(text || "").trim().slice(0, max);
const plainDoc = (snap) => {
  const data = snap.data();
  for (const key of ["createdAt", "reviewedAt"]) if (data[key]?.toDate) data[key] = data[key].toDate().toISOString();
  return { id: snap.id, ...data };
};
const newestFirst = (list) => list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

export const KINDS = { firmware: "Firmware", app: "Library app", mod: "Hardware mod", other: "Something else" };

/** Saves a suggestion from the signed-in person. Throws with a message to show. */
export async function sendSuggestion({ kind, action, itemId, title, url, details, credit }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (!clean(title, 80)) throw new Error("Give it a name.");
  if (!clean(details, 2000)) throw new Error("Add a few details, so it can be checked.");
  const link = clean(url, 300);
  if (link && !/^https?:\/\/[^ ]+$/.test(link)) throw new Error("The link should start with https://");
  const profile = await getDoc(doc(db, "users", user.uid));
  const record = {
    uid: user.uid,
    name: clean(profile.data()?.displayName || user.displayName, 40) || "Friend",
    kind: KINDS[kind] ? kind : "other",
    action: action === "fix" ? "fix" : "add",
    title: clean(title, 80),
    details: clean(details, 2000),
    credit: !!credit,
    status: "new",
    createdAt: serverTimestamp(),
  };
  if (link) record.url = link;
  if (record.action === "fix" && /^[a-z0-9-]{1,60}$/.test(itemId || "")) record.itemId = itemId;
  const ref = await addDoc(collection(db, "suggestions"), record);
  return ref.id;
}

export async function mySuggestions(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, "suggestions"), where("uid", "==", uid), limit(200)));
  return newestFirst(snap.docs.map(plainDoc));
}

/** Removes a suggestion and its line on the thank-you list, if it has one. */
export async function deleteSuggestion(id) {
  await deleteDoc(doc(db, "credits", id));
  await deleteDoc(doc(db, "suggestions", id));
}

/** The public thank-you list: who helped, and with what. */
export async function thanksList() {
  const snap = await getDocs(query(collection(db, "credits"), limit(500)));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, addedAt: data.addedAt?.toDate ? data.addedAt.toDate().toISOString() : "" };
  }).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/* ---------- admins ---------- */

export async function suggestionsByStatus(status) {
  const snap = await getDocs(query(collection(db, "suggestions"), where("status", "==", status), limit(100)));
  return newestFirst(snap.docs.map(plainDoc));
}

/**
 * Marks a suggestion added or declined. Added ones whose sender asked for
 * credit get a line on the public thank-you list; nothing else is made public.
 */
export async function reviewSuggestion(suggestion, status, note) {
  const change = { status, reviewedAt: serverTimestamp() };
  if (clean(note, 500)) change.reviewNote = clean(note, 500);
  const batch = writeBatch(db);
  batch.update(doc(db, "suggestions", suggestion.id), change);
  const credit = doc(db, "credits", suggestion.id);
  if (status === "added" && suggestion.credit) {
    batch.set(credit, { name: suggestion.name, title: suggestion.title, kind: suggestion.kind, action: suggestion.action, addedAt: serverTimestamp() });
  } else {
    batch.delete(credit);
  }
  await batch.commit();
}

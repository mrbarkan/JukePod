// A signed-in person's private settings and their data rights: the role
// they chose, the newsletter opt-in, a copy of everything held about them,
// and deleting it all. Loaded on demand.
import "./auth.js"; // sets up sign-in (and the emulators, when testing) first
import { getAuth, deleteUser } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, limit, serverTimestamp } from "firebase/firestore/lite";
import { app } from "./firebase-app.js";

const auth = getAuth(app);
const db = getFirestore(app);

/** Names the wording a subscriber agreed to. Change it when the wording changes. */
export const CONSENT = "newsletter-v1";

const clean = (text, max) => String(text || "").trim().slice(0, max);
const plain = (data) => {
  if (!data) return null;
  const out = { ...data };
  for (const [key, value] of Object.entries(out)) if (value?.toDate) out[key] = value.toDate().toISOString();
  return out;
};
const me = () => {
  if (!auth.currentUser) throw new Error("Sign in first.");
  return auth.currentUser;
};
const read = async (path, id) => {
  const snap = await getDoc(doc(db, path, id));
  return snap.exists() ? plain(snap.data()) : null;
};

export const loadMember = () => read("members", me().uid);

/** Saves the role chosen on the welcome page: "user" or "creator". */
export async function saveMember(role) {
  const existing = await loadMember();
  const record = { role, updatedAt: serverTimestamp() };
  record.onboardedAt = existing?.onboardedAt ? new Date(existing.onboardedAt) : serverTimestamp();
  await setDoc(doc(db, "members", me().uid), record);
}

/** The newsletter needs a verified address to send to; Google sign-in provides one. */
export const canSubscribe = () => !!(auth.currentUser?.email && auth.currentUser.emailVerified);
export const myEmail = () => auth.currentUser?.email || "";
export const loadSubscription = () => read("subscribers", me().uid);

export async function subscribe(name) {
  const user = me();
  if (!canSubscribe()) throw new Error("Your sign-in has no verified email address, so we can't send you the newsletter.");
  if (!clean(name, 80)) throw new Error("Enter the name to greet you by.");
  await setDoc(doc(db, "subscribers", user.uid), { email: user.email, name: clean(name, 80), consent: CONSENT, subscribedAt: serverTimestamp() });
}

/** Unsubscribing removes the record; nothing is kept. */
export const unsubscribe = () => deleteDoc(doc(db, "subscribers", me().uid));

async function myReports(uid) {
  const snap = await getDocs(query(collection(db, "reports"), where("uid", "==", uid), limit(500)));
  return snap.docs.map((d) => ({ id: d.id, ...plain(d.data()) }));
}

async function myFlags(uid) {
  const snap = await getDocs(query(collection(db, "flags"), where("uid", "==", uid), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...plain(d.data()) }));
}

/** Everything Quitanda holds about the signed-in person, as one object. */
export async function exportMyData() {
  const user = me();
  const { myThemes } = await import("./themes-write.js");
  const [profile, member, newsletter, themes, flags, reports] = await Promise.all([
    read("users", user.uid), loadMember(), loadSubscription(), myThemes(), myFlags(user.uid), myReports(user.uid),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    signIn: {
      userId: user.uid,
      email: user.email,
      name: user.displayName,
      picture: user.photoURL,
      methods: user.providerData.map((p) => p.providerId),
      created: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime,
    },
    publicProfile: profile,
    settings: member,
    newsletter,
    themes,
    problemsYouReported: flags,
    worksOnMyIpodReports: reports,
  };
}

/**
 * Deletes the account and everything attached to it: shared themes and
 * their files, reports sent, the newsletter record, settings, the public
 * profile, and finally the sign-in itself.
 */
export async function deleteEverything() {
  const user = me();
  // The sign-in can only be removed shortly after signing in. Check first,
  // so nothing is half-deleted if it would be refused.
  if (Date.now() - Date.parse(user.metadata.lastSignInTime) > 4 * 60 * 1000) {
    throw Object.assign(new Error("Sign in again first."), { code: "auth/requires-recent-login" });
  }
  const { myThemes, deleteTheme } = await import("./themes-write.js");
  for (const theme of await myThemes()) await deleteTheme(theme);
  for (const flag of await myFlags(user.uid)) await deleteDoc(doc(db, "flags", flag.id));
  for (const report of await myReports(user.uid)) await deleteDoc(doc(db, "reports", report.id));
  await Promise.all(["subscribers", "members", "users"].map((path) => deleteDoc(doc(db, path, user.uid))));
  await deleteUser(user);
}

/* ---------- admins ---------- */

export async function listSubscribers() {
  const snap = await getDocs(query(collection(db, "subscribers"), limit(5000)));
  return snap.docs.map((d) => plain(d.data()));
}

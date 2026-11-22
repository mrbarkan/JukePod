// Sign-in and profiles. This module pulls in Firebase, so it is only ever
// loaded on demand (see src/scripts/account.js): visitors who never sign in
// never download it.
import { getAuth, connectAuthEmulator, onAuthStateChanged, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, deleteUser } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore/lite";
import { EMULATORS } from "./emulator.js";
import { app } from "./firebase-app.js";

const auth = getAuth(app);
const db = getFirestore(app);
if (EMULATORS) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

const PROVIDERS = { google: () => new GoogleAuthProvider(), github: () => new GithubAuthProvider() };

const clean = (text, max) => String(text || "").trim().slice(0, max);

/** Calls back with the signed-in user, or null, now and on every change. */
export function watch(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signIn(providerName) {
  const { user } = await signInWithPopup(auth, PROVIDERS[providerName]());
  await ensureProfile(user);
  return user;
}

export function signOutNow() {
  return signOut(auth);
}

/** Creates the public profile the first time someone signs in. */
async function ensureProfile(user) {
  const ref = doc(db, "users", user.uid);
  if ((await getDoc(ref)).exists()) return;
  const profile = { displayName: clean(user.displayName, 40) || "Friend", updatedAt: serverTimestamp() };
  if (user.photoURL && user.photoURL.length <= 500) profile.photoURL = user.photoURL;
  await setDoc(ref, profile);
}

export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/** Saves the editable profile fields. Throws if the name is empty or the link is not https. */
export async function saveProfile(user, { displayName, bio, link }) {
  const profile = { displayName: clean(displayName, 40), updatedAt: serverTimestamp() };
  if (!profile.displayName) throw new Error("Enter a name.");
  if (clean(bio, 280)) profile.bio = clean(bio, 280);
  if (clean(link, 200)) {
    if (!/^https:\/\//.test(clean(link, 200))) throw new Error("The link must start with https://");
    profile.link = clean(link, 200);
  }
  if (user.photoURL && user.photoURL.length <= 500) profile.photoURL = user.photoURL;
  await setDoc(doc(db, "users", user.uid), profile);
  return profile;
}

export async function isAdmin(uid) {
  try {
    return (await getDoc(doc(db, "admins", uid))).exists();
  } catch {
    return false;
  }
}

/** Removes the profile and the sign-in. Firebase may ask for a fresh sign-in first. */
export async function deleteAccount(user) {
  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
}

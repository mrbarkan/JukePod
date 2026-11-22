// Everything a signed-in person can do with themes: share one, see and
// delete their own, flag someone else's, and (for admins) review the queue.
// Loaded on demand, like the rest of the Firebase code.
import "./auth.js"; // sets up sign-in (and the emulators, when testing) first
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore/lite";
import { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { EMULATORS, storedUrl } from "./emulator.js";
import { app } from "./firebase-app.js";
import { isOwnFile } from "./themes-read.js";

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
if (EMULATORS) connectStorageEmulator(storage, "127.0.0.1", 9199);

/** The storage path inside one of our download links. */
const pathOf = (url) => decodeURIComponent(url.split("/o/")[1].split("?")[0]);

const clean = (text, max) => String(text || "").trim().slice(0, max);
const slug = (text) => clean(text, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme";
const plainDoc = (snap) => {
  const data = snap.data();
  for (const key of ["createdAt", "updatedAt", "reviewedAt"]) if (data[key]?.toDate) data[key] = data[key].toDate().toISOString();
  return { id: snap.id, ...data };
};

/**
 * Uploads the theme file and screenshots, then records the theme as
 * "pending" so it stays hidden until an admin approves it.
 * `shots` are the results of prepareScreenshot(). `onStep` gets progress text.
 */
export async function submitTheme({ file, shots, details, swatch }, onStep = () => {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  const themeRef = doc(collection(db, "themes"));
  const folder = `themes/${user.uid}/${themeRef.id}`;
  const uploaded = [];
  try {
    onStep("Uploading the theme file…");
    const ext = /\.json$/i.test(file.name) ? "json" : "zip";
    const fileRef = ref(storage, `${folder}/file/${slug(details.name)}.${ext}`);
    await uploadBytes(fileRef, file, { contentType: ext === "json" ? "application/json" : "application/zip" });
    uploaded.push(fileRef);
    const fileUrl = storedUrl(await getDownloadURL(fileRef));

    const screenshots = [];
    for (const [i, shot] of shots.entries()) {
      onStep(`Uploading screenshot ${i + 1} of ${shots.length}…`);
      const shotRef = ref(storage, `${folder}/shots/${i + 1}-${Math.random().toString(36).slice(2, 8)}.${shot.ext}`);
      await uploadBytes(shotRef, shot.blob, { contentType: shot.contentType });
      uploaded.push(shotRef);
      screenshots.push({ url: storedUrl(await getDownloadURL(shotRef)), w: shot.w, h: shot.h });
    }

    onStep("Saving…");
    const profile = await getDoc(doc(db, "users", user.uid));
    const record = {
      ownerUid: user.uid,
      ownerName: clean(profile.data()?.displayName || user.displayName, 40) || "Friend",
      name: clean(details.name, 60),
      target: details.target,
      file: { url: fileUrl, name: `${slug(details.name)}.${ext}`, size: file.size },
      screenshots,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (clean(details.targetVersion, 40)) record.targetVersion = clean(details.targetVersion, 40);
    if (clean(details.description, 1000)) record.description = clean(details.description, 1000);
    if (clean(details.license, 80)) record.license = clean(details.license, 80);
    if (details.devices?.length) record.devices = details.devices.slice(0, 20);
    if (swatch) record.swatch = swatch;
    await setDoc(themeRef, record);
    return themeRef.id;
  } catch (err) {
    // Don't leave files behind for a theme that was never recorded.
    await Promise.allSettled(uploaded.map((r) => deleteObject(r)));
    throw err;
  }
}

/** A theme the signed-in person is allowed to see even while it is hidden. */
export async function getThemeAsMember(id) {
  try {
    const snap = await getDoc(doc(db, "themes", id));
    return snap.exists() ? plainDoc(snap) : null;
  } catch {
    return null;
  }
}

export async function myThemes() {
  const user = auth.currentUser;
  if (!user) return [];
  const snap = await getDocs(query(collection(db, "themes"), where("ownerUid", "==", user.uid), orderBy("createdAt", "desc"), limit(50)));
  return snap.docs.map(plainDoc);
}

/** Removes a theme and its files. Works for the owner and for admins. */
export async function deleteTheme(theme) {
  const urls = [theme.file?.url, ...(theme.screenshots || []).map((s) => s.url)].filter(isOwnFile);
  await Promise.allSettled(urls.map((url) => deleteObject(ref(storage, pathOf(url)))));
  await deleteDoc(doc(db, "themes", theme.id));
}

export async function flagTheme(themeId, reason) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  if (!clean(reason, 500)) throw new Error("Say what's wrong with it.");
  await addDoc(collection(db, "flags"), { uid: user.uid, themeId, reason: clean(reason, 500), createdAt: serverTimestamp() });
}

/* ---------- admins ---------- */

export async function themesByStatus(status) {
  const snap = await getDocs(query(collection(db, "themes"), where("status", "==", status), orderBy("createdAt", "desc"), limit(50)));
  return snap.docs.map(plainDoc);
}

export async function reviewTheme(id, status, note) {
  const change = { status, reviewedAt: serverTimestamp() };
  if (clean(note, 500)) change.reviewNote = clean(note, 500);
  await updateDoc(doc(db, "themes", id), change);
}

export async function listFlags() {
  const snap = await getDocs(query(collection(db, "flags"), limit(50)));
  return snap.docs.map(plainDoc);
}

export function dismissFlag(id) {
  return deleteDoc(doc(db, "flags", id));
}

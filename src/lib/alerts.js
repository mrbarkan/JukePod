// A signed-in person's release alerts: which iPods they want an email about
// when new firmware or a new app version comes out. Kept in alerts/{uid}
// with the address they signed in with. Loaded on demand.
import "./auth.js"; // sets up sign-in (and the emulators, when testing) first
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore/lite";
import { app } from "./firebase-app.js";
import { ALERTS_CONSENT } from "./alerts-config.js";

const auth = getAuth(app);
const db = getFirestore(app);

const me = () => {
  if (!auth.currentUser) throw Object.assign(new Error("Sign in first."), { code: "signed-out" });
  return auth.currentUser;
};
const mine = () => doc(db, "alerts", me().uid);

/** Alerts need a verified address to send to; Google sign-in provides one. */
export const canGetAlerts = () => !!(auth.currentUser?.email && auth.currentUser.emailVerified);
export const alertsEmail = () => auth.currentUser?.email || "";

/** A fresh secret for the unsubscribe link: 32 hex characters. */
const newKey = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * The signed-in person's alerts: { email, devices, since } or null. Alerts
 * switched off from an email's unsubscribe link count as none, and what is
 * left of them is removed.
 */
export async function loadAlerts() {
  const snap = await getDoc(mine());
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.off) {
    await deleteDoc(mine()).catch(() => {});
    return null;
  }
  return { email: data.email, devices: data.devices || [], since: data.createdAt?.toDate?.().toISOString() || "" };
}

/** Sets the full list of iPods to hear about ("all" for every iPod). An empty list stops the alerts. */
export async function saveAlerts(devices) {
  const user = me();
  if (!canGetAlerts()) throw new Error("Your sign-in has no verified email address, so we can't email you.");
  const list = [...new Set(devices)].slice(0, 15);
  if (!list.length) return stopAlerts();
  const snap = await getDoc(mine());
  const old = snap.exists() ? snap.data() : null;
  await setDoc(mine(), {
    email: user.email,
    devices: list,
    key: old?.key || newKey(),
    consent: ALERTS_CONSENT,
    createdAt: old?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Adds one iPod to the list, keeping the rest. */
export async function addAlert(device) {
  const current = await loadAlerts();
  await saveAlerts([...(current?.devices || []), device]);
}

/** Stopping removes the record; nothing is kept. */
export const stopAlerts = () => deleteDoc(mine());

/** Everything held about the person's alerts, for "Download my data". */
export async function exportAlerts() {
  const snap = await getDoc(mine());
  if (!snap.exists()) return null;
  const { key, ...rest } = snap.data();
  for (const [k, v] of Object.entries(rest)) if (v?.toDate) rest[k] = v.toDate().toISOString();
  return rest;
}

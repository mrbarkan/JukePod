// The iPods a signed-in person owns, kept privately under their settings:
// members/{uid}/ipods/{id}. Someone can own several, including more than one
// of the same model, so each gets its own ID and an optional nickname.
// "Does it work on yours?" reports name the one they were for. Loaded on demand.
import "./auth.js"; // sets up sign-in (and the emulators, when testing) first
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore/lite";
import { app } from "./firebase-app.js";

const auth = getAuth(app);
const db = getFirestore(app);

/** The most a person can list. The rules don't count, so this is a courtesy limit. */
export const MAX_IPODS = 20;

const me = () => {
  if (!auth.currentUser) throw new Error("Sign in first.");
  return auth.currentUser.uid;
};
const shelf = (uid) => collection(db, "members", uid, "ipods");

/** A fresh ID: "p" and eight letters or digits, which can never look like a model ID. */
const newId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "p" + [...bytes].map((b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
};

/** The signed-in person's iPods, oldest first: [{ id, model, label, addedAt }]. */
export async function loadMyIpods(uid = me()) {
  const snap = await getDocs(shelf(uid));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { id: d.id, model: data.model, label: data.label || "", addedAt: data.addedAt?.toDate?.().toISOString() || "" };
    })
    .sort((a, b) => (a.addedAt || "9").localeCompare(b.addedAt || "9"));
}

export async function addIpod(model, label = "") {
  const uid = me();
  const record = { model, addedAt: serverTimestamp() };
  const name = String(label).trim().slice(0, 40);
  if (name) record.label = name;
  const id = newId();
  await setDoc(doc(shelf(uid), id), record);
  return { id, model, label: name, addedAt: new Date().toISOString() };
}

/** Removing an iPod keeps the reports sent for it: they were true when sent. */
export const removeIpod = (id) => deleteDoc(doc(shelf(me()), id));

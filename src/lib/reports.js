// "Does it work on yours?" Reads everyone's reports for one listing straight
// from the database's public web API, so no Firebase download is needed to
// see them. Sending a report loads Firebase on demand.
import { firebaseConfig } from "./firebase-config.js";
import { DOCS_ORIGIN } from "./emulator.js";

const DOCS = `${DOCS_ORIGIN}/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

/** Counts per device: { "ipod-classic": { works: 3, total: 4 }, … } */
export async function loadReports(itemId) {
  const res = await fetch(`${DOCS}:runQuery?key=${firebaseConfig.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "reports" }],
        where: { fieldFilter: { field: { fieldPath: "itemId" }, op: "EQUAL", value: { stringValue: itemId } } },
        limit: 500,
      },
    }),
  });
  if (!res.ok) throw new Error("Reports couldn't be loaded.");
  const counts = {};
  for (const row of await res.json()) {
    const f = row.document?.fields;
    if (!f?.deviceId) continue;
    const c = (counts[f.deviceId.stringValue] ||= { works: 0, total: 0 });
    c.total++;
    if (f.works?.booleanValue) c.works++;
  }
  return counts;
}

const firebase = async () => {
  await import("./auth.js");
  const [{ getAuth }, store, { app }] = await Promise.all([
    import("firebase/auth"), import("firebase/firestore/lite"), import("./firebase-app.js"),
  ]);
  const user = getAuth(app).currentUser;
  if (!user) throw Object.assign(new Error("Sign in first."), { code: "signed-out" });
  return { user, store, db: store.getFirestore(app) };
};

/** The signed-in person's own reports for one listing, keyed by the iPod (or model) they were for. */
export async function loadMyReports(itemId) {
  const { user, store, db } = await firebase();
  const { collection, getDocs, query, where, limit } = store;
  const snap = await getDocs(query(collection(db, "reports"), where("uid", "==", user.uid), where("itemId", "==", itemId), limit(50)));
  const mine = {};
  for (const d of snap.docs) {
    const r = d.data();
    mine[r.ipodId || r.deviceId] = r.works;
  }
  return mine;
}

/**
 * Saves the signed-in person's report for one of the iPods in their profile:
 * one per listing and iPod, replaceable. Two iPods of the same model each
 * get their own report.
 */
export async function sendReport({ itemId, ipod, works, version, replacesOld = false }) {
  const { user, store, db } = await firebase();
  const { doc, setDoc, deleteDoc, serverTimestamp } = store;
  const record = { uid: user.uid, itemId, deviceId: ipod.model, ipodId: ipod.id, works, updatedAt: serverTimestamp() };
  if (version) record.version = String(version).slice(0, 40);
  await setDoc(doc(db, "reports", `${user.uid}_${itemId}_${ipod.id}`), record);
  // A report from before iPods were listed in profiles names only the model.
  // This one replaces it, so the same iPod isn't counted twice.
  if (replacesOld) await deleteDoc(doc(db, "reports", `${user.uid}_${itemId}_${ipod.model}`)).catch(() => {});
}

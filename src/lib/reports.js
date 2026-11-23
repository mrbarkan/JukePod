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

/** Saves the signed-in person's report: one per listing and iPod, replaceable. */
export async function sendReport({ itemId, deviceId, works, version }) {
  await import("./auth.js");
  const [{ getAuth }, { getFirestore, doc, setDoc, serverTimestamp }, { app }] = await Promise.all([
    import("firebase/auth"), import("firebase/firestore/lite"), import("./firebase-app.js"),
  ]);
  const user = getAuth(app).currentUser;
  if (!user) throw Object.assign(new Error("Sign in first."), { code: "signed-out" });
  const record = { uid: user.uid, itemId, deviceId, works, updatedAt: serverTimestamp() };
  if (version) record.version = String(version).slice(0, 40);
  await setDoc(doc(getFirestore(app), "reports", `${user.uid}_${itemId}_${deviceId}`), record);
}

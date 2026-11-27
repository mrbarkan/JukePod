// The unsubscribe link in a release-alert email. It carries the person's
// account ID and a secret key; writing that key to their record's `off`
// field switches the alerts off. No sign-in and no Firebase download.
import { firebaseConfig } from "./firebase-config.js";
import { DOCS_ORIGIN } from "./emulator.js";

const DOCS = `${DOCS_ORIGIN}/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

/** Resolves to true if the alerts are now off, false if the link is wrong or already gone. */
export async function switchOff(uid, key) {
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid || "") || !/^[a-f0-9]{32}$/.test(key || "")) return false;
  const res = await fetch(`${DOCS}/alerts/${uid}?updateMask.fieldPaths=off&currentDocument.exists=true&key=${firebaseConfig.apiKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { off: { stringValue: key } } }),
  });
  if (res.ok) return true;
  if (res.status >= 500) throw new Error("The request didn't go through.");
  return false;
}

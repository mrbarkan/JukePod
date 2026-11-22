// Tests firestore.rules and storage.rules against the local emulators.
//   npm run emulators      (in one terminal)
//   npm run test:rules     (in another)
import test, { before } from "node:test";
import assert from "node:assert/strict";

const PROJECT = "quitanda-95fa7";
const BUCKET = "quitanda-95fa7.firebasestorage.app";
const ADMIN_UID = "kDqYLokNdCXlX7c9rggaypPbRGA3"; // the UID named in storage.rules
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const DOCS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const FILES = `http://127.0.0.1:9199/v0/b/${BUCKET}/o`;

const json = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function newUser(label, localId) {
  const email = `${label}-${Date.now()}@example.test`;
  const password = "emulator-only-password";
  if (localId) {
    await fetch(`${AUTH}/projects/${PROJECT}/accounts`, { ...json({ localId, email, password }), headers: { "Content-Type": "application/json", Authorization: "Bearer owner" } });
    const res = await (await fetch(`${AUTH}/accounts:signInWithPassword?key=x`, json({ email, password, returnSecureToken: true }))).json();
    return { uid: res.localId, token: res.idToken };
  }
  const res = await (await fetch(`${AUTH}/accounts:signUp?key=x`, json({ email, password, returnSecureToken: true }))).json();
  return { uid: res.localId, token: res.idToken };
}

const enc = (v) =>
  v === null ? { nullValue: null }
  : typeof v === "string" ? { stringValue: v }
  : typeof v === "boolean" ? { booleanValue: v }
  : typeof v === "number" ? { integerValue: String(v) }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: fields(v) } };
const fields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, enc(v)]));
const bearer = (who) => (who ? { Authorization: `Bearer ${who === "owner" ? "owner" : who.token}` } : {});

/** Creates or replaces a document; returns the HTTP status. */
async function put(who, path, data, { update } = {}) {
  const mask = update ? "?" + update.map((f) => `updateMask.fieldPaths=${f}`).join("&") : "";
  const res = await fetch(`${DOCS}/${path}${mask}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...bearer(who) }, body: JSON.stringify({ fields: fields(data) }) });
  return res.status;
}
const get = async (who, path) => (await fetch(`${DOCS}/${path}`, { headers: bearer(who) })).status;
const del = async (who, path) => (await fetch(`${DOCS}/${path}`, { method: "DELETE", headers: bearer(who) })).status;

const fileUrl = (uid, themeId, rest) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/themes%2F${uid}%2F${themeId}%2F${rest}?alt=media&token=t`;
const theme = (uid, id, extra = {}) => ({
  ownerUid: uid, ownerName: "Tester", name: "Test theme", target: "cratedigger", status: "pending",
  file: { url: fileUrl(uid, id, "file%2Ftest.zip"), name: "test.zip", size: 1000 },
  screenshots: [{ url: fileUrl(uid, id, "shots%2F1.png"), w: 320, h: 240 }],
  ...extra,
});

async function upload(who, path, { type = "application/zip", bytes = 200 } = {}) {
  const res = await fetch(`${FILES}?name=${encodeURIComponent(path)}`, {
    method: "POST", headers: { "Content-Type": type, ...(who ? { Authorization: `Firebase ${who.token}` } : {}) }, body: new Uint8Array(bytes),
  });
  return res.status;
}
const fileGet = async (who, path) => (await fetch(`${FILES}/${encodeURIComponent(path)}?alt=media`, { headers: who ? { Authorization: `Firebase ${who.token}` } : {} })).status;
const fileDel = async (who, path) => (await fetch(`${FILES}/${encodeURIComponent(path)}`, { method: "DELETE", headers: who ? { Authorization: `Firebase ${who.token}` } : {} })).status;

let ana, bo, admin;
const RUN = `t${Date.now().toString(36)}`; // the file emulator can't be wiped, so each run uses fresh folders
before(async () => {
  // Start from an empty sign-in list and database so the tests can be rerun.
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  [ana, bo, admin] = await Promise.all([newUser("ana"), newUser("bo"), newUser("admin", ADMIN_UID)]);
  assert.equal(await put("owner", `admins/${admin.uid}`, { role: "owner" }), 200);
});

test("profiles: anyone reads, only the owner writes, no extra fields", async () => {
  assert.equal(await put(ana, `users/${ana.uid}`, { displayName: "Ana" }), 200);
  assert.equal(await get(null, `users/${ana.uid}`), 200);
  assert.equal(await put(bo, `users/${ana.uid}`, { displayName: "Not Ana" }), 403);
  assert.equal(await put(null, `users/anyone`, { displayName: "x" }), 403);
  assert.equal(await put(ana, `users/${ana.uid}`, { displayName: "Ana", email: "a@b.c" }), 403);
  assert.equal(await put(ana, `users/${ana.uid}`, { displayName: "Ana", link: "http://insecure.example" }), 403);
});

test("the admin list can't be read or changed by members", async () => {
  assert.equal(await get(ana, `admins/${admin.uid}`), 403);
  assert.equal(await get(null, `admins/${admin.uid}`), 403);
  assert.equal(await put(ana, `admins/${ana.uid}`, { role: "owner" }), 403);
  assert.equal(await get(admin, `admins/${admin.uid}`), 200);
});

test("a new theme must be pending, owned by its author, and point at their own files", async () => {
  assert.equal(await put(ana, "themes/t-approved", theme(ana.uid, "t-approved", { status: "approved" })), 403);
  assert.equal(await put(ana, "themes/t-other", theme(bo.uid, "t-other")), 403);
  assert.equal(await put(null, "themes/t-anon", theme("nobody", "t-anon")), 403);
  assert.equal(await put(ana, "themes/t-ext", theme(ana.uid, "t-ext", { file: { url: "https://evil.example/malware.zip", name: "x.zip", size: 1 } })), 403);
  assert.equal(await put(ana, "themes/t-theirs", theme(ana.uid, "t-theirs", { file: { url: fileUrl(bo.uid, "x", "file%2Fa.zip"), name: "a.zip", size: 1 } })), 403);
  assert.equal(await put(ana, "themes/t-shot", theme(ana.uid, "t-shot", { screenshots: [{ url: "https://evil.example/a.png", w: 1, h: 1 }] })), 403);
  const seven = Array.from({ length: 7 }, (_, i) => ({ url: fileUrl(ana.uid, "t-many", `shots%2F${i}.png`), w: 1, h: 1 }));
  assert.equal(await put(ana, "themes/t-many", theme(ana.uid, "t-many", { screenshots: seven })), 403);
  assert.equal(await put(ana, "themes/t-extra", theme(ana.uid, "t-extra", { featured: true })), 403);
  assert.equal(await put(ana, "themes/t1", theme(ana.uid, "t1")), 200);
});

test("a pending theme is visible only to its owner and admins", async () => {
  assert.equal(await get(null, "themes/t1"), 403);
  assert.equal(await get(bo, "themes/t1"), 403);
  assert.equal(await get(ana, "themes/t1"), 200);
  assert.equal(await get(admin, "themes/t1"), 200);
});

test("only an admin can approve, and can change nothing else", async () => {
  assert.equal(await put(ana, "themes/t1", { status: "approved" }, { update: ["status"] }), 403);
  assert.equal(await put(bo, "themes/t1", { status: "approved" }, { update: ["status"] }), 403);
  assert.equal(await put(admin, "themes/t1", { name: "Renamed by admin" }, { update: ["name"] }), 403);
  assert.equal(await put(admin, "themes/t1", { status: "published" }, { update: ["status"] }), 403);
  assert.equal(await put(admin, "themes/t1", { status: "approved" }, { update: ["status"] }), 200);
  assert.equal(await get(null, "themes/t1"), 200);
});

test("the public gallery query returns approved themes only", async () => {
  await put(ana, "themes/t2", theme(ana.uid, "t2", { name: "Still hidden" }));
  const query = (where) => fetch(`${DOCS}:runQuery`, json({ structuredQuery: { from: [{ collectionId: "themes" }], where } }));
  const approved = await query({ fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "approved" } } });
  assert.equal(approved.status, 200);
  const names = (await approved.json()).filter((r) => r.document).map((r) => r.document.fields.name.stringValue);
  assert.ok(names.includes("Test theme") && !names.includes("Still hidden"));
  const everything = await fetch(`${DOCS}/themes`);
  assert.equal(everything.status, 403);
});

test("an owner's edit sends an approved theme back for review", async () => {
  assert.equal(await put(ana, "themes/t1", { description: "Now with a description" }, { update: ["description"] }), 403);
  assert.equal(await put(ana, "themes/t1", { description: "Now with a description", status: "pending" }, { update: ["description", "status"] }), 200);
  assert.equal(await get(null, "themes/t1"), 403);
});

test("themes are deleted by their owner or an admin, nobody else", async () => {
  assert.equal(await del(bo, "themes/t1"), 403);
  assert.equal(await del(null, "themes/t1"), 403);
  assert.equal(await del(ana, "themes/t1"), 200);
  assert.equal(await del(admin, "themes/t2"), 200);
});

test("reports: one per person, listing and iPod", async () => {
  const good = { uid: ana.uid, itemId: "rockpod", deviceId: "ipod-classic", works: true };
  assert.equal(await put(ana, `reports/${ana.uid}_rockpod_ipod-classic`, good), 200);
  assert.equal(await put(ana, `reports/some-other-id`, good), 403);
  assert.equal(await put(bo, `reports/${ana.uid}_rockpod_ipod-classic`, good), 403);
  assert.equal(await put(ana, `reports/${ana.uid}_rockpod_ipod-classic`, { ...good, works: "yes" }), 403);
  assert.equal(await get(null, `reports/${ana.uid}_rockpod_ipod-classic`), 200);
});

test("flags: members create them, only admins read them", async () => {
  assert.equal(await put(bo, "flags/f1", { uid: bo.uid, themeId: "t1", reason: "Contains Apple fonts" }), 200);
  assert.equal(await put(null, "flags/f2", { uid: "x", themeId: "t1", reason: "spam" }), 403);
  assert.equal(await put(bo, "flags/f3", { uid: ana.uid, themeId: "t1", reason: "pretending" }), 403);
  assert.equal(await get(bo, "flags/f1"), 403);
  assert.equal(await get(admin, "flags/f1"), 200);
  assert.equal(await del(admin, "flags/f1"), 200);
});

test("files: only the owner uploads, into their own folder, and only theme files", async () => {
  const mine = `themes/${ana.uid}/${RUN}/file/theme.zip`;
  assert.equal(await upload(ana, mine), 200);
  assert.equal(await upload(ana, mine), 403, "an uploaded file can't be replaced");
  assert.equal(await upload(ana, `themes/${bo.uid}/${RUN}/file/theme.zip`), 403);
  assert.equal(await upload(null, `themes/${ana.uid}/${RUN}/file/other.zip`), 403);
  assert.equal(await upload(ana, `themes/${ana.uid}/${RUN}/file/setup.exe`), 403);
  assert.equal(await upload(ana, `themes/${ana.uid}/${RUN}/file/big.zip`, { bytes: 5 * 1024 * 1024 + 1 }), 403);
  assert.equal(await upload(ana, `somewhere/else.zip`), 403);
});

test("screenshots must be images", async () => {
  assert.equal(await upload(ana, `themes/${ana.uid}/${RUN}/shots/1.png`, { type: "image/png" }), 200);
  assert.equal(await upload(ana, `themes/${ana.uid}/${RUN}/shots/2.html`, { type: "text/html" }), 403);
  assert.equal(await upload(ana, `themes/${ana.uid}/${RUN}/shots/3.svg`, { type: "image/svg+xml" }), 403);
  assert.equal(await upload(ana, `themes/${ana.uid}/${RUN}/shots/4.png`, { type: "image/png", bytes: 1536 * 1024 + 1 }), 403);
});

test("files are read directly only by their owner or an admin, and deleted the same way", async () => {
  const mine = `themes/${ana.uid}/${RUN}/file/theme.zip`;
  assert.equal(await fileGet(null, mine), 403);
  assert.equal(await fileGet(bo, mine), 403);
  assert.equal(await fileGet(ana, mine), 200);
  assert.equal(await fileGet(admin, mine), 200);
  assert.equal(await fileDel(bo, mine), 403);
  assert.equal(await fileDel(admin, mine), 204);
  assert.equal(await fileDel(ana, `themes/${ana.uid}/${RUN}/shots/1.png`), 204);
});

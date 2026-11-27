import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { newReleases, matchPeople, compose, loadPeople, sendOne, sendAll, accessToken, DAILY_CAP } from "./send-alerts.mjs";

const rockpod = { id: "rockpod", name: "Rockpod", type: "firmware", path: "/firmware/rockpod/", devices: ["ipod-classic", "ipod-video"], blurb: "A `Rockbox` fork." };
const wheel = { id: "rockwheel", name: "RockWheel", type: "firmware", path: "/firmware/rockwheel/", devices: ["ipod-video"], partial: ["ipod-photo"], blurb: "Apple-style menus." };
const pod = { id: "iopenpod", name: "iOpenPod", type: "app", path: "/apps/iopenpod/", devices: ["ipod-mini"], blurb: "Library app." };
const listings = [rockpod, wheel, pod, { id: "rodbox", name: "RodBox", devices: ["ipod-classic"] }];
const person = (uid, devices, extra = {}) => ({ uid, email: `${uid}@example.test`, key: "0123456789abcdef0123456789abcdef", devices, off: false, ...extra });
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("a version change is a release; an unchanged or unnumbered one isn't", () => {
  const before = { repos: { rockpod: { version: "5.5" }, rockwheel: { version: "2.0.1" }, rodbox: { updated: "2026-11-01" } } };
  const after = { repos: { rockpod: { version: "5.6", updated: "2026-11-26" }, rockwheel: { version: "2.0.1" }, rodbox: { updated: "2026-11-25" } } };
  const found = newReleases(before, after, listings, "2026-11-27");
  assert.deepEqual(found.map((r) => `${r.id} ${r.version}`), ["rockpod 5.6"]);
});

test("a listing tracked for the first time only counts if its release is recent", () => {
  const before = { repos: {} };
  const after = { repos: { rockpod: { version: "5.5", updated: "2026-08-01" }, rockwheel: { version: "2.1.0", updated: "2026-11-24" }, iopenpod: { version: "2.1.4" } } };
  assert.deepEqual(newReleases(before, after, listings, "2026-11-27").map((r) => r.id), ["rockwheel"]);
});

test("people hear only about their iPods, partly supported ones included", () => {
  const releases = [{ ...rockpod, version: "5.6" }, { ...wheel, version: "2.1.0" }];
  const people = [
    person("classic", ["ipod-classic"]),
    person("photo", ["ipod-photo"]),
    person("everything", ["all"]),
    person("mini", ["ipod-mini"]),
    person("stopped", ["ipod-classic"], { off: true }),
    person("noaddress", ["ipod-classic"], { email: "" }),
  ];
  const got = Object.fromEntries(matchPeople(people, releases).map((m) => [m.person.uid, m.releases.map((r) => r.id)]));
  assert.deepEqual(got, { classic: ["rockpod"], photo: ["rockwheel"], everything: ["rockpod", "rockwheel"] });
});

test("the email names the release, links to it and carries a working unsubscribe link", () => {
  const { subject, html } = compose({
    person: person("u1", ["ipod-classic", "ipod-video"]),
    releases: [{ ...rockpod, version: "5.6" }],
    site: "https://quitanda.example/",
    deviceNames: { "ipod-classic": "Classic", "ipod-video": "Video" },
  });
  assert.equal(subject, "Rockpod 5.6 is out");
  assert.ok(html.includes('href="https://quitanda.example/firmware/rockpod/"'));
  assert.ok(html.includes("runs on Classic, Video"));
  assert.ok(html.includes("A Rockbox fork."), "backticks from the catalog are dropped");
  assert.ok(html.includes('href="https://quitanda.example/alerts/off/?u=u1&amp;k=0123456789abcdef0123456789abcdef"'));
  assert.ok(html.includes("You asked Quitanda to email you about: Classic, Video."));
  assert.ok(!html.includes("u1@example.test"), "the address isn't repeated in the body");
});

test("several releases share one email, and catalog text can't inject HTML", () => {
  const evil = { ...pod, name: "<script>x</script>", version: "1.0", blurb: '"><img src=x>' };
  const { subject, html } = compose({ person: person("u1", ["all"]), releases: [{ ...rockpod, version: "5.6" }, evil, { ...wheel, version: "2.1.0" }], site: "https://q.example" });
  assert.equal(subject, "Rockpod 5.6 and 2 more updates for your iPod");
  assert.ok(html.includes("3 new versions are out"));
  assert.ok(!html.includes("<script>") && !html.includes("<img"));
  assert.ok(html.includes("email you about: every release"));
});

test("sign-ups are read a page at a time, with their key and off switch", async () => {
  const doc = (id, fields) => ({ name: `projects/p/databases/(default)/documents/alerts/${id}`, fields });
  const pages = {
    "": { documents: [doc("a", { email: { stringValue: "a@example.test" }, key: { stringValue: "k1" }, devices: { arrayValue: { values: [{ stringValue: "ipod-classic" }] } } })], nextPageToken: "next" },
    next: { documents: [doc("b", { email: { stringValue: "b@example.test" }, off: { stringValue: "k2" }, devices: { arrayValue: {} } })] },
  };
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push(init.headers.Authorization);
    return json(200, pages[new URL(url).searchParams.get("pageToken") || ""]);
  };
  const people = await loadPeople({ origin: "https://db.example", project: "p", token: "t", fetchImpl });
  assert.deepEqual(people, [
    { uid: "a", email: "a@example.test", key: "k1", off: false, devices: ["ipod-classic"] },
    { uid: "b", email: "b@example.test", key: "", off: true, devices: [] },
  ]);
  assert.deepEqual(seen, ["Bearer t", "Bearer t"]);
});

test("one email goes to Brevo with the key in a header and the sender set", async () => {
  let call;
  const fetchImpl = async (url, init) => { call = { url, init }; return json(201, { messageId: "<1@x>" }); };
  const problem = await sendOne({ origin: "https://brevo.example", apiKey: "secret", from: { name: "Quitanda", email: "hi@q.example" }, to: "a@example.test", subject: "S", html: "<p>H</p>", fetchImpl });
  assert.equal(problem, null);
  assert.equal(call.url, "https://brevo.example/v3/smtp/email");
  assert.equal(call.init.headers["api-key"], "secret");
  assert.deepEqual(JSON.parse(call.init.body), { sender: { name: "Quitanda", email: "hi@q.example" }, to: [{ email: "a@example.test" }], subject: "S", htmlContent: "<p>H</p>", tags: ["release-alert"] });
});

test("a refusal is reported without the address", async () => {
  const fetchImpl = async () => json(400, { code: "invalid_parameter", message: "a@example.test is not a valid address" });
  const problem = await sendOne({ apiKey: "k", from: {}, to: "a@example.test", subject: "S", html: "H", fetchImpl });
  assert.equal(problem, "400 invalid_parameter (address) is not a valid address");
});

test("sending stops after three failures in a row and at the daily limit", async () => {
  const matches = (n) => Array.from({ length: n }, (_, i) => ({ person: person(`u${i}`, ["all"]), releases: [{ ...rockpod, version: "5.6" }] }));
  const quiet = { log: () => {}, site: "https://q.example", apiKey: "k", from: {} };

  let calls = 0;
  const failing = await sendAll({ ...quiet, matches: matches(10), fetchImpl: async () => { calls++; return json(401, { code: "unauthorized", message: "Key not found" }); } });
  assert.deepEqual({ sent: failing.sent, failed: failing.failed, skipped: failing.skipped, calls }, { sent: 0, failed: 3, skipped: 7, calls: 3 });
  assert.deepEqual(failing.reasons, ["401 unauthorized Key not found"]);

  calls = 0;
  const many = await sendAll({ ...quiet, matches: matches(DAILY_CAP + 5), fetchImpl: async () => { calls++; return json(201, {}); } });
  assert.deepEqual({ sent: many.sent, skipped: many.skipped, calls }, { sent: DAILY_CAP, skipped: 5, calls: DAILY_CAP });

  calls = 0;
  const dry = await sendAll({ ...quiet, matches: matches(4), dryRun: true, fetchImpl: async () => { calls++; return json(201, {}); } });
  assert.deepEqual({ sent: dry.sent, calls }, { sent: 4, calls: 0 });
});

test("the database key is traded for a token with a signed, read-scoped request", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const account = { client_email: "reader@p.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }), token_uri: "https://oauth.example/token" };
  let sent;
  const token = await accessToken(account, async (url, init) => { sent = { url, body: init.body }; return json(200, { access_token: "tok" }); });
  assert.equal(token, "tok");
  assert.equal(sent.url, "https://oauth.example/token");
  const [head, claims, signature] = sent.body.get("assertion").split(".");
  const payload = JSON.parse(Buffer.from(claims, "base64url"));
  assert.equal(payload.iss, account.client_email);
  assert.equal(payload.scope, "https://www.googleapis.com/auth/datastore");
  assert.ok(createVerify("RSA-SHA256").update(`${head}.${claims}`).verify(publicKey, signature, "base64url"));
});

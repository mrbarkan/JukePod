import test from "node:test";
import assert from "node:assert/strict";
import { decode, toEntry, collect } from "./refresh-community.mjs";
import { applyCommunity } from "../src/lib/community.js";

const raw = {
  devices: [{ id: "ipod-video" }, { id: "ipod-classic" }, { id: "ipod-4g" }],
  categories: [{ id: "players" }, { id: "tools" }],
  firmwares: [{ id: "rockbox", name: "Rockbox", devices: ["ipod-video"], partial: ["ipod-4g"], links: [{ label: "Download", url: "https://rockbox.org", icon: "download" }] }],
  apps: [],
  mods: [{ id: "flash-storage", name: "Flash storage", kind: "Storage", devices: ["ipod-video"], partial: [], links: [] }],
};

test("decodes Firestore REST values", () => {
  assert.equal(decode({ stringValue: "x" }), "x");
  assert.deepEqual(decode({ arrayValue: { values: [{ stringValue: "a" }, { stringValue: "b" }] } }), ["a", "b"]);
  assert.deepEqual(decode({ arrayValue: {} }), []);
  assert.equal(decode({ timestampValue: "2026-11-25T00:00:00Z" }), "2026-11-25T00:00:00Z");
});

test("keeps only the known fields of a document", () => {
  const entry = toEntry({ name: "projects/p/databases/(default)/documents/community/abc", fields: { name: { stringValue: "Kit" }, secret: { stringValue: "no" } } });
  assert.deepEqual(entry, { id: "abc", name: "Kit" });
});

test("reads every page", async () => {
  const pages = [
    { documents: [{ name: "x/community/b", fields: { publishedAt: { timestampValue: "2026-11-25T02:00:00Z" } } }], nextPageToken: "t" },
    { documents: [{ name: "x/community/a", fields: { publishedAt: { timestampValue: "2026-11-25T01:00:00Z" } } }] },
  ];
  let calls = 0;
  const fetchImpl = async () => ({ ok: true, json: async () => pages[calls++] });
  const out = await collect({ fetchImpl, config: { projectId: "p", apiKey: "k" } });
  assert.deepEqual(out.map((e) => e.id), ["a", "b"], "oldest first");
});

test("a published suggestion becomes a listing, with only known iPods and a credit", () => {
  const out = applyCommunity(raw, { entries: [
    { id: "s1", kind: "mod", action: "add", itemId: "bt-kit", name: "BT kit", url: "https://example.com", devices: ["ipod-classic", "zune"], credit: "Garlic", category: "Audio" },
  ] });
  const kit = out.mods.find((m) => m.id === "bt-kit");
  assert.ok(kit.community);
  assert.deepEqual(kit.devices, ["ipod-classic"]);
  assert.deepEqual(kit.suggestedBy, ["Garlic"]);
  assert.equal(kit.kind, "Audio");
  assert.equal(raw.mods.length, 1, "doesn't change the hand-written catalog");
});

test("a hand-written listing wins over a suggestion with the same id, which only credits", () => {
  const out = applyCommunity(raw, { entries: [{ id: "s1", kind: "firmware", action: "add", itemId: "rockbox", name: "Rockbox", url: "https://evil.example", credit: "Ana" }] });
  assert.equal(out.firmwares.length, 1);
  assert.equal(out.firmwares[0].links[0].url, "https://rockbox.org");
  assert.deepEqual(out.firmwares[0].suggestedBy, ["Ana"]);
});

test("a fix replaces the link and the iPods, keeping partial ones partial", () => {
  const out = applyCommunity(raw, { entries: [{ id: "s2", kind: "firmware", action: "fix", itemId: "rockbox", name: "Rockbox", url: "https://www.rockbox.org/download/", devices: ["ipod-video", "ipod-classic", "ipod-4g"], credit: "Bo" }] });
  const rb = out.firmwares[0];
  assert.equal(rb.links[0].url, "https://www.rockbox.org/download/");
  assert.equal(rb.links[0].label, "Download");
  assert.deepEqual(rb.devices, ["ipod-video", "ipod-classic"]);
  assert.deepEqual(rb.partial, ["ipod-4g"]);
  assert.deepEqual(out.communityCredits, [{ name: "Bo", idea: "A fix to Rockbox", date: undefined }]);
});

test("entries without a link, of an unknown kind, or with a bad id add nothing", () => {
  const out = applyCommunity(raw, { entries: [
    { id: "a", kind: "firmware", action: "add", itemId: "nolink", name: "No link" },
    { id: "b", kind: "other", action: "add", itemId: "guide", name: "A guide", url: "https://example.com", credit: "Cy" },
    { id: "c", kind: "firmware", action: "add", itemId: "Bad Id", name: "Bad", url: "https://example.com" },
    { id: "d", kind: "firmware", action: "add", itemId: "js", name: "JS", url: "javascript:alert(1)" },
  ] });
  assert.equal(out.firmwares.length, 1);
  assert.deepEqual(out.communityCredits.map((c) => c.idea), ["Suggested A guide"]);
});

test("a credit can't borrow a Reddit or GitHub handle", () => {
  const out = applyCommunity(raw, { entries: [{ id: "s9", kind: "mod", action: "add", itemId: "kit2", name: "Kit 2", url: "https://example.com", credit: "u/GarlicNo3695" }] });
  assert.deepEqual(out.mods.find((m) => m.id === "kit2").suggestedBy, ["GarlicNo3695"]);
});

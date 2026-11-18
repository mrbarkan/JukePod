import test from "node:test";
import assert from "node:assert/strict";
import { summarize, merge, collect } from "./refresh-github.mjs";

test("a numbered release sets the version and date", () => {
  const out = summarize(
    { stargazers_count: 12, pushed_at: "2026-11-10T08:00:00Z" },
    { tag_name: "v5.5", published_at: "2026-08-01T10:00:00Z", prerelease: false }
  );
  assert.deepEqual(out, { stars: 12, updated: "2026-08-01", version: "5.5" });
});

test("a tag that is not a version leaves the version alone", () => {
  const out = summarize({ stargazers_count: 67, pushed_at: "2026-11-12T00:00:00Z" }, { tag_name: "Bootloader", published_at: "2026-05-01T00:00:00Z" });
  assert.deepEqual(out, { stars: 67, updated: "2026-11-12" });
});

test("no release falls back to the last push", () => {
  assert.deepEqual(summarize({ stargazers_count: 0, pushed_at: "2026-11-15T00:00:00Z" }, null), { stars: 0, updated: "2026-11-15" });
});

test("a pre-release is ignored", () => {
  const out = summarize({ stargazers_count: 3, pushed_at: "2026-11-12T00:00:00Z" }, { tag_name: "v2.3.4-beta.119", prerelease: true, published_at: "2026-11-12T00:00:00Z" });
  assert.equal(out.version, undefined);
});

test("merge records a version change and drops old ones", () => {
  const previous = {
    repos: { rockpod: { stars: 10, version: "5.4" }, podbox: { stars: 60 } },
    changes: [{ id: "old", version: "1.0", date: "2026-01-01" }],
  };
  const next = merge(previous, { rockpod: { stars: 11, version: "5.5", updated: "2026-11-17" } }, "2026-11-18");
  assert.deepEqual(next.changes, [{ id: "rockpod", version: "5.5", date: "2026-11-17" }]);
  assert.equal(next.repos.rockpod.stars, 11);
  assert.equal(next.repos.podbox.stars, 60);
});

test("the first reading of a repository is not reported as a change", () => {
  const next = merge({ repos: {}, changes: [] }, { rockpod: { stars: 11, version: "5.5" } }, "2026-11-18");
  assert.deepEqual(next.changes, []);
});

test("a repository GitHub refuses keeps its old numbers", async () => {
  const fetchImpl = async (url) =>
    url.includes("broken")
      ? { ok: false, status: 403, json: async () => ({}) }
      : url.endsWith("/releases/latest")
        ? { ok: false, status: 404, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ stargazers_count: 5, pushed_at: "2026-11-01T00:00:00Z" }) };
  const fresh = await collect([{ id: "a", github: "x/broken" }, { id: "b", github: "x/fine" }, { id: "c" }], { fetchImpl, token: "", log: () => {} });
  assert.deepEqual(fresh, { b: { stars: 5, updated: "2026-11-01" } });
});

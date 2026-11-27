import test from "node:test";
import assert from "node:assert/strict";
import { parseRepoUrl, releaseStatus, summarize, lookupRepo, forget } from "../src/lib/repo-lookup.js";

test("reads the project out of the links people paste", () => {
  const gh = parseRepoUrl("https://github.com/nuxcodes/rockpod/releases/latest");
  assert.equal(gh.host, "github");
  assert.equal(gh.path, "nuxcodes/rockpod");
  assert.equal(gh.url, "https://github.com/nuxcodes/rockpod");
  assert.equal(parseRepoUrl("github.com/a/b.git").path, "a/b");
  assert.equal(parseRepoUrl("git@github.com:a/b.git").path, "a/b");
  assert.equal(parseRepoUrl("https://www.github.com/a/b?tab=readme").path, "a/b");
  const gl = parseRepoUrl("https://gitlab.com/group/sub/project/-/releases");
  assert.equal(gl.host, "gitlab");
  assert.equal(gl.path, "group/sub/project");
  const cb = parseRepoUrl("https://codeberg.org/owner/thing/src/branch/main");
  assert.equal(cb.host, "gitea");
  assert.equal(cb.origin, "https://codeberg.org");
  assert.equal(cb.name, "Codeberg");
  assert.equal(parseRepoUrl("https://github.com/only-owner"), null);
  assert.equal(parseRepoUrl("https://example.com/a/b"), null);
  assert.equal(parseRepoUrl("not a link"), null);
  assert.equal(parseRepoUrl(""), null);
});

test("a stable release makes it stable, even beside betas", () => {
  assert.equal(releaseStatus([{ tag: "2.0-beta", pre: true }, { tag: "1.4", pre: false }]), "stable");
  assert.equal(releaseStatus([{ tag: "0.3-beta", pre: true }, { tag: "0.2-rc1", pre: true }]), "beta");
  assert.equal(releaseStatus([{ tag: "1.0", draft: true }]), null, "drafts don't count");
  assert.equal(releaseStatus([]), null);
  assert.equal(releaseStatus([{ tag: "1.0" }], true), "archived");
});

test("summarizes a project, picking the newest stable release", () => {
  const ref = parseRepoUrl("https://github.com/o/tool");
  const out = summarize(ref, { name: "tool", description: "  Syncs   music. ", maker: "o", homepage: "tool.example.org", license: "GPL-3.0", stars: 12, pushed: "2026-11-01T00:00:00Z" }, [
    { tag: "v2.0.0-beta.1", date: "2026-11-20T00:00:00Z", pre: true },
    { tag: "v1.5.0", date: "2026-10-01T00:00:00Z", pre: false },
    { tag: "v1.4.0", date: "2026-08-01T00:00:00Z", pre: false },
  ]);
  assert.equal(out.description, "Syncs music.");
  assert.equal(out.homepage, "https://tool.example.org");
  assert.equal(out.release, "stable");
  assert.equal(out.version, "1.5.0");
  assert.equal(out.updated, "2026-10-01");
  assert.equal(out.github, "o/tool");
  const none = summarize(ref, { name: "tool", homepage: "https://github.com/o/tool/", license: "NOASSERTION", pushed: "2026-09-09T00:00:00Z" }, []);
  assert.equal(none.homepage, "", "the repository itself isn't a separate website");
  assert.equal(none.license, "");
  assert.equal(none.release, null);
  assert.equal(none.updated, "2026-09-09", "falls back to the last push");
});

const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

test("looks up a GitHub project, treating beta-named tags as pre-releases", async () => {
  forget();
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (url.endsWith("/repos/o/pod")) return reply(200, { name: "pod", full_name: "o/pod", description: "A player", owner: { login: "o" }, license: { spdx_id: "MIT" }, stargazers_count: 3, archived: false, pushed_at: "2026-11-02T00:00:00Z" });
    if (url.includes("/releases")) return reply(200, [{ tag_name: "v0.9-beta", prerelease: false, published_at: "2026-11-01T00:00:00Z" }]);
    return reply(404, {});
  };
  const out = await lookupRepo("https://github.com/o/pod", { fetchImpl });
  assert.equal(out.release, "beta");
  assert.equal(out.version, "0.9-beta");
  assert.equal(out.license, "MIT");
  assert.equal(out.maker, "o");
  await lookupRepo("https://github.com/o/pod/issues", { fetchImpl });
  assert.equal(seen.length, 2, "the second lookup is remembered");
});

test("looks up GitLab and Codeberg projects", async () => {
  forget();
  const fetchImpl = async (url) => {
    if (url === "https://gitlab.com/api/v4/projects/g%2Fsub%2Fapp?license=true") return reply(200, { name: "App", description: "x", namespace: { name: "G" }, license: { nickname: "GNU GPLv3" }, star_count: 5, last_activity_at: "2026-10-10T00:00:00Z" });
    if (url.startsWith("https://gitlab.com/api/v4/projects/g%2Fsub%2Fapp/releases")) return reply(200, [{ tag_name: "1.0", released_at: "2026-10-01T00:00:00Z" }, { tag_name: "2.0", upcoming_release: true }]);
    if (url === "https://codeberg.org/api/v1/repos/c/fw") return reply(200, { name: "fw", description: "Rockbox fork", owner: { login: "c" }, website: "", stars_count: 1, archived: true, licenses: ["GPL-2.0"] });
    if (url.startsWith("https://codeberg.org/api/v1/repos/c/fw/releases")) return reply(200, []);
    return reply(404, {});
  };
  const gl = await lookupRepo("gitlab.com/g/sub/app", { fetchImpl });
  assert.equal(gl.release, "stable");
  assert.equal(gl.version, "1.0", "an upcoming release isn't out yet");
  assert.equal(gl.license, "GNU GPLv3");
  assert.equal(gl.maker, "G");
  const cb = await lookupRepo("https://codeberg.org/c/fw", { fetchImpl });
  assert.equal(cb.release, "archived");
  assert.equal(cb.license, "GPL-2.0");
  assert.equal(cb.github, "");
});

test("explains what went wrong", async () => {
  forget();
  await assert.rejects(lookupRepo("https://example.com/a/b"), /GitHub, GitLab or Codeberg/);
  await assert.rejects(lookupRepo("https://github.com/o/gone", { fetchImpl: async () => reply(404, {}) }), /can't find that project/);
  await assert.rejects(lookupRepo("https://github.com/o/busy", { fetchImpl: async () => reply(403, {}) }), /too many lookups/);
  await assert.rejects(lookupRepo("https://github.com/o/off", { fetchImpl: async () => { throw new TypeError("offline"); } }), /Couldn't reach GitHub/);
});

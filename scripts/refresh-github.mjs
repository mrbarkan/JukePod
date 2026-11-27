// Nightly release tracker. For every listing with a `github` field it reads
// the repository's stars, latest release and last push, and writes them to
// src/data/github-stats.json. The site prefers those values over the ones
// typed into the catalog, so versions and dates stay fresh on their own.
//
//   node scripts/refresh-github.mjs
//
// Set GITHUB_TOKEN to avoid the 60-requests-per-hour anonymous limit.
// A repository that can't be read keeps its previous numbers.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url);
const statsPath = fileURLToPath(new URL("src/data/github-stats.json", root));

const day = (iso) => (iso ? String(iso).slice(0, 10) : null);
const looksLikeVersion = (tag) => /^v?\d/i.test(tag || "");
const KEEP_CHANGES_DAYS = 30;

/** Turns GitHub's answers for one repository into the fields the site shows. */
export function summarize(repo, release) {
  const out = { stars: repo.stargazers_count ?? null, updated: day(repo.pushed_at) };
  // Only a tag that looks like a version becomes the version label, so tags
  // such as "latest" or "Bootloader" never overwrite a hand-written one.
  if (release && !release.prerelease && !release.draft && looksLikeVersion(release.tag_name)) {
    out.version = release.tag_name.replace(/^v/i, "");
    out.updated = day(release.published_at) || out.updated;
  }
  return out;
}

/** Merges fresh numbers into the previous file and records version changes. */
export function merge(previous, fresh, today) {
  const repos = { ...(previous.repos || {}) };
  const changes = [...(previous.changes || [])];
  for (const [id, now] of Object.entries(fresh)) {
    const before = repos[id];
    if (before && before.version && now.version && before.version !== now.version) {
      changes.push({ id, version: now.version, date: now.updated || today });
    }
    repos[id] = { ...before, ...now };
  }
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - KEEP_CHANGES_DAYS);
  return {
    date: today,
    repos,
    changes: changes.filter((c) => new Date(c.date) >= cutoff),
  };
}

async function getJson(url, headers, fetchImpl) {
  const res = await fetchImpl(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return res.json();
}

export async function collect(listings, { fetchImpl = fetch, token = process.env.GITHUB_TOKEN, log = console.log } = {}) {
  const headers = { "User-Agent": "catalog-refresh", Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const fresh = {};
  for (const item of listings) {
    if (!item.github) continue;
    try {
      const repo = await getJson(`https://api.github.com/repos/${item.github}`, headers, fetchImpl);
      if (!repo) throw new Error("repository not found");
      const release = await getJson(`https://api.github.com/repos/${item.github}/releases/latest`, headers, fetchImpl);
      fresh[item.id] = summarize(repo, release);
      log(`${item.id}: ${fresh[item.id].stars} stars${fresh[item.id].version ? ", version " + fresh[item.id].version : ""}`);
    } catch (err) {
      log(`${item.id}: ${err.message}; keeping the previous numbers`);
    }
  }
  return fresh;
}

async function main() {
  const { default: written } = await import(new URL("src/data/catalog.js", root));
  const { applyCommunity } = await import(new URL("src/lib/community.js", root));
  // Community listings filled in from a GitHub link are tracked too.
  const community = JSON.parse(readFileSync(fileURLToPath(new URL("src/data/community.json", root)), "utf8"));
  const catalog = applyCommunity(written, community);
  const listings = [...catalog.firmwares, ...(catalog.apps || [])].filter((x) => !x.draft);
  const previous = JSON.parse(readFileSync(statsPath, "utf8"));
  const fresh = await collect(listings);
  if (!Object.keys(fresh).length) {
    console.log("Nothing could be read from GitHub. The stats file is unchanged.");
    return;
  }
  const next = merge(previous, fresh, new Date().toISOString().slice(0, 10));
  writeFileSync(statsPath, JSON.stringify(next, null, 2) + "\n");
  console.log(`Wrote ${statsPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

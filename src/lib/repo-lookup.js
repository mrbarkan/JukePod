// Reads a public git repository's own page facts, so a suggestion can be
// filled in from a pasted link. Runs in the visitor's browser against each
// host's public API, without signing in:
//
//   GitHub     api.github.com            60 requests an hour per visitor
//   GitLab     gitlab.com/api/v4
//   Codeberg   codeberg.org/api/v1       (and other Forgejo/Gitea hosts below)
//
// Two or three requests per lookup, and answers are kept for the visit, so
// the limits are far off for one person filling in a form. Anything that
// can't be read is left for the sender to type.
//
// Pure apart from `fetchImpl`, so scripts/repo-lookup.test.mjs can test it.

const GITEA_HOSTS = ["codeberg.org", "gitea.com", "git.disroot.org", "next.forgejo.org"];

const clean = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const day = (iso) => (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : "");
const link = (v) => {
  const s = clean(v, 300);
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(s) ? `https://${s}` : "";
  return /^https?:\/\/[^ ]+$/.test(withScheme) ? withScheme : "";
};
// A tag or release name that says it isn't finished yet.
const PRE = /(^|[^a-z])(alpha|beta|rc|pre|preview|dev|nightly|canary|snapshot|test)([^a-z]|\d|$)/i;
const isPreName = (...names) => names.some((n) => PRE.test(String(n || "")));
const versionOf = (tag) => clean(String(tag || "").replace(/^(release[-_ ]?|version[-_ ]?)?v(?=\d)/i, "").replace(/^(release|version)[-_ ]/i, ""), 40);

/**
 * Works out the host and project from a link someone pasted, or returns null.
 * Takes repository pages, deeper links into them (releases, a file, an issue)
 * and clone URLs: https://, git@host:owner/repo.git, or no scheme at all.
 */
export function parseRepoUrl(input) {
  let s = clean(input, 400);
  if (!s) return null;
  const ssh = s.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+)$/i);
  if (ssh) s = `https://${ssh[1]}/${ssh[2]}`;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let url;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const strip = (name) => String(name || "").replace(/\.git$/i, "");
  const ok = (p) => /^[A-Za-z0-9_.-]+$/.test(p) && p !== "." && p !== "..";

  if (host === "github.com") {
    const [owner, repo] = [parts[0], strip(parts[1])];
    if (!ok(owner || "") || !ok(repo || "")) return null;
    return { host: "github", name: "GitHub", owner, repo, path: `${owner}/${repo}`, url: `https://github.com/${owner}/${repo}` };
  }
  if (host === "gitlab.com") {
    // GitLab puts its own pages after "/-/": group/sub/project/-/releases.
    const cut = parts.indexOf("-");
    const path = (cut === -1 ? parts : parts.slice(0, cut)).map(strip);
    if (path.length < 2 || !path.every(ok)) return null;
    return { host: "gitlab", name: "GitLab", owner: path[0], repo: path[path.length - 1], path: path.join("/"), url: `https://gitlab.com/${path.join("/")}` };
  }
  if (GITEA_HOSTS.includes(host)) {
    const [owner, repo] = [parts[0], strip(parts[1])];
    if (!ok(owner || "") || !ok(repo || "")) return null;
    const name = host === "codeberg.org" ? "Codeberg" : host;
    return { host: "gitea", name, origin: `https://${host}`, owner, repo, path: `${owner}/${repo}`, url: `https://${host}/${owner}/${repo}` };
  }
  return null;
}

/**
 * The release status rule: a project with any stable release is "stable",
 * even if it also ships betas. "beta" only when every release so far is a
 * pre-release. "archived" when the host says the project is read-only.
 * Null when there are no releases to judge by.
 */
export function releaseStatus(releases, archived = false) {
  if (archived) return "archived";
  const list = (releases || []).filter((r) => r && !r.draft);
  if (!list.length) return null;
  return list.some((r) => !r.pre) ? "stable" : "beta";
}

/** The newest stable release, or the newest one of any kind if none is stable. */
function pickRelease(releases) {
  const list = (releases || []).filter((r) => r && !r.draft);
  const byDate = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
  return [...list.filter((r) => !r.pre)].sort(byDate)[0] || [...list].sort(byDate)[0] || null;
}

/** Puts one host's answers into the shape the form fills in from. */
export function summarize(ref, project, releases) {
  const latest = pickRelease(releases);
  const out = {
    host: ref.name,
    path: ref.path,
    url: ref.url,
    name: clean(project.name, 80),
    description: clean(project.description, 600),
    maker: clean(project.maker, 60),
    homepage: link(project.homepage),
    license: clean(project.license, 60),
    stars: Number.isFinite(project.stars) ? project.stars : null,
    archived: !!project.archived,
    release: releaseStatus(releases, project.archived),
    version: latest ? versionOf(latest.tag) : "",
    updated: day(latest?.date) || day(project.pushed),
    github: ref.host === "github" ? ref.path : "",
  };
  // A homepage that's only the repository itself adds nothing.
  if (out.homepage.replace(/\/+$/, "").toLowerCase() === ref.url.toLowerCase()) out.homepage = "";
  // GitHub's "NOASSERTION" means it found a license file it couldn't name.
  if (/^(noassertion|other)$/i.test(out.license)) out.license = "";
  return out;
}

export class LookupError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function getJson(url, fetchImpl, hostName) {
  let res;
  try {
    res = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new LookupError(`Couldn't reach ${hostName}. Check your connection, or fill it in by hand.`, "network");
  }
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) {
    throw new LookupError(`${hostName} has had too many lookups from your connection for now. Fill it in by hand, or try again in an hour.`, "rate");
  }
  if (!res.ok) throw new LookupError(`${hostName} didn't answer (${res.status}). Fill it in by hand.`, "host");
  return res.json();
}

const ADAPTERS = {
  async github(ref, fetchImpl) {
    const base = `https://api.github.com/repos/${ref.path}`;
    const repo = await getJson(base, fetchImpl, ref.name);
    if (!repo) return null;
    const releases = (await getJson(`${base}/releases?per_page=30`, fetchImpl, ref.name).catch(() => [])) || [];
    return {
      // GitHub answers for a renamed repository under its new name.
      ref: repo.full_name && repo.full_name !== ref.path ? parseRepoUrl(`https://github.com/${repo.full_name}`) || ref : ref,
      project: {
        name: repo.name,
        description: repo.description,
        maker: repo.owner?.login,
        homepage: repo.homepage,
        license: repo.license?.spdx_id || repo.license?.name,
        stars: repo.stargazers_count,
        archived: repo.archived,
        pushed: repo.pushed_at,
      },
      releases: releases.map((r) => ({ tag: r.tag_name || r.name, date: r.published_at || r.created_at, draft: !!r.draft, pre: !!r.prerelease || isPreName(r.tag_name, r.name) })),
    };
  },

  async gitlab(ref, fetchImpl) {
    const base = `https://gitlab.com/api/v4/projects/${encodeURIComponent(ref.path)}`;
    const p = await getJson(`${base}?license=true`, fetchImpl, ref.name);
    if (!p) return null;
    const releases = (await getJson(`${base}/releases?per_page=30`, fetchImpl, ref.name).catch(() => [])) || [];
    return {
      ref,
      project: {
        name: p.name,
        description: p.description,
        maker: p.namespace?.name || p.namespace?.path,
        homepage: "",
        license: p.license?.nickname || p.license?.key?.toUpperCase() || p.license?.name,
        stars: p.star_count,
        archived: p.archived,
        pushed: p.last_activity_at,
      },
      // GitLab has no pre-release flag: an unreleased one is "upcoming", and
      // the tag's name says the rest.
      releases: releases.map((r) => ({ tag: r.tag_name || r.name, date: r.released_at || r.created_at, draft: !!r.upcoming_release, pre: isPreName(r.tag_name, r.name) })),
    };
  },

  async gitea(ref, fetchImpl) {
    const base = `${ref.origin}/api/v1/repos/${ref.path}`;
    const repo = await getJson(base, fetchImpl, ref.name);
    if (!repo) return null;
    const releases = (await getJson(`${base}/releases?limit=30`, fetchImpl, ref.name).catch(() => [])) || [];
    return {
      ref,
      project: {
        name: repo.name,
        description: repo.description,
        maker: repo.owner?.full_name || repo.owner?.login || repo.owner?.username,
        homepage: repo.website,
        license: Array.isArray(repo.licenses) ? repo.licenses.join(", ") : "",
        stars: repo.stars_count,
        archived: repo.archived,
        pushed: repo.updated_at,
      },
      releases: releases.map((r) => ({ tag: r.tag_name || r.name, date: r.published_at || r.created_at, draft: !!r.draft, pre: !!r.prerelease || isPreName(r.tag_name, r.name) })),
    };
  },
};

const cache = new Map();

/**
 * Looks up a pasted repository link. Returns the summary, or throws a
 * LookupError whose message can be shown as it is.
 */
export async function lookupRepo(input, { fetchImpl = (...a) => fetch(...a) } = {}) {
  const ref = parseRepoUrl(input);
  if (!ref) throw new LookupError("That doesn't look like a GitHub, GitLab or Codeberg project link.", "unknown");
  if (cache.has(ref.url)) return cache.get(ref.url);
  const got = await ADAPTERS[ref.host](ref, fetchImpl);
  if (!got) throw new LookupError(`${ref.name} can't find that project. Is it public, and is the link right?`, "missing");
  const out = summarize(got.ref, got.project, got.releases);
  cache.set(ref.url, out);
  return out;
}

/** Clears remembered answers. For tests. */
export const forget = () => cache.clear();

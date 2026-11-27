// Folds published suggestions (src/data/community.json, written nightly by
// scripts/refresh-community.mjs) into the hand-written catalog.
//
//   A new listing   becomes a firmware, app or mod entry, marked `community`,
//                   unless the catalog already has that id: once a listing
//                   has been written into catalog.js by hand, that one wins.
//   A fix           replaces the listing's main link and/or the iPods it runs
//                   on. Wording fixes are made by hand, so they only credit.
//   Credit          a sender who asked to be credited is added to the
//                   listing's suggestedBy, which feeds /contributors/.
//
// Pure functions, no Astro imports, so scripts/*.test.mjs can test them.

const isSlug = (v) => typeof v === "string" && /^[a-z0-9-]{1,60}$/.test(v);
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
// A credit is a site display name, never a Reddit or GitHub handle, so it
// can't borrow a real person's card and profile link on /contributors/.
const creditName = (v) => text(v, 40).replace(/^(\/?u\/|@)+/i, "").trim();
const isLink = (v) => typeof v === "string" && /^https?:\/\/[^ ]+$/.test(v) && v.length <= 300;
const RELEASES = ["stable", "beta", "experimental", "archived"];
const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(v);
const isRepoPath = (v) => typeof v === "string" && /^[A-Za-z0-9_.-]{1,60}\/[A-Za-z0-9_.-]{1,100}$/.test(v);

/** The words shown on a community listing's status chip. */
export const COMMUNITY_STATUS = { ripeness: "Fresh pick", plain: "From the community", dots: 0 };

function addCredit(item, name) {
  if (!name) return item;
  const now = Array.isArray(item.suggestedBy) ? item.suggestedBy : item.suggestedBy ? [item.suggestedBy] : [];
  if (now.some((h) => String(h).toLowerCase() === name.toLowerCase())) return item;
  return { ...item, suggestedBy: [...now, name] };
}

function newEntry(c, deviceIds, categoryIds, raw) {
  const devices = (c.devices || []).filter((d) => deviceIds.has(d));
  const blurb = text(c.blurb, 600) || `Suggested by the community. See ${text(c.name, 80)}’s own page for the details.`;
  const link = { label: c.kind === "mod" ? "Where to get it" : "Project page", url: c.url, icon: c.kind === "mod" ? "info" : "release" };
  const base = {
    id: c.itemId,
    name: text(c.name, 80),
    maker: text(c.maker, 60) || "Not stated",
    blurb,
    devices,
    partial: [],
    links: [link],
    community: true,
    communityId: c.id,
    publishedAt: c.publishedAt || null,
  };
  if (creditName(c.credit)) base.suggestedBy = [creditName(c.credit)];
  if (c.kind === "mod") return { ...base, kind: text(c.category, 40) || "From the community", skill: "Not stated" };
  const category = categoryIds.has(c.category) ? [c.category] : [];
  // Filled in from the project's repository when the sender pasted one: a
  // known release status replaces the "Fresh pick" chip (the page still says
  // it came from the community), and a GitHub repo gets nightly stats.
  const facts = {
    status: RELEASES.includes(c.release) ? c.release : "community",
    version: text(c.version, 40) || null,
    updated: isDay(c.updated) ? c.updated : null,
  };
  if (text(c.license, 60)) facts.license = text(c.license, 60);
  if (isRepoPath(c.github)) facts.github = c.github;
  if (isLink(c.homepage) && c.homepage !== c.url) base.links = [...base.links, { label: "Website", url: c.homepage, icon: "info" }];
  if (c.kind === "app") {
    const platforms = (c.platforms || []).filter((p) => (raw.platforms || []).includes(p));
    return { ...base, categories: category, ...facts, platforms };
  }
  return { ...base, categories: category, ...facts };
}

/**
 * Returns a copy of `raw` (the catalog's default export) with the community
 * entries applied, plus `communityCredits`: credited fixes and other
 * suggestions that have no listing of their own, for /contributors/.
 */
export function applyCommunity(raw, community) {
  const entries = (community && community.entries) || [];
  const deviceIds = new Set((raw.devices || []).map((d) => d.id));
  const categoryIds = new Set((raw.categories || []).map((c) => c.id));
  const lists = { firmware: [...(raw.firmwares || [])], app: [...(raw.apps || [])], mod: [...(raw.mods || [])] };
  const where = new Map();
  for (const [kind, list] of Object.entries(lists)) list.forEach((x, i) => where.set(x.id, [kind, i]));
  const credits = [];

  // Oldest first, so an earlier listing keeps its id.
  const sorted = [...entries].sort((a, b) => String(a.publishedAt || "").localeCompare(String(b.publishedAt || "")));
  for (const c of sorted) {
    if (!c || !isSlug(c.itemId) || !text(c.name, 80)) continue;
    const credit = creditName(c.credit);
    if (c.action === "add") {
      if (!lists[c.kind] || !isLink(c.url)) {
        if (credit) credits.push({ name: credit, idea: `Suggested ${text(c.name, 80)}`, date: c.publishedAt });
        continue;
      }
      if (where.has(c.itemId)) {
        // Already listed by hand (or by an earlier suggestion): credit only.
        const [kind, i] = where.get(c.itemId);
        lists[kind][i] = addCredit(lists[kind][i], credit);
        continue;
      }
      lists[c.kind].push(newEntry(c, deviceIds, categoryIds, raw));
      where.set(c.itemId, [c.kind, lists[c.kind].length - 1]);
      continue;
    }
    if (c.action === "fix") {
      if (!where.has(c.itemId)) continue;
      const [kind, i] = where.get(c.itemId);
      let item = lists[kind][i];
      if (isLink(c.url)) {
        const links = [...(item.links || [])];
        links[0] = { ...(links[0] || { label: "Project page", icon: "release" }), url: c.url };
        item = { ...item, links };
      }
      // The sender ticks every iPod it works on (possibly none). Ones listed
      // as partial stay partial.
      if (Array.isArray(c.devices)) {
        const devices = c.devices.filter((d) => deviceIds.has(d));
        const partial = (item.partial || []).filter((d) => devices.includes(d));
        item = { ...item, devices: devices.filter((d) => !partial.includes(d)), partial };
      }
      lists[kind][i] = item;
      if (credit) credits.push({ name: credit, idea: `A fix to ${item.name}`, date: c.publishedAt });
    }
  }
  return { ...raw, firmwares: lists.firmware, apps: lists.app, mods: lists.mod, communityCredits: credits };
}

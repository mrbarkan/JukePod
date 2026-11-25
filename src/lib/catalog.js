// Build-time view of the catalog: merges the nightly GitHub stats into the
// hand-written entries and exposes helpers the pages share.
import raw from "../data/catalog.js";
import stats from "../data/github-stats.json";
import shots from "../data/screenshots.json";

const repos = (stats && stats.repos) || {};

function withStats(item, type) {
  const out = { ...item, type };
  const s = repos[item.id];
  if (s) {
    if (s.stars != null) out.stars = s.stars;
    if (s.version) out.version = s.version;
    if (s.updated) out.updated = s.updated;
  }
  out.screenshots = shots[item.id] || [];
  out.path = type === "firmware" ? `/firmware/${item.id}/` : type === "app" ? `/apps/${item.id}/` : `/mods/#${item.id}`;
  return out;
}

const live = (x) => !x.draft;

export const firmwares = raw.firmwares.filter(live).map((x) => withStats(x, "firmware"));
export const apps = (raw.apps || []).filter(live).map((x) => withStats(x, "app"));
export const mods = (raw.mods || []).filter(live).map((x) => withStats(x, "mod"));
export const watchlist = raw.watchlist || [];
export const devices = raw.devices;
export const categories = raw.categories;
export const platforms = raw.platforms || [];
export const latest = raw.latest;
export const updatedOn = stats.date && stats.date > raw.updatedOn ? stats.date : raw.updatedOn;

export const items = [...firmwares, ...apps];
export const byId = Object.fromEntries([...items, ...mods].map((x) => [x.id, x]));

/**
 * What a firmware is built on. Anything whose `basedOn` chain reaches Rockbox
 * is in the Rockbox family; the rest say so with `family` in the catalog.
 */
export const FAMILIES = {
  rockbox: { name: "Rockbox family", tag: "Rockbox fork", hint: "Rockbox or built on it" },
  stock: { name: "Apple firmware mods", tag: "Apple firmware mod", hint: "Patches Apple’s own firmware" },
  scratch: { name: "Something new", tag: "Something new", hint: "Neither Rockbox nor Apple’s firmware" },
};
for (const f of firmwares) {
  f.family = f.family || (inRockboxFamily(f) ? "rockbox" : null);
  f.familyTag = f.id === "rockbox" ? "Rockbox" : FAMILIES[f.family]?.tag || null;
}
export const families = Object.entries(FAMILIES)
  .filter(([id]) => firmwares.some((f) => f.family === id))
  .map(([id, v]) => ({ id, ...v }));
export const deviceById = Object.fromEntries(devices.map((d) => [d.id, d]));
export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

// Version changes the nightly job saw in the last two weeks, newest first.
export const recentChanges = ((stats && stats.changes) || [])
  .filter((c) => byId[c.id] && daysBetween(c.date, updatedOn) <= 14)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

/** Ripeness is the shop's word for status; the plain word always sits beside it. */
export const STATUS = {
  stable: { ripeness: "Ripe", plain: "Stable", dots: 3 },
  beta: { ripeness: "Ripening", plain: "Beta", dots: 2 },
  experimental: { ripeness: "Unripe", plain: "Experimental", dots: 1 },
  archived: { ripeness: "Preserved", plain: "Archived", dots: 0 },
};

/** Firmware that runs on a device, fully or partly. */
export function runsOn(deviceId) {
  return firmwares.filter((f) => f.devices.includes(deviceId) || (f.partial || []).includes(deviceId));
}

/** The short count shown on a picker tile: "7 flavors", "Tools only", "None yet". */
export function flavorLabel(deviceId) {
  const list = runsOn(deviceId);
  if (!list.length) return "None yet";
  if (list.every((f) => (f.categories || []).every((c) => c === "tools"))) return "Tools only";
  return `${list.length} ${list.length === 1 ? "flavor" : "flavors"}`;
}

/** Everything the home page script needs, with stats already merged in. */
export const clientData = {
  updatedOn,
  latest,
  recentChanges,
  categories,
  families,
  platforms,
  devices,
  firmwares,
  apps,
  watchlist,
  status: STATUS,
};

/** True for Rockbox and anything built on it, which all share its theme format. */
function inRockboxFamily(item) {
  for (let cur = item, hops = 0; cur && hops < 6; cur = byId[cur.basedOn], hops++) if (cur.id === "rockbox") return true;
  return false;
}

/** What a shared theme can be made for: CrateDigger, plus the Rockbox family. */
export const themeTargets = [
  ...apps.filter((a) => a.id === "cratedigger").map((a) => ({ id: a.id, name: a.name, kind: "app", path: a.path, devices: [] })),
  ...firmwares
    .filter((f) => inRockboxFamily(f) && f.rockboxThemes !== false)
    .map((f) => ({ id: f.id, name: f.name, kind: "firmware", path: f.path, devices: [...f.devices, ...(f.partial || [])] })),
];

/** Listings built on this one, e.g. the Rockbox page lists its forks. */
export function builtOn(id) {
  return firmwares.filter((f) => f.basedOn === id);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function fmtDate(iso, long = false) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  const month = (long ? MONTHS_LONG : MONTHS)[m - 1];
  return d ? `${d} ${month} ${y}` : `${month} ${y}`;
}

export function isNumbered(v) {
  return !!v && /^v?\d/i.test(v);
}

function daysBetween(a, b) {
  return Math.abs(new Date(b) - new Date(a)) / 86400000;
}

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Escapes text and turns `backticks` into <code>. Safe to pass to set:html. */
export function fmt(s) {
  return escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Strips backticks for plain-text uses such as meta descriptions. */
export function plain(s) {
  return String(s ?? "").replace(/`/g, "");
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Site-relative link that respects the deploy base path. */
export function href(path = "/") {
  return BASE + (path.startsWith("/") ? path : "/" + path);
}

/** Absolute URL, for share links, feeds and social cards. */
export function absolute(path, site) {
  return new URL(href(path), site ?? import.meta.env.SITE ?? "http://localhost:4321").toString();
}

export const SITE = {
  // Where people write about their data. Shown on the privacy pages.
  contactEmail: "opa@mrbarkan.com",
  name: "Quitanda",
  tagline: "Fresh firmware, mods and apps for your iPod",
  description:
    "Quitanda is the corner shop for click-wheel iPods: custom firmware, hardware mods and library apps, with what each one does, which iPods it fits and where to get it.",
  // The deploy workflow passes the real address, so renaming the repository
  // needs no change here.
  repo: import.meta.env.PUBLIC_REPO_URL || "https://github.com/mrbarkan/quitanda",
};

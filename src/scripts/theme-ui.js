// Shared pieces for the theme pages. Everything a person typed is put on the
// page as text, never as HTML, and only links into the site's own storage
// are ever used.
import { isOwnFile } from "../lib/themes-read.js";
import { fetchUrl } from "../lib/emulator.js";

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const link = (path) => BASE + path;

/** Small element builder: h("p", { class: "x" }, "text", childNode). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "hidden" || key === "disabled" || key === "required" || key === "checked") el[key] = !!value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) if (child != null && child !== false) el.append(child);
  return el;
}

export const pageData = () => JSON.parse(document.getElementById("theme-data").textContent);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const SWATCH_KEYS = ["chassis", "paper", "ink", "orange", "cyan", "sun", "oledSurface", "oledForeground", "backgroundBase"];
const isHex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** A miniature CrateDigger console drawn in the theme's own colors. */
export function consoleSwatch(swatch, name) {
  if (!swatch || !SWATCH_KEYS.every((k) => isHex(swatch[k]))) return null;
  const el = h(
    "div",
    { class: "cd-swatch", role: "img", "aria-label": `${name} colors` },
    h("div", { class: "cd-chassis" },
      h("div", { class: "cd-oled" }, h("span", {}, name), h("i", { class: "cd-bars" })),
      h("div", { class: "cd-deck" },
        h("div", { class: "cd-paper" }, h("i"), h("i"), h("i")),
        h("div", { class: "cd-knobs" }, h("i", { class: "k1" }), h("i", { class: "k2" }), h("i", { class: "k3" }))
      )
    )
  );
  for (const key of SWATCH_KEYS) el.style.setProperty(`--${key}`, swatch[key]);
  return el;
}

export const ownShots = (theme) => (theme.screenshots || []).filter((s) => s && isOwnFile(s.url));
/** The address to load one of our stored files from. */
export const fileHref = (url) => fetchUrl(url);

/** The picture that stands for a theme: a screenshot, its colors, or a blank screen. */
export function preview(theme) {
  const shot = ownShots(theme)[0];
  if (shot) {
    return h("img", { class: "theme-shot" + (shot.w <= 640 ? " is-pixel" : ""), src: fetchUrl(shot.url), alt: "", loading: "lazy", width: shot.w || null, height: shot.h || null });
  }
  return consoleSwatch(theme.swatch, theme.name) || h("div", { class: "theme-blank" }, h("span", {}, theme.name));
}

const STATUS = { pending: "Waiting for review", approved: "In the gallery", rejected: "Not accepted" };
export const statusPill = (status) => h("span", { class: `pill pill-theme-${status}` }, STATUS[status] || status);

/** "Rockbox 4.0 · also Rockpod, RodBox" for a theme's cards and review. */
export function worksOnText(theme, targets) {
  const name = (id) => targets.find((t) => t.id === id)?.name || id;
  const extra = (theme.worksOn || []).filter((id) => id !== theme.target).map(name);
  return `${name(theme.target)}${theme.targetVersion ? " " + theme.targetVersion : ""}${extra.length ? " · also " + extra.join(", ") : ""}`;
}

export const isRemix = (theme) => Array.isArray(theme.remixOf) && theme.remixOf.length > 0;

/** Where a remix source points: its page on this site, or the outside link. */
export function sourceHref(source) {
  if (source.themeId) return link(`/themes/view/?id=${encodeURIComponent(source.themeId)}`);
  // An outside link is only followed if it is https.
  return /^https:\/\//.test(source.url || "") ? source.url : null;
}
export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function themeCard(theme, targets) {
  return h(
    "a",
    { class: "theme-card", href: link(`/themes/view/?id=${encodeURIComponent(theme.id)}`) },
    h("div", { class: "theme-card-art" }, preview(theme)),
    h("div", { class: "theme-card-text" },
      h("strong", {}, theme.name),
      h("span", {}, `by ${theme.ownerName || "someone"}`),
      h("span", { class: "theme-for" }, worksOnText(theme, targets)),
      isRemix(theme) ? h("span", { class: "theme-remix-tag" }, "Remix") : null
    )
  );
}

/** Where a downloaded theme goes, per target. */
export function installSteps(theme, targets) {
  if (theme.target === "cratedigger") {
    return [
      "Download the theme and unzip it. You get a folder ending in .cdtheme (or a single .json file).",
      "Move it into ~/Library/Application Support/CrateDigger/Themes/",
      "In CrateDigger, open the THEME menu and choose Refresh Themes, then pick it from the list.",
    ];
  }
  const target = targets.find((t) => t.id === theme.target);
  return [
    "Download the theme and connect your iPod in disk mode.",
    "Unzip it to the root of the iPod, so its files land inside the .rockbox folder.",
    `Eject, then on the iPod open Settings › Theme Settings › Browse Theme Files and choose it.`,
    target ? `Themes are made for a specific version. If it looks wrong, check it matches your ${target.name} version.` : null,
  ].filter(Boolean);
}

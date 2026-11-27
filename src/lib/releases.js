// New versions, newest first: every firmware and app with a numbered version
// and a release date. Feeds the "What's new" page and the release feeds.
import { firmwares, apps, devices, isNumbered, plain, absolute, deviceById, SITE } from "./catalog.js";

const fits = (item) => [...(item.devices || []), ...(item.partial || [])];

export const releases = [...firmwares, ...apps]
  .filter((x) => isNumbered(x.version) && x.updated)
  .sort((a, b) => b.updated.localeCompare(a.updated) || a.name.localeCompare(b.name));

/** Releases for one iPod: firmware that runs on it and apps that sync it. */
export const releasesFor = (deviceId) => releases.filter((x) => fits(x).includes(deviceId));

/** The iPods that have at least one release to follow. */
export const followable = devices.filter((d) => releasesFor(d.id).length > 0);

/** "Rockpod 5.5", without repeating a version the name already carries. */
export const releaseName = (x) => (x.name.includes(x.version) ? x.name : `${x.name} ${x.version}`);

export const feedPath = (deviceId) => (deviceId ? `/releases/${deviceId}.xml` : "/releases.xml");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// A date written as a month only ("2025-04") counts as the first of that month.
const when = (iso) => new Date(`${iso.length === 7 ? iso + "-01" : iso}T12:00:00Z`).toUTCString();

/** An RSS feed of releases. One item per version, so a new version is a new item. */
export function releaseFeed({ site, device }) {
  const list = device ? releasesFor(device.id) : releases;
  const title = device ? `${SITE.name}: new releases for the ${device.name}` : `${SITE.name}: new releases`;
  const description = device
    ? `New versions of the firmware and library apps that work with the ${device.name}.`
    : "New versions of the custom firmware and library apps listed on Quitanda.";
  const items = list
    .map((x) => {
      const url = absolute(x.path, site);
      const kind = x.type === "app" ? "Library app" : "Firmware";
      const runsOn = fits(x).map((d) => deviceById[d]?.short).filter(Boolean).join(", ");
      const text = [plain(x.blurb), runsOn ? `${x.type === "app" ? "Syncs" : "Runs on"}: ${runsOn}.` : ""].filter(Boolean).join(" ");
      return `    <item>
      <title>${esc(releaseName(x))}</title>
      <link>${url}</link>
      <guid isPermaLink="false">${esc(`${url}#${x.version}`)}</guid>
      <pubDate>${when(x.updated)}</pubDate>
      <category>${kind}</category>
      <description>${esc(text)}</description>
    </item>`;
    })
    .join("\n");
  const self = absolute(feedPath(device?.id), site);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <link>${absolute(device ? `/releases/?ipod=${device.id}` : "/releases/", site)}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${esc(description)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

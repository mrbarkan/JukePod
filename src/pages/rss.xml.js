import { posts } from "../lib/blog.js";
import { SITE, absolute } from "../lib/catalog.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function GET({ site }) {
  const items = posts
    .map((p) => {
      const url = absolute(`/blog/${p.slug}/`, site);
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(p.date + "T12:00:00Z").toUTCString()}</pubDate>
      <description>${esc(p.summary)}</description>
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE.name)} blog</title>
    <link>${absolute("/blog/", site)}</link>
    <description>${esc(SITE.description)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

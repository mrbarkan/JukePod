import { posts } from "../lib/blog.js";
import { items, absolute } from "../lib/catalog.js";

export function GET({ site }) {
  const paths = ["/", "/apps/", "/compatibility/", "/mods/", "/themes/", "/start/", "/start/ipod-users/", "/start/makers/", "/blog/", "/about/", "/privacy/", "/gdpr/", ...items.map((i) => i.path), ...posts.map((p) => `/blog/${p.slug}/`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${absolute(p, site)}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

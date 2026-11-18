// Blog posts are Markdown files in src/content/blog, named YYYY-MM-DD-slug.md.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Rendered post HTML with site-relative links moved under the base path. */
export async function renderPost(post) {
  const html = await post.html();
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`);
}

const files = import.meta.glob("../content/blog/*.md", { eager: true });

export const posts = Object.entries(files)
  .map(([path, mod]) => {
    const file = path.split("/").pop().replace(/\.md$/, "");
    const m = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    return {
      slug: m ? m[2] : file,
      date: mod.frontmatter.date || (m ? m[1] : null),
      title: mod.frontmatter.title,
      summary: mod.frontmatter.summary || "",
      author: mod.frontmatter.author || "Quitanda",
      // Posts link to pages as "/firmware/rockbox/"; add the base path so
      // those links work wherever the site is served from.
      html: mod.compiledContent,
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

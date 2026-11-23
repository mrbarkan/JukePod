import { defineConfig } from "astro/config";

// The deploy workflow sets SITE_URL and BASE_PATH from the GitHub Pages
// settings, so moving to a custom domain needs no change here.
// Pages reports a custom domain as http:// until "Enforce HTTPS" is ticked,
// but it serves every Pages site over https, so links always use https.
const site = (process.env.SITE_URL || "https://mrbarkan.github.io").replace(/^http:\/\//, "https://");
const base = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

export default defineConfig({
  site,
  base: base || "/",
  trailingSlash: "always",
  build: { format: "directory" },
});

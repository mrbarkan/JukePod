import { defineConfig } from "astro/config";

// The deploy workflow sets SITE_URL and BASE_PATH from the GitHub Pages
// settings, so moving to a custom domain needs no change here.
const site = process.env.SITE_URL || "https://mrbarkan.github.io";
const base = (process.env.BASE_PATH ?? "/JukePod").replace(/\/$/, "");

export default defineConfig({
  site,
  base: base || "/",
  trailingSlash: "always",
  build: { format: "directory" },
});

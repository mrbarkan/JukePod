# Quitanda

Fresh firmware, mods and apps for your iPod. A catalog of custom firmware, library apps and hardware mods for click-wheel iPods: what each one does, which iPods it fits, how to install it and where to get it.

A quitanda is the small neighborhood shop that sells fruit. The iPod came with one flavor; here you pick your own.

The site is static. [Astro](https://astro.build) turns the catalog into one page per listing, and GitHub Pages serves the result.

```
src/data/catalog.js         THE CATALOG: firmware, apps, mods and the watch list
src/data/github-stats.json  versions, dates and stars, refreshed nightly (generated)
src/data/screenshots.json   which pictures belong to which listing
src/content/blog/           blog posts, one Markdown file each
src/pages/                  home, listing pages, mods, blog, about, RSS, sitemap
src/components/             listing page, gallery, share row, icons, the mark
src/styles/site.css         all styling (light and dark)
public/assets/app.js        home page filters, cards and the click wheel
public/screenshots/         the pictures
scripts/refresh-github.mjs  the nightly release tracker
.github/workflows/deploy.yml
```

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

## Add or update a listing

Everything lives in `src/data/catalog.js`. The comments in that file describe every field.

1. Copy an existing entry in `firmwares`, `apps` or `mods` and give it a unique `id`. The id becomes its address, for example `/firmware/rockpod/`.
2. Fill in `devices` (and `partial`) using ids from the `devices` list.
3. The first item in `links` becomes the main button.
4. Add the id to `latest.lines` so the "Fresh in" panel shows it, and update `latest.date` and `updatedOn`.

Projects with no release yet go in `watchlist`. Move one into `firmwares` once it ships. Set `draft: true` to keep an entry off the site while you fill it in.

Status is one of `stable`, `beta`, `experimental` or `archived`. The site shows it as Ripe, Ripening, Unripe or Preserved, with the plain word beside it.

## Add screenshots

Put the pictures in `public/screenshots/<listing id>/` and list them in `src/data/screenshots.json` with their size and a short caption. Set `"pixel": true` for an iPod screen capture (320×240) so it's shown sharp at its real pixels. The first picture becomes the card thumbnail.

## Write a blog post

Add a file to `src/content/blog/` named `YYYY-MM-DD-your-title.md`:

```md
---
title: Your title
date: 2026-11-18
summary: One sentence for the blog index, RSS and link previews.
---

The post, in Markdown. Link to pages as /firmware/rockbox/.
```

## Release tracking

Every night the deploy workflow runs `scripts/refresh-github.mjs`. For each listing with a `github` field it reads the stars, the latest release and the last push, and saves them to `src/data/github-stats.json`. Those values override the ones in the catalog, and a version change appears in the "Fresh in" panel for two weeks.

To run it yourself:

```bash
GITHUB_TOKEN=your_token npm run refresh
```

The tests for it run with `npm test`.

## Sign-in and the database

Sign-in and shared data run on Firebase (project `quitanda-95fa7`).

- `src/lib/firebase-config.js` holds the project's public web config and the list of sign-in methods shown.
- `src/lib/auth.js` is the only file that imports Firebase. It loads on demand, so visitors who never sign in never download it.
- `firestore.rules` and `firestore.indexes.json` are the database's access rules and indexes. Publish changes with:

```bash
npx firebase-tools deploy --only firestore
```

To make someone an admin, create a document in the `admins` collection named with their user ID. Admins can approve or reject shared themes.

To add GitHub sign-in: enable the GitHub provider in the Firebase console (it needs a GitHub OAuth app), then add `"github"` to `providers` in `src/lib/firebase-config.js`.

A new site address must be added in the Firebase console under Authentication › Settings › Authorized domains, or sign-in will refuse it.

## Deploy

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main`, every night, and on demand from the Actions tab.

It needs one setting: **Settings › Pages › Source: GitHub Actions**. The workflow reads the site address from the Pages settings, so adding a custom domain there needs no change in the code.

## Check before launch

The listings were compiled from each project's public pages in November 2026. These need a second look:

- Rockbox 4.0: the release date (listed as April 2025) and the exact device list.
- iPodLinux: the device list is from memory of the old project, so treat it as approximate.
- Library apps: the device lists for Swinsian, CopyTrans Manager, MusicBee and foo_dop come from secondary sources. Also check Swinsian's price, and whether foo_dop works on the nano 6G and 7G.
- Stonepod: details come from its TestFlight page and search results.
- CrateDigger: the listing assumes the PodBox features from the 2.3.4 betas shipped in 2.3.4. Confirm against the release notes.
- Hardware mods: written from vendor pages and press coverage, not hands-on testing. Check kit names, what each port does, and the haptic click entry in particular.
- Screenshots come from each project's own repository and are credited on the page. Remove any a maker objects to.

# JukePod

Live site: https://mrbarkan.github.io/JukePod/

A one-page catalog of custom firmware for click-wheel iPods: what each one adds, which iPods it runs on, how to install it, and where to download it.

It's a plain static site with no build step and no framework, so it runs on any static host.

```
index.html               page structure
assets/style.css         all styling (light and dark themes)
assets/app.js            filtering, sorting, cards, click-wheel, compatibility table
data/firmwares.js        THE CATALOG: every firmware, device and watch-list entry
data/github-stats.js     generated star counts (see below)
scripts/refresh-github.mjs
```

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Add or update a firmware

Everything lives in `data/firmwares.js`. The comment at the top of that file lists every field.

1. Copy an existing entry in `firmwares` and give it a unique `id`. The id becomes its link, for example `/#rockpod`.
2. Fill in `devices` (and `partial`) using ids from the `devices` list.
3. The first item in `links` becomes the big button. The rest go in its dropdown menu.
4. Add the id to `latest.lines` so the "Latest" panel shows what changed, and update `latest.date` and `updatedOn`.

Projects with no release yet go in `watchlist`. Move one into `firmwares` once it ships.

## Add a library app

Apps that put music on an iPod (from a computer or phone) go in `apps` in the same file. They take the same fields as firmware, plus `platforms`, `price` and, when the developer publishes no device list, `devicesNote`. An app with an empty `devices` list still shows up when someone filters by iPod, since it may support their model.

Set `draft: true` to keep an entry off the page while you fill it in.

## Refresh GitHub stars

```bash
GITHUB_TOKEN=your_token node scripts/refresh-github.mjs
```

This writes `data/github-stats.js`, which overrides the `stars` values in the catalog. The token is optional, but without one GitHub limits you to 60 requests an hour.

## Deploy

Any static host works:

- **GitHub Pages**: push the folder to a repo, then go to Settings › Pages and deploy from the branch.
- **Netlify / Cloudflare Pages**: point them at the repo. There's no build command, and the output directory is the repo root.

## Check before launch

The starter entries were compiled from each project's public pages in November 2026. Check these against the sources:

- Rockbox 4.0: the release date (listed as April 2025) and the exact device list.
- Star counts: run the refresh script. Rockpod's count isn't filled in yet.
- iPodLinux: the device list is from memory of the old project, so treat it as approximate.
- Checksums: none are listed, because none of the projects checked publish them. Add a `sha256` to a `files` entry if a developer provides one.
- Library apps: the device lists for Swinsian, CopyTrans Manager, MusicBee and foo_dop come from secondary sources, because their own sites couldn't be reached while building this. Also check Swinsian's price, and whether foo_dop works on the nano 6G and 7G.
- Stonepod: details come from its TestFlight page and search results; the Reddit post couldn't be opened.
- PodBox and CrateDigger: CrateDigger's PodBox features are in its 2.3.4 betas, not in 2.3.2. Update the card when 2.3.4 ships.
- Helikon OS is on the watch list. Move it to `firmwares` when its first release appears.

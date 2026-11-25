# Contributing to Quitanda

Thanks for helping fill the shelves. Quitanda is a catalog of firmware, apps, mods and themes for click-wheel iPods, and it only gets better when people who actually use these things share what they know.

The catalog is still being checked. It was compiled from each project's public pages with a lot of help from AI, so corrections from real iPod owners are some of the most useful contributions there are.

## The quick ways (no Git needed)

- **Suggest something new:** [open a "Suggest a listing" issue](https://github.com/mrbarkan/quitanda/issues/new?template=suggest-listing.yml). A name and a link is enough to start.
- **Fix something wrong:** [open a "Report wrong info" issue](https://github.com/mrbarkan/quitanda/issues/new?template=wrong-info.yml) for a broken link, an outdated version, or an iPod a listing does or doesn't work on.
- **Share a theme:** use the [theme form on the site](https://quitanda.mrbarkan.com/themes/submit/). Themes don't go through GitHub.
- **Tell us whether something worked:** sign in on the site and use "Does it work on yours?" on any listing.

Each suggestion is read by a person before anything changes on the site.

## What belongs here

Anything that helps a click-wheel iPod (1st gen through Classic, mini and nano) do more:

- **Firmware**: Rockbox, its forks, and anything else that replaces or extends Apple's software.
- **Library apps**: programs that put music on an iPod or manage its library.
- **Hardware mods**: storage, batteries, Bluetooth, ports, cases, with the skill level they need.
- **Projects on the way**: things with no release yet go on the watch list.

Please don't link to Apple's firmware files, pirated software, or anything that can't be downloaded from its maker.

## Add a listing with a pull request

The whole catalog lives in one file, [`src/data/catalog.js`](src/data/catalog.js). The comment at the top of that file describes every field. You can [edit it right in GitHub](https://github.com/mrbarkan/quitanda/edit/main/src/data/catalog.js), and GitHub will make the fork and the pull request for you.

1. **Find the right list.** `firmwares`, `apps` or `mods`. A project with no release yet goes in `watchlist`.
2. **Copy a similar entry** and give it a unique `id` in lowercase letters, digits and hyphens. The id becomes its address, so `rockpod` lives at `/firmware/rockpod/`.
3. **Fill in which iPods it fits.** `devices` lists the iPods it fully supports and `partial` the ones with gaps, using the ids from the `devices` list near the top of the file (`ipod-video`, `ipod-classic`, `ipod-nano-2g` and so on).
4. **Set the status.** One of `stable`, `beta`, `experimental` or `archived`. The site shows them as Ripe, Ripening, Unripe and Preserved.
5. **Add links.** The first one in `links` becomes the main button, so make it the download or install page.
6. **If it's on GitHub,** set `github: "owner/repo"`. The nightly job then keeps the version, release date and stars up to date on its own.
7. **Credit whoever suggested it** with `suggestedBy` (see below).
8. **Tell people it's new.** Add the id to `latest.lines` so it shows in the "Fresh in" panel, and set `latest.date` and `updatedOn` to today. If you'd rather not, leave it and it'll be done when the PR is merged.

Not finished yet? Set `draft: true` to keep an entry off the site while you work on it.

A minimal firmware entry looks like this:

```js
{
  id: "my-firmware",
  name: "My Firmware",
  maker: "your-handle",
  categories: ["players"],
  status: "beta",
  version: "1.0",
  updated: "2026-11-01",
  github: "your-handle/my-firmware",
  stars: null,
  license: "GPL-2.0",
  blurb: "One or two sentences on what it does and why you'd want it.",
  devices: ["ipod-video", "ipod-classic"],
  partial: [],
  install: [
    "Install Rockbox first.",
    "Copy the `.rockbox` folder to the iPod."
  ],
  links: [
    { label: "Download", url: "https://github.com/your-handle/my-firmware/releases", icon: "download" },
    { label: "Source", url: "https://github.com/your-handle/my-firmware", icon: "source" }
  ],
  suggestedBy: "u/your_reddit_name"
}
```

### Credit with `suggestedBy`

Any firmware, app or mod can say who suggested it. Use a Reddit handle starting with `u/` or a GitHub handle starting with `@`, or a list of them:

```js
suggestedBy: "u/GarlicNo3695"
suggestedBy: ["u/GarlicNo3695", "@mrbarkan"]
```

The listing then shows "Suggested by" with a link to that person, and they get a card on the Contributors page listing everything they suggested. If you're adding a listing someone else suggested in an issue, credit them, not yourself. To add a note about what someone contributed beyond a listing, add them to [`src/data/contributors.js`](src/data/contributors.js).

### Screenshots

Put pictures in `public/screenshots/<listing id>/` and list them in [`src/data/screenshots.json`](src/data/screenshots.json) with their size and a short caption. Set `"pixel": true` for a 320×240 iPod screen capture so it's shown sharp. Only use screenshots you took yourself or that the project shares publicly, and say where they came from.

## How to write a listing

- **Be plain and specific.** "Plays FLAC and Opus gaplessly" beats "amazing audio".
- **Only claim what you know.** If you haven't tried it on an iPod, say where the information came from in your PR. If support for a model is unconfirmed, leave it out of `devices`.
- **Link to the maker,** not to mirrors or re-uploads.
- **Mention the risks.** If it can brick an iPod or needs soldering, the listing should say so.

## Check your change

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
npm run dev      # preview at http://localhost:4321
npm run build    # make sure the whole site still builds
npm test
```

If you only edited `catalog.js` in the browser, you can skip this. Every pull request is built and tested automatically, and the result shows on the PR.

## Changing the site itself

Bug fixes and improvements to the site's code are welcome too. For anything bigger than a small fix, open an issue first so we can talk it over. [docs/DEVELOPING.md](docs/DEVELOPING.md) explains how the code is organized, how sign-in and the database work, and how to run the Firebase emulators.

## Be kind

Quitanda is a hobby project for people who love old iPods. Be patient with newcomers, generous with credit, and respectful of the makers whose work is listed here.

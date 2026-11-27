# Developing Quitanda

How the site is built, run and deployed. For adding or fixing a listing, [CONTRIBUTING.md](../CONTRIBUTING.md) is the shorter read.

The site is static. [Astro](https://astro.build) turns the catalog into one page per listing, and GitHub Pages serves the result.

```
src/data/catalog.js         THE CATALOG: firmware, apps, mods, devices and the watch list
src/data/github-stats.json  versions, dates and stars, refreshed nightly (generated)
src/data/screenshots.json   which pictures belong to which listing
src/data/community.json     listings and fixes published from suggestions (generated nightly)
src/content/blog/           blog posts, one Markdown file each
src/pages/                  home, listings, apps, mods, themes, guides, blog, account, legal
src/components/             listing page and card, iPod drawings, sticker, ripeness chip
src/scripts/                page behavior: home.js (picker, filters, search), item.js, account.js
src/lib/                    catalog helpers, sign-in, themes, reports, member data
src/styles/site.css         all styling, light and dark, every color a token
public/screenshots/         the pictures
scripts/refresh-github.mjs  the nightly release tracker
firestore.rules, storage.rules, tests/   access rules and their tests
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

[CONTRIBUTING.md](../CONTRIBUTING.md#add-a-listing-with-a-pull-request) has the full walkthrough. In short:

Everything lives in `src/data/catalog.js`. The comments in that file describe every field.

1. Copy an existing entry in `firmwares`, `apps` or `mods` and give it a unique `id`. The id becomes its address, for example `/firmware/rockpod/`.
2. Fill in `devices` (and `partial`) using ids from the `devices` list.
3. The first item in `links` becomes the main button.
4. Add the id to `latest.lines` so the "Fresh in" panel shows it, and update `latest.date` and `updatedOn`.

Projects with no release yet go in `watchlist`. Move one into `firmwares` once it ships. Set `draft: true` to keep an entry off the site while you fill it in.

Status is one of `stable`, `beta`, `experimental` or `archived`. The site shows it as Ripe, Ripening, Unripe or Preserved, with the plain word beside it. Go by the best release people can get: a project with a stable release is `stable` even when it also has a beta channel, and `beta` is for projects whose only builds so far are betas or pre-releases.

## Change the shop's wording

The words the shop says in its own voice (the home page headline, the footer line, the sign-in box, the "page not found" page) live in one file, `src/data/copy.js`. Open it on GitHub, press the pencil, change the text between the quotes and commit. The site rebuilds itself. Listings are separate and live in `src/data/catalog.js`.

## What the stickers and colors mean

Every listing wears one sticker. Its shape and color show the listing's status, and the number in the middle is its version. The color behind the screenshot follows the same rule.

| Status in `catalog.js` | Sticker | Says |
| --- | --- | --- |
| `stable` | green, round | Ripe |
| `beta` | yellow, lemon | Ripening |
| `experimental` | red, scalloped | Unripe |
| `archived` | beige, arched label | Preserved |
| `community` | blue, diamond | Fresh pick |

Yellow buttons and the yellow tab are things to press. Stickers are drawn by `src/components/Badge.astro`, and `src/components/Sticker.astro` picks the look for each status.

## How the shop works

The home page opens with "Which iPod is yours?". Picking one is remembered in the browser and used everywhere: the home page shows only what runs on it, each listing says whether it runs on yours and offers the right file, and the compatibility table highlights its row. A link such as `/?ipod=ipod-classic` opens the shop already filtered.

- The picker's drawings come from each device's `look` in the catalog.
- A listing's version shows on a sticker when it is short (five characters or fewer).
- A listing without screenshots gets a drawn iPod screen showing the four words in its `menu`.
- Give a `files` entry a `device` id and the listing offers that file to people with that iPod.
- The header search box searches firmware, apps, mods, guides and blog posts.

"Does it work on yours?" on each listing counts reports per iPod model. Anyone can read the totals; sending one needs sign-in and an iPod from the person's list. Each signed-in person lists the iPods they own on the account page (several models, or two of the same), and every report names which of those iPods it was for, so two Classics count as two reports. Reports sent before the list existed name only the model and still count; reporting again for a listed iPod of that model replaces them. `src/lib/reports.js` and `src/lib/my-ipods.js` hold it.

## Suggestions from visitors

Signed-in visitors suggest listings at `/suggest/`: something new (name, link, who makes it, which iPods, a description), or a fix to a listing (a broken link, the wrong iPods, or anything else). There's a "Suggest" link in the footer, on empty shelves, on the apps and mods pages, and "Suggest a fix" on every listing. `src/lib/suggestions.js` holds the code.

- **Review.** Suggestions wait in the review queue (`/themes/review/`). "Approve and publish" lets you touch up the name, link, description, kind and iPods first. Approving writes the public side to the `community` collection; the suggestion itself, with the sender's account ID and notes, stays private.
- **Publishing.** Every night the deploy workflow runs `npm run refresh:community` (`scripts/refresh-community.mjs`), which saves the `community` collection to `src/data/community.json` and commits it. `src/lib/community.js` folds that into the catalog at build time: a new listing gets its own page (apps keep the platforms they run on), marked "From the community, not checked yet"; a fix replaces a listing's main link or its iPods. Wording fixes are credited but made by hand. To publish sooner, run the "Deploy site" workflow from the Actions tab.
- **Hand-written wins.** To take over a community listing, copy it into `catalog.js` with the same `id`. The hand-written entry then replaces it, and the sender keeps their credit. "Unpublish" in the review queue removes one at the next build.
- **Credit.** If the sender ticked the box, their display name goes into the listing's `suggestedBy` and onto `/contributors/`. Credited fixes appear there too.
- **Trusted contributors.** "Trust" on a suggestion adds its sender to the `trusted` collection. New listings they send are published without review, at the next build; their fixes to existing listings still wait in the queue. "Stop trusting" removes them. Admins count as trusted.

## Add screenshots

Put the pictures in `public/screenshots/<listing id>/` and list them in `src/data/screenshots.json` with their size and a short caption. Set `"pixel": true` for an iPod screen capture (320×240) so it's shown sharp at its real pixels. The first picture becomes the card thumbnail.

## Write a blog post

Add a file to `src/content/blog/` named `YYYY-MM-DD-your-title.md`:

```md
---
title: Your title
date: 2026-11-18
kind: News
art: mark
summary: One sentence for the blog index, RSS and link previews.
---

The post, in Markdown. Link to pages as /firmware/rockbox/.
```

`kind` is `News` or `Guide`; guides also appear on the Guides page. `art` picks the picture on the blog index: `mark`, `ipods` or `themes`.

## Release tracking

Every night the deploy workflow runs `scripts/refresh-github.mjs`. For each listing with a `github` field it reads the stars, the latest release and the last push, and saves them to `src/data/github-stats.json`. Those values override the ones in the catalog, and a version change appears in the "Fresh in" panel for two weeks.

To run it yourself:

```bash
GITHUB_TOKEN=your_token npm run refresh
```

The tests for it run with `npm test`.

## What's new and the release feeds

`/releases/` lists the latest version of every firmware and app that has a numbered version and a release date, newest first, with a filter per iPod. It needs no upkeep: it reads the same catalog and nightly stats as the rest of the site.

Each list is also an RSS feed, so people can follow new versions in a feed reader without an account: `/releases.xml` for everything and `/releases/<device id>.xml` per iPod (for example `/releases/ipod-classic.xml`). A new version is a new feed item. `src/lib/releases.js` builds both.

## Reports on the shelves

Each listing's card shows what owners reported: for the chosen iPod ("2 of 3 owners say it works on the Classic"), or in total when none is chosen. Cards with no reports for the chosen iPod ask for the first one, and the home page says how many are still waiting. The counts come from one public request for all reports (`loadAllReports` in `src/lib/reports.js`, shown by `src/scripts/card-reports.js`). It reads up to 3,000 reports; past that, count them in the nightly build instead.

## Release alerts by email

Signed-in people can ask for an email when something for their iPod has a new version: on `/releases/` ("Email me about the Classic") or on their account page. Their choice is a record in `alerts` holding the address they signed in with, the iPods, and a secret key for the unsubscribe link (`src/lib/alerts.js`).

Every night, after the versions are refreshed, `scripts/send-alerts.mjs` compares the stats file from before and after, and sends one email per person through [Brevo](https://www.brevo.com) covering every new release that fits their iPods. The link in each email (`/alerts/off/`) switches the alerts off without signing in. Addresses never appear in the job's log.

**The whole feature is off until `ALERTS_ON` is true** in `src/lib/alerts-config.js`. While it is false, the site shows no email sign-up and the privacy pages don't mention Brevo. To switch it on:

1. In Brevo: create an account, add and authenticate the sending domain (Brevo gives you DNS records to add), and add the sender address. Switch off open and click tracking for transactional email, so alerts carry no tracking. Create an API key.
2. In the Google Cloud console for the Firebase project: create a service account with the single role **Cloud Datastore Viewer**, and download a JSON key for it. It can read the database and nothing else.
3. In the GitHub repository, under Settings › Secrets and variables › Actions, add two secrets: `BREVO_API_KEY` and `FIREBASE_SERVICE_ACCOUNT` (the whole JSON file's contents).
4. Set `ALERTS_ON` to true, update the date at the top of `/privacy/` and `/gdpr/`, and deploy. Sign up for alerts yourself.
5. Run the "Deploy site" workflow by hand with `test_alert` set to a listing id, for example `rockpod`. It emails only admins who signed up for an iPod that listing runs on. Check the email arrives, isn't in spam, and that its "Stop these emails" link works.

The sender address defaults to the site's contact address; set `ALERTS_FROM_EMAIL` and `ALERTS_FROM_NAME` in the workflow to change it. Brevo's free plan sends 300 emails a day, so the script stops at 280 and says how many people it couldn't reach. To see what a night would send without sending it: `npm run alerts -- --dry-run <stats-before.json>`.

## Sign-in and the database

Sign-in and shared data run on Firebase (project `quitanda-95fa7`).

- `src/lib/firebase-config.js` holds the project's public web config and the list of sign-in methods shown.
- `src/lib/auth.js` is the only file that imports Firebase. It loads on demand, so visitors who never sign in never download it.
- `firestore.rules`, `firestore.indexes.json` and `storage.rules` are the access rules for the database and for uploaded files. Publish changes with:

```bash
npm run deploy:rules
```

## Themes

People share themes at `/themes/submit/`. The page checks the file in the browser before anything is uploaded (`src/lib/theme-file.js`): it refuses programs, Rockbox plugins and firmware images, reads a CrateDigger theme's name and colors from its `theme.json`, and asks for a license file beside any bundled font.

`/themes/rockbox/` is the Rockbox shelf: every theme that runs on Rockbox or a firmware built on it, a filter per firmware, and a guide to what goes in a Rockbox theme's zip. Its "Share a Rockbox theme" button opens the form set to Rockbox (`/themes/submit/?for=rockbox`).

- **Also works on:** a firmware theme can be tagged with the other Rockbox-family firmware it runs on. They're saved in `worksOn` (the firmware it was made for comes first), and the theme appears on each of their shelves.
- **Remixes:** a theme can name up to five themes it remixes, saved in `remixOf`: a theme on this site by its ID (also listed in `remixIds`, so the original can show its remixes), or an https link to anywhere else. Each theme's page has a "Remix this" button that opens the form with the original filled in, except for themes marked "All rights reserved".

A shared theme is hidden until an admin approves it. Its files can only be fetched through the links saved on its record, an uploaded file can never be replaced, and editing a theme sends it back for review.

- `src/lib/themes-read.js` reads the gallery through the database's public web API, so browsing needs no Firebase download.
- `src/lib/themes-write.js` uploads, deletes, flags and reviews. It loads only for signed-in people.

## Welcome page, guides and the newsletter list

- `/welcome/` is where someone lands after their first sign-in. They choose "I use an iPod" or "I make things for iPods", and may tick the newsletter box. It is never ticked for them.
- `/start/ipod-users/` and `/start/makers/` are the two guides. Anyone can read them.
- The role is saved in the private `members` collection. A newsletter opt-in is a record in `subscribers` holding the name, the verified address the person signed in with, the date, and which wording they agreed to (`CONSENT` in `src/lib/member.js`; change it if the wording changes). Unsubscribing deletes the record.
- As admin, your account page shows the subscriber count and a CSV download. Use the list only to send the newsletter.

## Privacy pages

`/privacy/` and `/gdpr/` describe what the site does today. If you change what is collected, who processes it, or how deletion works, change those pages in the same commit. Before the first newsletter goes out, name the email service on `/privacy/`.

The site shows Google AdSense ads, and `/privacy/#ads` describes them. `src/lib/ads.js` holds the publisher ID and the ad unit IDs. While the publisher ID is empty, nothing loads from AdSense. With it set, every page loads the AdSense script and the footer gets a "Privacy and cookie settings" link, and `/ads.txt` names the publisher. `src/components/Ad.astro` draws one labeled ad. It's placed at the bottom of listing pages and the end of blog posts. Before the ads go live, turn on Google's consent message for the EU, UK and Switzerland in AdSense › Privacy & messaging (with the "Privacy and cookie settings" link the pages mention). If the ads change, for example another ad network is added, update `/privacy/` and `/gdpr/` in the same commit.

`contactEmail` in `SITE` (`src/lib/catalog.js`) is the address people write to about their data. It appears on both pages.

The account page backs the promises those pages make: "Download my data", "Unsubscribe" and "Delete my account" (which removes the profile, settings, newsletter record, shared themes and their files, reports, and the sign-in). `src/lib/member.js` holds that code.

## Testing the rules and the upload flow

The Firebase emulators run the real rules on your machine, so nothing touches live data. They need Java.

```bash
npm run emulators
```

```bash
npm run test:rules
```

To try the site itself against the emulators, run `npm run dev:local` while they are up.

To make someone an admin, create a document in the `admins` collection named with their user ID, and add the same ID to `isAdmin()` in `storage.rules`. Admins approve or decline shared themes at `/themes/review/`.

To add GitHub sign-in: enable the GitHub provider in the Firebase console (it needs a GitHub OAuth app), then add `"github"` to `providers` in `src/lib/firebase-config.js`.

A new site address must be added in the Firebase console under Authentication › Settings › Authorized domains, or sign-in will refuse it.

## Deploy

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main`, every night, and on demand from the Actions tab.

It needs one setting: **Settings › Pages › Source: GitHub Actions**. The workflow reads the site address from the Pages settings, so adding a custom domain there needs no change in the code.

/*
 * The Quitanda catalog: the single source of truth for the site.
 * Firmware, library apps, hardware mods and the watch list all live here.
 *
 * ADDING A FIRMWARE
 *   Copy an object in `firmwares`, give it a unique `id` (lowercase letters,
 *   digits and hyphens; it becomes the page address, e.g. /firmware/rockpod/)
 *   and fill it in. Then add a line to `latest` so visitors see what changed.
 *
 * FIELDS
 *   maker        person or group who makes it
 *   categories   ids from `categories` below
 *   pinned       true to show it in the strip above the grid
 *   status       "stable" | "beta" | "experimental" | "archived"
 *   version      latest version label, or null
 *   updated      ISO date (YYYY-MM-DD or YYYY-MM) of the latest release, or null
 *   github       "owner/repo" if the code is on GitHub. The nightly job then
 *                keeps stars, version and date fresh (src/data/github-stats.json
 *                overrides the values written here).
 *   stars        GitHub stars, used until the nightly job has run
 *   blurb        one or two sentences, shown on the card
 *   more         extra paragraphs, shown under MORE
 *   features     short list shown under MORE
 *   devices      device ids it fully supports; `partial` for ones with gaps
 *   requires     what must be in place first (optional)
 *   install      ordered steps. Wrap file names and paths in `backticks`.
 *   files        file names per device: { label, file }
 *   links        the first is the main button; the rest go in its menu.
 *                icon: "download" | "install" | "source" | "docs" | "release" | "info"
 *
 * The starter entries were compiled from each project's public pages in
 * November 2026. Check versions and dates before you launch.
 */
export default {
  updatedOn: "2026-11-18",

  latest: {
    date: "2026-11-18",
    lines: [
      { label: "Added library apps", ids: ["iopenpod", "stonepod", "swinsian", "foo-dop", "copytrans-manager", "musicbee", "rhythmbox", "finder-itunes", "cratedigger"] },
      { label: "Watching", ids: ["helikon-os"], suffix: "on the watch list, with its launcher and music player beta due this month" },
      { label: "Added firmware", ids: ["podbox", "rodbox", "skvm-podbox", "rockbox", "rockpod", "rockpod-apple2026", "rpod", "ipod-sun", "ipodlinux"] }
    ]
  },

  platforms: ["macOS", "Windows", "Linux", "iPhone", "Web"],

  categories: [
    { id: "players",    name: "Music players" },
    { id: "interfaces", name: "Interfaces & themes" },
    { id: "audio",      name: "Audio & hardware" },
    { id: "tools",      name: "Tools & exploits" },
    { id: "games",      name: "Games & extras" }
  ],

  devices: [
    { id: "ipod-1g2g",    name: "iPod 1st / 2nd gen",   short: "1G/2G",   years: "2001–02" },
    { id: "ipod-3g",      name: "iPod 3rd gen",         short: "3G",      years: "2003" },
    { id: "ipod-4g",      name: "iPod 4th gen",         short: "4G",      years: "2004" },
    { id: "ipod-photo",   name: "iPod Photo / Color",   short: "Photo",   years: "2004–05" },
    { id: "ipod-video",   name: "iPod Video 5G / 5.5G", short: "Video",   years: "2005–07" },
    { id: "ipod-classic", name: "iPod Classic 6G / 7G", short: "Classic", years: "2007–14" },
    { id: "ipod-mini",    name: "iPod mini 1G / 2G",    short: "mini",    years: "2004–05" },
    { id: "ipod-nano-1g", name: "iPod nano 1st gen",    short: "nano 1G", years: "2005" },
    { id: "ipod-nano-2g", name: "iPod nano 2nd gen",    short: "nano 2G", years: "2006" },
    { id: "ipod-nano-3g", name: "iPod nano 3rd gen",    short: "nano 3G", years: "2007" },
    { id: "ipod-nano-4g", name: "iPod nano 4th gen",    short: "nano 4G", years: "2008" },
    { id: "ipod-nano-5g", name: "iPod nano 5th gen",    short: "nano 5G", years: "2009" },
    { id: "ipod-nano-6g", name: "iPod nano 6th gen",    short: "nano 6G", years: "2010" },
    { id: "ipod-nano-7g", name: "iPod nano 7th gen",    short: "nano 7G", years: "2012–15" }
  ],

  firmwares: [
    {
      id: "rockbox",
      name: "Rockbox",
      maker: "The Rockbox Project",
      categories: ["players", "games"],
      pinned: true,
      status: "stable",
      version: "4.0",
      updated: "2025-04",
      github: null,
      stars: null,
      license: "GPL-2.0",
      blurb: "The open source firmware most of the others build on. It replaces Apple’s software with one that plays FLAC, Opus and more, gaplessly, with themes, an equalizer and plugins.",
      more: [
        "Rockbox installs alongside Apple’s firmware, so you can still boot the original by holding a button at power-on. Rockbox Utility detects your iPod and installs the bootloader and the `.rockbox` folder in one step.",
        "Most firmwares on this page are forks of Rockbox and need its bootloader in place first."
      ],
      features: [
        "Plays FLAC, Opus, Vorbis, ALAC, WavPack and more",
        "Gapless playback, replay gain and crossfeed",
        "Ten-band parametric equalizer",
        "Hundreds of community themes",
        "Plugins: games, visualizers, a file browser",
        "Dual boot with Apple’s firmware"
      ],
      devices: ["ipod-3g", "ipod-4g", "ipod-photo", "ipod-video", "ipod-classic", "ipod-mini", "ipod-nano-1g", "ipod-nano-2g"],
      partial: [],
      requires: "A computer running Windows, macOS or Linux",
      install: [
        "Back up your music. If the iPod has never been restored, restore it with iTunes or Finder first.",
        "Download and open Rockbox Utility.",
        "Connect the iPod. Rockbox Utility detects the model.",
        "Choose Minimal or Complete installation. This installs the bootloader and the `.rockbox` folder.",
        "Eject the iPod and reboot. It now starts in Rockbox."
      ],
      files: [
        { label: "Every supported iPod", file: "Rockbox Utility" }
      ],
      links: [
        { label: "Install", url: "https://www.rockbox.org/wiki/RockboxUtility", icon: "install" },
        { label: "All downloads", url: "https://www.rockbox.org/download/", icon: "download" },
        { label: "Manual", url: "https://www.rockbox.org/manual.shtml", icon: "docs" },
        { label: "Source", url: "https://git.rockbox.org/", icon: "source" }
      ]
    },

    {
      id: "rockpod",
      name: "Rockpod",
      maker: "nuxcodes",
      categories: ["players", "audio", "interfaces"],
      status: "stable",
      version: "5.5",
      updated: "2026-08-01",
      github: "nuxcodes/rockpod",
      stars: null,
      license: "GPL-2.0",
      basedOn: "rockbox",
      blurb: "A Rockbox fork for the Classic and Video that sends digital audio out of the dock connector, with a rewritten Cover Flow and colors taken from your album art.",
      more: [
        "Rockpod is a drop-in replacement for official Rockbox: you unzip it over the existing install, with no reformat and no lost music. 5.5 fixes Bluetooth transmitters and car head units, held-button ghost clicks and 48 kHz playback speed, and limits USB audio to the Classic.",
        "Digital audio out works with MFi accessories such as DACs, speakers and docks. A 6.0 alpha brings it to the iPod Video, untested on hardware."
      ],
      features: [
        "MFi digital audio over the dock connector (Classic)",
        "Cover Flow with seven visible slides and its own menu entry",
        "Interface colors drawn from the playing album, with 500 ms fades",
        "Storage tuned for iFlash and SSD mods",
        "Codec power-down when idle, charger detection",
        "Strips “01 ” prefixes from track names"
      ],
      devices: ["ipod-classic", "ipod-video"],
      partial: [],
      requires: "Rockbox bootloader already installed",
      install: [
        "Check that your iPod already runs the Rockbox bootloader. If not, install Rockbox first.",
        "Download the zip for your model.",
        "Connect the iPod in disk mode.",
        "Extract the zip to the root of the iPod. It creates or updates the `.rockbox` folder and leaves your music alone.",
        "Eject and reboot. Cover Flow rebuilds its album art cache on first launch."
      ],
      files: [
        { label: "iPod Classic 6G / 7G", file: "rockbox-ipod6g.zip" },
        { label: "iPod Video 5G / 5.5G", file: "rockbox-ipodvideo-5g.zip" }
      ],
      links: [
        { label: "Download", url: "https://github.com/nuxcodes/rockpod/releases/latest", icon: "download" },
        { label: "All releases", url: "https://github.com/nuxcodes/rockpod/releases", icon: "release" },
        { label: "Source", url: "https://github.com/nuxcodes/rockpod", icon: "source" }
      ]
    },

    {
      id: "rockpod-apple2026",
      name: "Apple2026 UI",
      maker: "Ricolinos",
      categories: ["interfaces"],
      status: "experimental",
      version: "Beta Update 2",
      updated: null,
      github: "Ricolinos/ipod-custom-os",
      stars: null,
      license: "GPL-2.0, fonts excluded",
      basedOn: "rockpod",
      blurb: "A Rockpod branch that lays a modern Apple-style interface over the Classic, with a split main menu and a Spanish-language shell.",
      more: [
        "It keeps Rockpod’s digital audio out, Cover Flow and SSD-aware power management. Dynamic album colors are off by default. Its maker calls it an experimental beta: expect bugs and regressions, and keep a copy of your old `.rockbox` folder.",
        "The bitmap fonts are derived from Apple’s SF Pro and SF Compact for educational use and are not covered by the GPL."
      ],
      features: [
        "Apple2026 interface layer",
        "Split root menu",
        "Spanish-language shell",
        "Rockpod’s digital audio out and Cover Flow"
      ],
      devices: ["ipod-classic"],
      partial: ["ipod-video"],
      requires: "Rockbox bootloader already installed",
      install: [
        "Check that your iPod already runs the Rockbox bootloader.",
        "Download the zip for your model.",
        "Connect the iPod in disk mode and copy the existing `.rockbox` folder to your computer.",
        "Extract the zip to the root of the iPod, replacing `.rockbox`.",
        "Eject and reboot. With a battery upgrade or iFlash mod, check Settings › System › Battery and Disk."
      ],
      files: [
        { label: "iPod Classic 6G / 7G", file: "rockbox-ipod6g.zip" },
        { label: "iPod Video 5G / 5.5G (alpha)", file: "rockbox-ipodvideo-5g.zip" }
      ],
      links: [
        { label: "Download", url: "https://github.com/Ricolinos/ipod-custom-os", icon: "download" },
        { label: "Source", url: "https://github.com/Ricolinos/ipod-custom-os", icon: "source" }
      ]
    },

    {
      id: "rpod",
      name: "RPod",
      maker: "remigius-labs",
      categories: ["interfaces"],
      status: "beta",
      version: null,
      updated: null,
      github: "remigius-labs/rockbox",
      stars: 0,
      license: "GPL-2.0",
      basedOn: "rockbox",
      blurb: "A modernized Rockbox for the iPod Classic with its own theme, kept as a clean series of commits on top of upstream.",
      more: [
        "Each RPod change is its own commit on top of a pinned Rockbox revision, which makes it easy to see exactly what differs from official Rockbox. The download, theme and install steps live on the project’s main page."
      ],
      features: [
        "Custom theme for the Classic",
        "Each change a separate commit over upstream Rockbox"
      ],
      devices: ["ipod-classic"],
      partial: [],
      requires: "Rockbox bootloader already installed",
      install: [
        "Follow the download and theme steps on the RPod project page."
      ],
      files: [],
      links: [
        { label: "Install", url: "https://github.com/remigius-labs/rpod", icon: "install" },
        { label: "Source", url: "https://github.com/remigius-labs/rockbox", icon: "source" }
      ]
    },

    {
      id: "podbox",
      name: "PodBox",
      maker: "anthonyfletcher",
      categories: ["players", "interfaces", "audio", "games"],
      status: "beta",
      version: null,
      updated: null,
      github: "anthonyfletcher/podbox",
      stars: 67,
      license: "GPL-2.0",
      basedOn: "rockpod",
      blurb: "Rockbox reworked for the Classic and Video, with album covers and artist photos beside every list and a Now Playing screen colored by the track.",
      more: [
        "PodBox builds on Rockbox and Rockpod and adds a lot: audiobook and podcast tracking, a Playback Report with listening stats, a Playlist Engine that builds playlists from analyzed audio, an Arcade of click-wheel games, and car, dock and USB DAC support. Several features are marked new or experimental.",
        "Artist pictures come from a `folder.jpg` in each artist\u2019s folder. CrateDigger can write these for you. Themes are rebuilt for each release, so update them along with PodBox."
      ],
      features: [
        "Art beside every list, plus an Artist Portraits carousel",
        "Colors from the playing track, with the Scrim theme",
        "Audiobook and podcast resume",
        "Playback Report with stats and badges",
        "Playlist Engine from analyzed audio",
        "Arcade of click-wheel games",
        "Dock, USB DAC and iAP2 car support"
      ],
      devices: ["ipod-classic", "ipod-video"],
      partial: [],
      requires: "Rockbox bootloader, for a first install",
      install: [
        "If the iPod has never run Rockbox, install the Rockbox bootloader first.",
        "Download the zip for your model from the latest release.",
        "Unzip it to the root of the iPod so `.rockbox` sits beside your music.",
        "Optional: install the PodBox bootloader. It boots PodBox even with Hold on, and holding Menu at startup boots Apple\u2019s firmware.",
        "On first run PodBox builds its database and art cache. To update, unzip the new release over the old one."
      ],
      files: [
        { label: "iPod Classic 6G / 7G", file: "rockbox-ipod6g.zip" },
        { label: "iPod Video 5G / 5.5G", file: "rockbox-ipodvideo-5g.zip" },
        { label: "PodBox bootloader", file: "podbox-bootloader.zip" },
        { label: "Every theme", file: "all-themes.zip" }
      ],
      links: [
        { label: "Download", url: "https://github.com/anthonyfletcher/podbox/releases/latest", icon: "download" },
        { label: "Bootloader", url: "https://github.com/anthonyfletcher/podbox/releases/tag/Bootloader", icon: "install" },
        { label: "Arcade IDE", url: "https://anthonyfletcher.github.io/podbox/ide/", icon: "info" },
        { label: "Source", url: "https://github.com/anthonyfletcher/podbox", icon: "source" }
      ]
    },

    {
      id: "rodbox",
      name: "RodBox",
      maker: "RodrigoM09",
      categories: ["players", "interfaces"],
      status: "experimental",
      version: "PB55",
      updated: "2026-11-15",
      github: "RodrigoM09/RodBox",
      stars: 0,
      license: "GPL, with separately licensed parts",
      basedOn: "podbox",
      blurb: "A carefully documented PodBox build for the iPod Classic, with credited upstream fixes, the Scrim theme, per-book audiobook resume and a regression test suite.",
      more: [
        "RodBox combines Rockbox, PodBox and Rockpod with its own adaptations, and records every step as a numbered checkpoint. PB55, from 15 November 2026, was built, installed and read back on the developer\u2019s own iPod, and passes all 37 USB test scripts.",
        "It was developed on a flash-modded iPod Classic 7th gen, and its maker promises nothing for other Classics, adapters, headsets or docks. There\u2019s no download: you build it from source, and the `main` branch stays a locked stable reference while new work happens on `community`."
      ],
      features: [
        "PodBox music browsing with artwork rows",
        "Per-book audiobook progress and chapters",
        "Native Scrim theme",
        "Single, double and triple-click headset buttons",
        "Analyze Music Now: on-device acoustic analysis",
        "Storage-mode safeguards and USB fixes",
        "Mac tools for verified copies and library health checks"
      ],
      devices: ["ipod-classic"],
      partial: [],
      requires: "Rockbox bootloader, and a Rockbox build environment",
      install: [
        "Read `BUILD.md`, `TESTING.md` and `RECOVERY.md` in the repository first.",
        "Back up your settings and audiobook progress.",
        "Build the `ipod6g` target and copy it to the iPod. Don\u2019t mix it with codecs or themes from an older build.",
        "A firmware update never replaces the bootloader."
      ],
      files: [],
      links: [
        { label: "Source", url: "https://github.com/RodrigoM09/RodBox", icon: "source" },
        { label: "Build guide", url: "https://github.com/RodrigoM09/RodBox/blob/main/BUILD.md", icon: "docs" },
        { label: "Recovery guide", url: "https://github.com/RodrigoM09/RodBox/blob/main/RECOVERY.md", icon: "docs" },
        { label: "Checkpoints", url: "https://github.com/RodrigoM09/RodBox/tags", icon: "release" }
      ]
    },

    {
      id: "skvm-podbox",
      name: "SKVM PodBox",
      maker: "JL2030",
      categories: ["players", "audio", "interfaces"],
      status: "beta",
      version: "Source only",
      updated: null,
      github: "JL2030/skvm-podbox",
      stars: 0,
      license: "GPL-2.0",
      basedOn: "rockbox",
      blurb: "A Rockbox build for the Classic and Video with bit-perfect digital audio to MFi accessories, a rewritten Cover Flow and colors drawn from album art.",
      more: [
        "Despite the name, its feature list matches Rockpod\u2019s more than PodBox\u2019s: MFi digital audio, the seven-slide Cover Flow, dynamic colors and SSD-aware power management. Digital audio keeps the EQ, crossfeed and replay gain, and was tested mainly with the OPPO HA-2SE. It\u2019s limited to 16-bit PCM at 44.1 or 48 kHz.",
        "The project calls both ports stable, but it hasn\u2019t published a release yet, so for now you build it from source. MFi audio on the iPod Video, and generic USB DACs through host mode, are on its roadmap."
      ],
      features: [
        "Bit-perfect MFi digital audio over USB (Classic)",
        "Cover Flow with seven slides and a crossfade",
        "Album-art colors with contrast enforcement, on by default",
        "HDD and SSD detection with a lighter sleep for flash",
        "Codec power-down and charger detection",
        "Bundled adwaitapod and Themify 2 themes"
      ],
      devices: ["ipod-classic", "ipod-video"],
      partial: [],
      requires: "Rockbox bootloader already installed",
      install: [
        "Install the Rockbox bootloader if you haven\u2019t, using Rockbox Utility.",
        "Build it from source, or download the zip for your model once a release appears.",
        "Connect the iPod in disk mode and extract the zip to its root. It creates or updates `.rockbox`.",
        "Eject and reboot. The album art cache rebuilds on first launch."
      ],
      files: [
        { label: "iPod Classic 6G / 7G", file: "skvm-podbox-ipod6g.zip" },
        { label: "iPod Video 5G / 5.5G", file: "skvm-podbox-ipodvideo-5g.zip" }
      ],
      links: [
        { label: "Source", url: "https://github.com/JL2030/skvm-podbox", icon: "source" },
        { label: "Releases", url: "https://github.com/JL2030/skvm-podbox/releases", icon: "release" }
      ]
    },

    {
      id: "ipod-sun",
      name: "ipod_sun",
      maker: "CUB3D",
      categories: ["tools"],
      status: "experimental",
      version: "Source only",
      updated: null,
      github: "CUB3D/ipod_sun",
      stars: 97,
      license: "GPL-3.0",
      blurb: "Code execution on the iPod nano 6th and 7th generation, which Rockbox has never reached. It builds a patched Apple firmware you flash over DFU.",
      more: [
        "ipod_sun chains two bugs: swapping the firmware’s disk and osos sections skips a signature check, and a malformed font triggers a stack overflow. The result adds a SCSI command that reads and writes memory and runs code.",
        "This is a tool for developers, not a player firmware. A bad payload can permanently brick the iPod, and some units will not enter DFU with a worn battery."
      ],
      features: [
        "Custom SCSI command for memory read, write and execute",
        "Bootrom dumper and firmware decrypter",
        "Targets nano 6G and the mid-2015 nano 7G"
      ],
      devices: ["ipod-nano-6g", "ipod-nano-7g"],
      partial: [],
      requires: "Rust, Python with pyfatfs and fonttools, arm-none-eabi-gcc",
      install: [
        "Install the Python packages `pyfatfs` and `fonttools`, plus `arm-none-eabi-gcc`.",
        "Build the patched firmware with `cargo r --release -- --device=nano7-refresh`.",
        "Flash the resulting `Firmware-repack.MSE` over DFU."
      ],
      files: [
        { label: "Built locally", file: "Firmware-repack.MSE" }
      ],
      links: [
        { label: "Source", url: "https://github.com/CUB3D/ipod_sun", icon: "source" },
        { label: "freemyipod wiki", url: "https://freemyipod.org/wiki/Ipod_sun", icon: "docs" }
      ]
    },

    {
      id: "ipodlinux",
      name: "iPodLinux",
      maker: "iPodLinux Project",
      categories: ["players", "games"],
      status: "archived",
      version: "Final",
      updated: null,
      github: null,
      stars: null,
      license: "GPL-2.0",
      blurb: "The project that first ran a Linux kernel on an iPod, with the Podzilla menu shell and its modules. No longer developed; listed for collectors.",
      more: [
        "iPodLinux used Loader2 to choose between Apple’s firmware and Linux at power-on. Use a spare iPod: the installer repartitions the drive and can leave it needing a restore."
      ],
      features: [
        "Podzilla menu shell with games and tools",
        "Loader2 dual boot"
      ],
      devices: ["ipod-3g", "ipod-4g", "ipod-photo", "ipod-mini"],
      partial: ["ipod-nano-1g", "ipod-video"],
      requires: "A Windows PC for the installer",
      install: [
        "Download the installer from the project archive.",
        "Follow it to partition the iPod and add Loader2."
      ],
      files: [],
      links: [
        { label: "Archive", url: "https://sourceforge.net/projects/ipodlinux/files/", icon: "download" },
        { label: "Project page", url: "https://sourceforge.net/projects/ipodlinux/", icon: "info" }
      ]
    }
  ],

  /*
   * LIBRARY APPS: software on your computer or phone that puts music on an iPod.
   * Same fields as firmware, plus:
   *   platforms    from `platforms` above
   *   price        short text, e.g. "Free", "Paid", "Free, open source"
   *   devices      iPods it can sync. Leave empty and set `devicesNote` if the
   *                developer doesn't publish a list.
   *   draft        true hides the entry until it is filled in
   */
  apps: [
    {
      id: "finder-itunes",
      name: "Finder & iTunes",
      maker: "Apple",
      pinned: true,
      platforms: ["macOS", "Windows"],
      price: "Free",
      status: "stable",
      version: null,
      updated: null,
      github: null,
      stars: null,
      license: "Proprietary",
      blurb: "Apple’s own sync. On a Mac, Finder syncs an iPod from the Music app. On Windows, iTunes still handles click-wheel iPods.",
      more: [
        "It’s the baseline every other app here is measured against: it writes the iPod’s own database, so the stock firmware sees everything. It only syncs from one library per computer, and it converts nothing it can’t play, so FLAC has to be converted first."
      ],
      features: [
        "Syncs music, podcasts, audiobooks, photos and video",
        "Restores and updates Apple’s firmware",
        "Enables disk mode, which most other apps here need"
      ],
      devices: ["ipod-1g2g", "ipod-3g", "ipod-4g", "ipod-photo", "ipod-video", "ipod-classic", "ipod-mini", "ipod-nano-1g", "ipod-nano-2g", "ipod-nano-3g", "ipod-nano-4g", "ipod-nano-5g", "ipod-nano-6g", "ipod-nano-7g"],
      partial: [],
      install: [
        "Mac: connect the iPod and select it in the Finder sidebar.",
        "Windows: install iTunes, connect the iPod, and click the iPod icon.",
        "Choose what to sync, and tick “Enable disk use” if you plan to use another app or Rockbox."
      ],
      links: [
        { label: "iPod support", url: "https://support.apple.com/ipod", icon: "docs" },
        { label: "iTunes for Windows", url: "https://www.apple.com/itunes/", icon: "download" }
      ]
    },

    {
      id: "iopenpod",
      name: "iOpenPod",
      maker: "TheRealSavi",
      platforms: ["macOS", "Windows", "Linux"],
      price: "Free, open source",
      status: "beta",
      version: null,
      updated: null,
      github: "TheRealSavi/iOpenPod",
      stars: 527,
      license: "GPL-3.0-or-later",
      blurb: "A free, open source iTunes replacement for every platform. It syncs music, edits playlists and tags, and shows you every change before it writes to the iPod.",
      more: [
        "iOpenPod converts audio and video during sync, so FLAC libraries work on stock firmware. It also installs click-wheel games, syncs podcasts, scrobbles, and backs up and restores the whole iPod. It’s under active development, and the team is reverse engineering parts of the iPod firmware as it goes."
      ],
      features: [
        "Review changes before every sync",
        "Smart playlists with rules",
        "Converts audio and video on the way in",
        "Click-wheel game installs",
        "Podcasts, photos, Last.fm and ListenBrainz scrobbling",
        "Full device backup and restore"
      ],
      devices: ["ipod-1g2g", "ipod-3g", "ipod-4g", "ipod-photo", "ipod-video", "ipod-classic", "ipod-mini", "ipod-nano-1g", "ipod-nano-2g", "ipod-nano-3g", "ipod-nano-4g", "ipod-nano-5g", "ipod-nano-6g", "ipod-nano-7g"],
      partial: [],
      install: [
        "Download the build for your computer, or get it from the Microsoft Store, or run `uv tool install iopenpod`.",
        "Connect the iPod with disk use enabled.",
        "Pick your library, review the changes, and sync."
      ],
      links: [
        { label: "Download", url: "https://github.com/TheRealSavi/iOpenPod/releases/latest", icon: "download" },
        { label: "Website", url: "https://iopenpod.com", icon: "info" },
        { label: "Source", url: "https://github.com/TheRealSavi/iOpenPod", icon: "source" }
      ]
    },

    {
      id: "stonepod",
      name: "Stonepod",
      maker: "Stonepod",
      platforms: ["iPhone", "Web"],
      price: "Free beta",
      status: "beta",
      version: null,
      updated: null,
      github: null,
      stars: null,
      blurb: "A 3D click-wheel music player for iPhone that also manages a real iPod over a cable and adapter: browse it, back it up, and add or remove songs.",
      more: [
        "The player recreates the wheel with click sounds and haptics, and plays from Apple Music, radio, podcasts, iCloud Drive or a Navidrome or Subsonic server.",
        "Stonepod Web does the iPod side from a computer browser. Chrome and Edge can do everything; Safari and Firefox can only read the iPod. Backups made in the app or on the web can be put back on the iPod."
      ],
      features: [
        "3D click wheel with haptics",
        "Browse an iPod’s music, photos and video",
        "Back up and check the library",
        "Add and remove songs, rename the iPod",
        "Works from the browser, no install"
      ],
      devices: [],
      partial: [],
      devicesNote: "Reads most iPods. Adding and removing songs works on many models; the app shows what yours supports.",
      install: [
        "iPhone: join the TestFlight beta and connect the iPod with its cable and an adapter.",
        "Computer: open Stonepod Web in Chrome or Edge and connect the iPod."
      ],
      links: [
        { label: "Join the beta", url: "https://testflight.apple.com/join/rmyTSJ1K", icon: "install" },
        { label: "Stonepod Web", url: "https://saveyouripod.com/en/ipod-sync/", icon: "info" },
        { label: "Reddit thread", url: "https://www.reddit.com/r/ipod/comments/1xxtgw1/stonepod_a_3d_music_player_ipod_manager_and_more/", icon: "docs" }
      ]
    },

    {
      id: "swinsian",
      name: "Swinsian",
      maker: "Swinsian",
      platforms: ["macOS"],
      price: "Paid",
      status: "stable",
      version: null,
      updated: null,
      github: null,
      stars: null,
      license: "Proprietary",
      blurb: "A fast, lightweight Mac music player built for large libraries, with iPod sync for classic iPods.",
      more: [
        "Swinsian handles FLAC, Opus and other formats the Music app won’t touch, and keeps a big library quick to search. Turn on disk use for the iPod before you sync; Swinsian’s FAQ walks through it."
      ],
      features: [
        "Plays FLAC, Opus, Vorbis and more",
        "Smart playlists and fast search",
        "Syncs to classic iPods"
      ],
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      devicesNote: "Swinsian supports classic iPods. Check its FAQ for your exact model.",
      install: [
        "Download Swinsian and add your music folder.",
        "Enable disk use for the iPod, then connect it.",
        "Choose the playlists to sync."
      ],
      links: [
        { label: "Website", url: "https://swinsian.com/", icon: "download" }
      ]
    },

    {
      id: "foo-dop",
      name: "iPod manager for foobar2000",
      maker: "reupen",
      platforms: ["Windows"],
      price: "Free",
      status: "stable",
      version: "0.7.2",
      updated: "2020-02",
      github: "reupen/ipod_manager",
      stars: null,
      license: "LGPL",
      blurb: "The foobar2000 component (foo_dop) that turns the player into a full iPod manager, with on-the-fly conversion and smart playlists.",
      more: [
        "It hasn’t had a release since 2020, but it still works with click-wheel iPods and foobar2000 1.4 or later. It’s a good match for big lossless libraries: it converts as it sends, and leaves your originals alone."
      ],
      features: [
        "Sync, send and remove tracks from inside foobar2000",
        "Converts during transfer",
        "Smart playlists",
        "Reads and repairs the iPod database"
      ],
      devices: ["ipod-3g", "ipod-4g", "ipod-photo", "ipod-video", "ipod-classic", "ipod-mini", "ipod-nano-1g", "ipod-nano-2g", "ipod-nano-3g", "ipod-nano-4g", "ipod-nano-5g"],
      partial: [],
      requires: "foobar2000 1.4 or later on Windows",
      install: [
        "Install foobar2000, then add the foo_dop component from its Components page.",
        "Connect the iPod and open Library › iPod.",
        "Set conversion options, then send or sync."
      ],
      links: [
        { label: "Component", url: "https://www.foobar2000.org/components/view/foo_dop", icon: "download" },
        { label: "Wiki", url: "https://wiki.yuo.be/dop:start", icon: "docs" },
        { label: "Source", url: "https://github.com/reupen/ipod_manager", icon: "source" }
      ]
    },

    {
      id: "copytrans-manager",
      name: "CopyTrans Manager",
      maker: "CopyTrans",
      platforms: ["Windows"],
      price: "Free",
      status: "stable",
      version: null,
      updated: null,
      github: null,
      stars: null,
      license: "Proprietary",
      blurb: "A lightweight Windows app for dragging music onto an iPod and editing playlists, without opening iTunes.",
      more: [
        "It doesn’t need iTunes running, but it does need Apple’s device drivers, which an iTunes install leaves behind."
      ],
      features: [
        "Drag and drop music and playlists",
        "Edit tags and artwork on the iPod",
        "Runs without iTunes open"
      ],
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      devicesNote: "Supports classic iPods and nanos. Check CopyTrans’s list for your model.",
      requires: "Apple device drivers (installed with iTunes)",
      install: [
        "Install iTunes once for its drivers, or confirm they’re present.",
        "Install CopyTrans Manager and connect the iPod.",
        "Drag music in, then click Update."
      ],
      links: [
        { label: "Download", url: "https://www.copytrans.net/copytransmanager/", icon: "download" }
      ]
    },

    {
      id: "musicbee",
      name: "MusicBee",
      maker: "MusicBee",
      platforms: ["Windows"],
      price: "Free",
      status: "stable",
      version: null,
      updated: null,
      github: null,
      stars: null,
      license: "Freeware",
      blurb: "A full-featured Windows music manager that can sync playlists and your library to an iPod.",
      more: [
        "MusicBee is a strong pick if you already manage a big tagged library on Windows and want the iPod to follow it."
      ],
      features: [
        "Library, tagging and playlist management",
        "Device sync, including iPods",
        "Auto-tagging and artwork lookup"
      ],
      devices: [],
      partial: [],
      devicesNote: "Syncs older iPods. Check MusicBee’s forum for your exact model.",
      install: [
        "Install MusicBee and import your library.",
        "Connect the iPod and choose it under Devices.",
        "Pick what to sync."
      ],
      links: [
        { label: "Download", url: "https://getmusicbee.com/", icon: "download" }
      ]
    },

    {
      id: "rhythmbox",
      name: "Rhythmbox",
      maker: "GNOME",
      platforms: ["Linux"],
      price: "Free, open source",
      status: "stable",
      version: null,
      updated: null,
      github: null,
      stars: null,
      license: "GPL-2.0",
      blurb: "GNOME’s music player, which reads and writes the iPod database through libgpod. iPods appear in the sidebar as soon as you plug them in.",
      more: [
        "libgpod can’t sign the database on the nano 6th and 7th generation, so those models won’t sync. For everything older, it’s the simplest option on Linux."
      ],
      features: [
        "iPod shows up as a device in the sidebar",
        "Drag tracks and playlists across",
        "Comes with most GNOME desktops"
      ],
      devices: ["ipod-1g2g", "ipod-3g", "ipod-4g", "ipod-photo", "ipod-video", "ipod-classic", "ipod-mini", "ipod-nano-1g", "ipod-nano-2g", "ipod-nano-3g", "ipod-nano-4g", "ipod-nano-5g"],
      partial: [],
      install: [
        "Install Rhythmbox from your distribution, with its iPod plugin.",
        "Connect the iPod. It appears under Devices.",
        "Drag music onto it."
      ],
      links: [
        { label: "Project page", url: "https://gitlab.gnome.org/GNOME/rhythmbox", icon: "info" }
      ]
    },

    {
      id: "cratedigger",
      name: "CrateDigger",
      maker: "mrbarkan",
      platforms: ["macOS"],
      price: "Free, open source",
      status: "beta",
      version: "2.3.4",
      updated: null,
      github: "mrbarkan/cratedigger",
      stars: 3,
      license: "MIT",
      blurb: "A music-library workbench for the Mac, for people who keep their music as files. It rips, tags, converts and organizes, then sends the music to iPods running Rockbox or PodBox.",
      more: [
        "It looks like a hardware console, with an OLED display, VU meters and faders. Collections are saved as plain JSON crates, and new music lands in a Prep Crate for tagging before it joins the library.",
        "Each iPod gets a profile in Preferences \u203a Devices. A Rockbox iPod gets `cover.jpg` files with embedded art stripped. From 2.3.4 it recognizes PodBox iPods, shows their model and build, sends artist pictures, and cleans out the hidden `._` files macOS leaves behind, which PodBox would otherwise read as broken tracks."
      ],
      features: [
        "Per-device profiles for Rockbox and PodBox iPods",
        "Artist pictures for PodBox, without overwriting yours",
        "Removes macOS `._` files from the iPod",
        "Tag editing, artwork fixes and cover lookup",
        "Batch conversion with FFmpeg (beta)",
        "Splits vinyl side rips into tracks",
        "CD ripping, Subsonic and Navidrome streaming, Last.fm"
      ],
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      devicesNote: "Sends to iPods running Rockbox or PodBox, plus USB players and SD cards. It doesn\u2019t sync to Apple\u2019s firmware.",
      requires: "macOS 13 Ventura or later. The download is built for Apple Silicon.",
      install: [
        "Download the latest `.dmg` from the Releases page and drag CrateDigger to Applications.",
        "Optional: run `brew install yt-dlp` to play YouTube links as radio.",
        "Add your music folders, then set up your iPod in Preferences \u203a Devices.",
        "On a PodBox iPod, run Update Database and Update Art Cache after a transfer, as CrateDigger\u2019s summary reminds you."
      ],
      files: [
        { label: "macOS 13+, Apple Silicon", file: "CrateDigger .dmg" }
      ],
      links: [
        { label: "Download", url: "https://github.com/mrbarkan/cratedigger/releases/latest", icon: "download" },
        { label: "All releases and betas", url: "https://github.com/mrbarkan/cratedigger/releases", icon: "release" },
        { label: "Source", url: "https://github.com/mrbarkan/cratedigger", icon: "source" }
      ]
    }
  ],

  /*
   * HARDWARE MODS: parts you fit inside the iPod.
   *   kind      "Storage" | "Battery" | "Wireless" | "Port" | "Feel"
   *   skill     short text on how hard it is
   *   devices   iPods it fits
   *   firmware  notes on how the mod interacts with firmware
   */
  mods: [
    {
      id: "flash-storage",
      name: "Flash storage with iFlash",
      maker: "iFlash",
      kind: "Storage",
      skill: "No soldering",
      devices: ["ipod-video", "ipod-classic"],
      partial: ["ipod-4g", "ipod-photo"],
      blurb: "Swap the spinning hard drive for SD cards or an mSATA SSD. The iPod gets lighter, quieter, tougher and longer-lived, and there\u2019s room left for a bigger battery.",
      more: [
        "iFlash makes adapter boards that plug in where the hard drive was: Solo takes one SD card, Dual takes two, Quad takes four microSD cards, and SATA takes an mSATA SSD. The 4th gen and Photo need a separate converter.",
        "The Classic 6th gen (80 GB, 120 GB and the thick 160 GB) only sees 128 GB on Apple\u2019s firmware, whatever you fit. The Video and the Classic 7th gen (the late 2009 160 GB) have no such limit."
      ],
      firmware: [
        "Rockpod and SKVM PodBox detect flash storage and use a lighter sleep strategy for it.",
        "On Rockbox-family firmware, check Settings \u203a System \u203a Disk after the swap."
      ],
      links: [
        { label: "iFlash compatibility", url: "https://www.iflash.xyz/store/iflash-compatibility/", icon: "docs" },
        { label: "iFlash store", url: "https://www.iflash.xyz/", icon: "info" }
      ]
    },
    {
      id: "mini-compactflash",
      name: "CompactFlash for the iPod mini",
      maker: "Any CF card",
      kind: "Storage",
      skill: "No soldering",
      devices: ["ipod-mini"],
      partial: [],
      blurb: "The mini\u2019s tiny hard drive is a CompactFlash device, so a CF card, or a CF adapter holding an SD card, drops straight into its place.",
      more: [
        "It\u2019s the oldest iPod mod there is, and still one of the easiest. Restore the iPod after the swap so it formats the new card."
      ],
      firmware: [
        "Rockbox runs on both mini generations and works with flash cards."
      ],
      links: [
        { label: "iFixit: iPod mini", url: "https://www.ifixit.com/Device/iPod_Mini", icon: "docs" }
      ]
    },
    {
      id: "bigger-battery",
      name: "Bigger battery",
      maker: "Various",
      kind: "Battery",
      skill: "No soldering",
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      blurb: "Once the hard drive is gone there\u2019s room for a larger cell. The battery plugs in, so the hard part is opening the Classic\u2019s metal case without bending it.",
      more: [
        "Be wary of capacity claims. One mod seller measured cells sold as 3000 mAh at closer to 1950 mAh. Buy from a seller who states tested capacity, and check that the cell fits your back plate: thin and thick backs take different sizes."
      ],
      firmware: [
        "On Rockbox-family firmware, set the new capacity in Settings \u203a System \u203a Battery so the gauge and the time remaining read correctly."
      ],
      links: [
        { label: "iFixit: iPod Classic", url: "https://www.ifixit.com/Device/iPod_Classic", icon: "docs" }
      ]
    },
    {
      id: "bluetooth",
      name: "Internal Bluetooth",
      maker: "EOE Works, Boxy Pixel, Moonlit Market",
      kind: "Wireless",
      skill: "Kits with and without soldering",
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      blurb: "A small transmitter board inside the case sends the iPod\u2019s audio to wireless headphones and speakers.",
      more: [
        "EOE Works sells a solder-free Bluetooth 5.0 kit for the Video and Classic. Boxy Pixel\u2019s board pairs Bluetooth 5.0 with a USB-C charging port, and Moonlit Market\u2019s kit adds both while keeping the headphone jack and the 30-pin port.",
        "The iPod doesn\u2019t know the transmitter is there: it takes the analog audio, so pairing is done with a button on the board, not from a menu."
      ],
      firmware: [
        "Rockpod 5.5 includes fixes for Bluetooth transmitters and car head units."
      ],
      links: [
        { label: "EOE Works kit", url: "https://eoe.works/products/solder-less-internal-bluetooth-5-0-kit-for-apple-ipod-video-5th-5-5-classic-6th-7th", icon: "info" },
        { label: "Boxy Pixel board", url: "https://www.boxypixel.com/products/ipod-mkii-electronics-pcb", icon: "info" }
      ]
    },
    {
      id: "usb-c",
      name: "USB-C port",
      maker: "Boxy Pixel, Moonlit Market",
      kind: "Port",
      skill: "Soldering or case work on most kits",
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      blurb: "Adds a USB-C socket so the iPod charges from the same cable as everything else you own.",
      more: [
        "Check what the port does before you buy. Boxy Pixel\u2019s board is charge-only, so you still sync through the 30-pin port. Moonlit Market\u2019s kit keeps the 30-pin port and the headphone jack alongside USB-C.",
        "Space is tight. One builder found that a USB-C and Bluetooth board won\u2019t fit beside an iFlash SATA board without a custom case."
      ],
      firmware: [
        "A charge-only port changes nothing for firmware. Installing and updating still happen over the 30-pin port."
      ],
      links: [
        { label: "Boxy Pixel board", url: "https://www.boxypixel.com/products/ipod-mkii-electronics-pcb", icon: "info" }
      ]
    },
    {
      id: "haptic-click",
      name: "Haptic click",
      maker: "Various",
      kind: "Feel",
      skill: "Soldering",
      devices: ["ipod-video", "ipod-classic"],
      partial: [],
      blurb: "Replaces the little speaker that makes the click-wheel tick with a haptic motor, so you feel each click instead of hearing it.",
      more: [
        "It\u2019s sold in kits and in pre-modded iPods, often under the name Taptic mod. We haven\u2019t found independent testing of these kits, so treat sellers\u2019 claims with care."
      ],
      firmware: [],
      links: []
    }
  ],

  /* Projects that cannot be installed yet. Move one into `firmwares` when it ships. */
  watchlist: [
    {
      id: "helikon-os",
      name: "Helikon OS",
      maker: "deandromi",
      url: "https://github.com/deandromi/Helikon-OS",
      blurb: "A new bootloader and firmware for the iPod Classic 6G and 7G, written from scratch rather than forked from Rockbox.",
      more: "It aims for native HFS+ with no FAT step, better battery life and memory use than Rockbox on HFS+, Rockbox skin support, protection against file corruption, and a desktop companion for tagging, scrobbling and installs. An alpha with the bootloader and HFS+ support comes first. GPL-2.0, no release yet."
    },
    {
      id: "sprout-pi",
      kind: "mod",
      name: "Sprout Pi",
      maker: "Sprout Pi",
      url: "https://www.techspot.com/news/114210-new-mod-brings-apple-classic-ipods-2026-bluetooth.html",
      blurb: "An RP2350 board that adds Bluetooth, Wi-Fi, USB-C and Spotify to older iPods.",
      more: "Press coverage describes a reversible mod with no soldering. There is no release yet, only a sign-up for updates."
    }
  ]
};

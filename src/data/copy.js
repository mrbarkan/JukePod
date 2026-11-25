// ─────────────────────────────────────────────────────────────────────────
// THE SHOP'S WORDS
//
// David, this file is yours. Everything the shop "says" in its own voice
// lives here, so you can reword it without touching any layout code.
//
// How to edit:
//   1. Open this file on GitHub and press the pencil button (top right).
//   2. Change the text between the quotes. Keep the quotes and the commas.
//   3. Press "Commit changes". The site rebuilds itself in a few minutes.
//
// Text between backticks (`like this`) can run over several lines.
// To leave something out, make it an empty string: ""
// Listings (firmware, apps, mods) are not here. They live in catalog.js.
// ─────────────────────────────────────────────────────────────────────────

export const COPY = {
  // ---------- the home page ----------
  home: {
    // The small pixel line above the big headline.
    kicker: "A quitanda is a corner fruit shop. This one is for iPods.",
    headline: "Pick your flavor.",

    // The handwritten note pinned next to the headline. One paragraph per line.
    note: {
      hello: "Oi!",
      lines: [
        "Your iPod doesn't have to run what it shipped with. Pick yours below and the whole shop rearranges around it.",
        "I'm David, I keep this little shop from Brazil. It's still in beta and built with a lot of AI help, so if something looks off, let me know =)",
      ],
      signoff: "Cheers!",
      signature: "David",
    },

    // The scribble that points at the iPod picker.
    pickerHint: "start here",
    pickerTitle: "Which iPod is yours?",
    pickerHelp: "Not sure? Check the number on the back",
    pickerAll: "Show every iPod",

    // The chalkboard.
    boardTitle: "Chegou!",
    boardSubtitle: "Fresh in",
    boardThemes: "The themes shelf is open",

    apps: { title: "Library apps", text: "Put music on it without iTunes. Recently updated:" },
    themes: { title: "Themes", text: "Looks people made, with screenshots.", firstTitle: "Share the first one", firstText: "For Rockbox, its forks or CrateDigger." },
    mods: { title: "Hardware mods", text: "Parts that keep it going." },

    watchTitle: "Still on the tree",
    watchText: "Projects that can't be installed yet. Each one moves onto the shelves once it ships.",

    guidesTitle: "New here? Start with a guide.",

    newsletterTitle: "Fresh arrivals, by email.",
    newsletterText: "Occasional news about new firmware, themes and guides. Your name and email address are used for this and nothing else, and you can unsubscribe at any time.",
    newsletterButton: "Subscribe by email",
  },

  // ---------- top of every page ----------
  header: {
    search: "Search the shop",
    signIn: "Sign in",
  },

  // ---------- the sign-in box ----------
  signIn: {
    title: "Sign in to Quitanda",
    text: "Signing in lets you share themes and tell others what works on your iPod. Browsing and downloading never need an account.",
  },

  // ---------- bottom of every page ----------
  footer: {
    // The handwritten line next to the click wheel.
    madeBy: "Made in Brazil by David, with a lot of AI help and a drawer full of iPods.",
    thanks: "Obrigado for stopping by!",
    backToTop: "Menu",
    warning: "Back up your music before you install anything or open your iPod. Everything listed here is made by independent developers and makers, and used at your own risk.",
    legal: "Not affiliated with Apple Inc. iPod is a trademark of Apple Inc.",
  },

  // ---------- the "page not found" page ----------
  notFound: {
    title: "That shelf is empty.",
    text: "The page you asked for isn't here. It may have moved when a listing was renamed.",
    button: "Back to the shop",
    screen: ["No page here", "Check the address", "or head back"],
  },
};

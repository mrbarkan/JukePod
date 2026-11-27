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
    // The headline is two parts: plain chunky letters, then one word in script.
    headline: "Pick your",
    headlineScript: "flavor.",
    // One or two short sentences beside the headline.
    intro: "A quitanda is a corner fruit shop. This one is for iPods: tap yours to see what runs on it.",
    // An optional small line above the headline. Empty means it isn't shown.
    kicker: "",

    // The little tag that points at the iPod picker.
    pickerHint: "Start here",
    pickerTitle: "Which iPod is yours?",
    pickerHelp: "Not sure? Check the number on the back",
    pickerAll: "Show every iPod",

    // The little screen that lists what came in lately.
    freshTitle: "Fresh in",
    freshThemes: "The themes shelf is open",
    freshAll: "All releases →",

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
    // The line next to the click wheel. "thanks" is set in script.
    madeBy: "Kept by David in Brazil, with a lot of AI help and a drawer full of iPods.",
    thanks: "Obrigado!",
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

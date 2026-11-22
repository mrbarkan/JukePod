// Local testing switch. With PUBLIC_EMULATORS=1 the site talks to the
// Firebase emulators on this machine instead of the real project, so the
// rules and the upload flow can be tested without touching live data.
// (Start them with `npm run emulators`.)
export const EMULATORS = import.meta.env.PUBLIC_EMULATORS === "1";

const LIVE_FILES = "https://firebasestorage.googleapis.com";
const LOCAL_FILES = "http://127.0.0.1:9199";

/** Download links are always stored in their live form, which the rules check. */
export const storedUrl = (url) => (EMULATORS ? url.replace(LOCAL_FILES, LIVE_FILES) : url);
/** Where to actually fetch a stored link from. */
export const fetchUrl = (url) => (EMULATORS && typeof url === "string" ? url.replace(LIVE_FILES, LOCAL_FILES) : url);
export const DOCS_ORIGIN = EMULATORS ? "http://127.0.0.1:8080" : "https://firestore.googleapis.com";

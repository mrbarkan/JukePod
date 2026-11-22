// Header sign-in. Firebase is loaded only when someone opens the sign-in
// dialog, or when this browser remembers a signed-in visitor.
const HINT = "quitanda-user";
const root = document.getElementById("account");

const readHint = () => {
  try {
    return JSON.parse(localStorage.getItem(HINT));
  } catch {
    return null;
  }
};
const writeHint = (user) => {
  try {
    if (user) localStorage.setItem(HINT, JSON.stringify({ name: user.displayName || "Account", photo: user.photoURL || "" }));
    else localStorage.removeItem(HINT);
  } catch {
    /* private window: the header simply shows Sign in until Firebase answers */
  }
};

let authModule;
let ready = null; // the loaded module, once it has arrived
export const loadAuth = () => (authModule ??= import("../lib/auth.js").then((m) => (ready = m)));

function show(person) {
  if (!root) return;
  const signedOut = root.querySelector("[data-signed-out]");
  const signedIn = root.querySelector("[data-signed-in]");
  signedOut.hidden = !!person;
  signedIn.hidden = !person;
  if (!person) return;
  signedIn.querySelector("[data-name]").textContent = (person.name || "Account").split(" ")[0];
  const img = signedIn.querySelector("img");
  img.hidden = !person.photo;
  if (person.photo) img.src = person.photo;
}

const listeners = new Set();
let current; // undefined until Firebase has answered
/**
 * Runs the callback with the signed-in user (or null) now and on changes.
 * With { lazy: true } Firebase is only loaded if this browser remembers a
 * signed-in visitor, so public pages stay light; the callback still runs if
 * the visitor signs in later.
 */
export function onUser(callback, { lazy = false } = {}) {
  listeners.add(callback);
  if (current !== undefined) callback(current);
  if (!lazy || readHint()) start();
}

let started = false;
async function start() {
  if (started) return;
  started = true;
  const { watch } = await loadAuth();
  watch((user) => {
    current = user;
    writeHint(user);
    show(user ? { name: user.displayName, photo: user.photoURL } : null);
    listeners.forEach((fn) => fn(user));
  });
}

const MESSAGES = {
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
  "auth/unauthorized-domain": "Sign-in isn't set up for this address yet.",
  "auth/account-exists-with-different-credential": "You've signed in here before with a different method. Use that one.",
  "auth/network-request-failed": "Couldn't reach the sign-in service. Check your connection and try again.",
};

if (root) {
  const hint = readHint();
  if (hint) {
    show(hint);
    start();
  }

  const dialog = document.getElementById("signin-dialog");
  const error = dialog.querySelector("[data-error]");
  root.querySelector("[data-open]").addEventListener("click", () => {
    error.hidden = true;
    dialog.showModal();
    loadAuth(); // warm up while the visitor chooses
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelectorAll("[data-provider]").forEach((button) =>
    button.addEventListener("click", async () => {
      error.hidden = true;
      button.disabled = true;
      try {
        // Call straight from the click when the module is already here, so
        // browsers don't treat the sign-in window as an unrequested pop-up.
        const name = button.dataset.provider;
        const user = await (ready ? ready.signIn(name) : loadAuth().then((m) => m.signIn(name)));
        start();
        dialog.close();
        // First time here: go to the welcome page to finish setting up.
        const welcome = import.meta.env.BASE_URL.replace(/\/$/, "") + "/welcome/";
        if (!location.pathname.endsWith("/welcome/") && (await ready.needsWelcome(user.uid))) location.href = welcome;
      } catch (err) {
        const text = MESSAGES[err.code] ?? "Sign-in didn't work. Try again in a moment.";
        error.textContent = text;
        error.hidden = !text;
      } finally {
        button.disabled = false;
      }
    })
  );
}

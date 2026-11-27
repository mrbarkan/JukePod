// Release alerts by email: "tell me when something for my iPod updates".
//
// While `ALERTS_ON` is false the site offers no email sign-up anywhere, and
// the privacy pages don't mention an email service. Turn it on only once the
// nightly job can really send (see "Release alerts by email" in
// docs/DEVELOPING.md): a Brevo API key and a read-only Firebase key saved as
// repository secrets, and the sending domain authenticated in Brevo.
export const ALERTS_ON = false || import.meta.env?.PUBLIC_ALERTS === "1";

/** Names the wording a person agreed to. Change it when the wording changes. */
export const ALERTS_CONSENT = "alerts-v1";

/** Stands for "every iPod" in a person's list. */
export const EVERY_IPOD = "all";

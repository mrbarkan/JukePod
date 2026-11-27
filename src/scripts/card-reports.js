// What owners report, shown on each listing's card. With an iPod chosen the
// line is about that model; otherwise it totals every model.
import { loadAllReports } from "../lib/reports.js";

let counts = null;
const ready = loadAllReports().then((c) => (counts = c)).catch(() => null);

const sum = (byDevice) => Object.values(byDevice || {}).reduce((a, b) => ({ works: a.works + b.works, total: a.total + b.total }), { works: 0, total: 0 });

/**
 * Fills the report line on every card. `device` is the chosen iPod's id (or
 * null), `short` its short name, `fitOf(card)` says whether a card fits it.
 * Returns { shown, silent }: fitting cards on show, and how many have no
 * reports for that iPod yet. Resolves to null if reports couldn't be loaded.
 */
export async function showCardReports({ device = null, short = "", fitOf = () => true } = {}) {
  if (!(await ready) && !counts) return null;
  let shown = 0;
  let silent = 0;
  document.querySelectorAll("[data-reports]").forEach((line) => {
    const card = line.closest("[data-card]");
    const link = line.querySelector("a");
    const mine = counts[line.dataset.reports];
    const visible = !card.hidden && !card.parentElement.hidden;
    if (device && fitOf(card)) {
      const c = mine?.[device];
      if (visible) { shown++; if (!c?.total) silent++; }
      link.textContent = c?.total
        ? `${c.works} of ${c.total} ${c.total === 1 ? "owner says" : "owners say"} it works on the ${short}`
        : `No reports for the ${short} yet. Tried it? Be the first`;
      line.classList.toggle("has-reports", !!c?.total);
      line.hidden = false;
    } else {
      const c = sum(mine);
      link.textContent = c.total ? `${c.works} of ${c.total} ${c.total === 1 ? "owner says" : "owners say"} it works` : "";
      line.classList.toggle("has-reports", c.total > 0);
      line.hidden = !c.total || !!device;
    }
  });
  return { shown, silent };
}

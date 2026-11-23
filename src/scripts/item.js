// A listing page, adjusted to the iPod the visitor picked on the home page:
// the right file, a plain "runs on yours" line, a checklist that remembers
// its ticks, and the "does it work on yours?" reports.
import { loadReports, sendReport } from "../lib/reports.js";
import { onUser } from "./account.js";

const page = document.getElementById("item");
const $ = (id) => document.getElementById(id);
const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private window */ } };

const names = JSON.parse(page.dataset.deviceNames);
const full = page.dataset.devices.split(" ").filter(Boolean);
const part = page.dataset.partial.split(" ").filter(Boolean);
const mine = names[read("cwf-device")] ? read("cwf-device") : null;
const [short, long] = mine ? names[mine] : [];

/* ---------- does it run on yours? ---------- */
if ($("fit") && mine) {
  const fit = full.includes(mine) ? "full" : part.includes(mine) ? "partial" : "none";
  $("fit-text").textContent =
    fit === "full" ? `Runs on your ${long}.` : fit === "partial" ? `Partly works on your ${long}, with known gaps.` : `Doesn’t run on your ${long}.`;
  $("fit").classList.toggle("is-no", fit === "none");
  $("fit").hidden = false;
}

/* ---------- the right file for your iPod ---------- */
const picker = $("model-switch");
if (picker) {
  const buttons = [...picker.querySelectorAll("button")];
  const choose = (button) => {
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    $("file-name").textContent = button.dataset.file;
    $("get-label").textContent = `${$("get-label").dataset.plain} for ${button.dataset.short}`;
  };
  buttons.forEach((b) => b.addEventListener("click", () => choose(b)));
  const match = buttons.find((b) => b.dataset.device === mine);
  if (match) choose(match);
}

/* ---------- install checklist ---------- */
const boxes = [...document.querySelectorAll("#steps input")];
if (boxes.length) {
  const key = `q-steps-${page.dataset.item}`;
  const saved = (read(key) || "").split("");
  const show = () => {
    const done = boxes.filter((b) => b.checked).length;
    $("steps-bar").style.width = `${(done / boxes.length) * 100}%`;
    $("steps-count").hidden = done === 0;
    $("steps-count").textContent = `${done} of ${boxes.length} done`;
    write(key, boxes.map((b) => (b.checked ? "1" : "0")).join(""));
  };
  boxes.forEach((b, i) => {
    b.checked = saved[i] === "1";
    b.addEventListener("change", show);
  });
  show();
}

/* ---------- does it work on yours? ---------- */
if ($("reports")) {
  const line = $("report-line");
  const status = $("report-status");
  const buttons = [...document.querySelectorAll("#report-buttons button")];
  let counts = {};
  let user = null;
  let wanted = null; // a report waiting for sign-in

  const say = (text) => {
    status.textContent = text;
    status.hidden = !text;
  };
  const draw = () => {
    const c = mine ? counts[mine] : Object.values(counts).reduce((a, b) => ({ works: a.works + b.works, total: a.total + b.total }), { works: 0, total: 0 });
    const where = mine ? `on the ${long}` : "on their iPod";
    line.textContent = !c || !c.total
      ? mine ? `No reports yet for the ${long}. Installed it? Tell the next person how it went.` : "No reports yet. Installed it? Tell the next person how it went."
      : `${c.works} of ${c.total} ${c.total === 1 ? "person says" : "people say"} it works ${where}.`;
  };

  async function send(works) {
    if (!mine) return say("Pick your iPod on the home page first, so the report counts for the right model.");
    if (!user) {
      wanted = works;
      say("Sign in to send your report.");
      document.querySelector("#account [data-open]")?.click();
      return;
    }
    say("Sending…");
    try {
      await sendReport({ itemId: page.dataset.item, deviceId: mine, works, version: page.dataset.version });
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.works === String(works))));
      say(works ? `Thanks. You said it works on your ${short}.` : `Thanks. You said it has problems on your ${short}.`);
      counts = await loadReports(page.dataset.item).catch(() => counts);
      draw();
    } catch {
      say("That didn’t go through. Try again in a moment.");
    }
  }

  buttons.forEach((b) => b.addEventListener("click", () => send(b.dataset.works === "true")));
  onUser((u) => {
    user = u;
    if (u && wanted !== null) {
      const w = wanted;
      wanted = null;
      send(w);
    }
  }, { lazy: true });

  loadReports(page.dataset.item)
    .then((c) => { counts = c; draw(); })
    .catch(() => { line.textContent = "Installed it? Tell the next person how it went."; });
}

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
const [, long] = mine ? names[mine] : [];

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
// Reports are tagged with one of the iPods in the person's profile, so
// someone with a Classic and a nano reports on each separately.
if ($("reports")) {
  const line = $("report-line");
  const status = $("report-status");
  const buttons = [...document.querySelectorAll("#report-buttons button")];
  const choices = $("report-ipods");
  const addForm = $("report-add");
  let counts = {};
  let user = null;
  let ipods = null; // the person's iPods, once loaded
  let chosen = null; // the iPod a report is for
  let myReports = {}; // the person's reports here, by iPod ID (or model, for older ones)
  let wanted = null; // a report waiting for sign-in, or for an iPod to be picked or added

  const say = (text) => {
    status.textContent = text;
    status.hidden = !text;
  };
  const nameOf = (p) => p.label || names[p.model]?.[1] || p.model;
  const draw = () => {
    const model = chosen?.model || mine;
    const c = model ? counts[model] : Object.values(counts).reduce((a, b) => ({ works: a.works + b.works, total: a.total + b.total }), { works: 0, total: 0 });
    const long = names[model]?.[1];
    const where = model ? `on the ${long}` : "on their iPod";
    line.textContent = !c || !c.total
      ? model ? `No reports yet for the ${long}. Installed it? Tell the next person how it went.` : "No reports yet. Installed it? Tell the next person how it went."
      : `${c.works} of ${c.total} ${c.total === 1 ? "person says" : "people say"} it works ${where}.`;
    const said = chosen ? (myReports[chosen.id] ?? myReports[chosen.model]) : undefined;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(said !== undefined && b.dataset.works === String(said))));
  };

  function choose(ipod) {
    chosen = ipod;
    choices.querySelectorAll("input").forEach((r) => (r.checked = r.value === ipod?.id));
    draw();
  }

  function drawChoices() {
    $("report-for").hidden = !ipods?.length;
    addForm.hidden = true;
    choices.replaceChildren(
      ...(ipods || []).map((p) => {
        const label = document.createElement("label");
        label.className = "report-ipod";
        const radio = Object.assign(document.createElement("input"), { type: "radio", name: "report-ipod", value: p.id });
        radio.addEventListener("change", () => {
          choose(p);
          if (wanted !== null) send(wanted);
        });
        const name = Object.assign(document.createElement("strong"), { textContent: nameOf(p) });
        label.append(radio, name);
        if (p.label) label.append(Object.assign(document.createElement("span"), { textContent: names[p.model]?.[0] || p.model }));
        return label;
      })
    );
    // Pick for them only when there's no doubt: one iPod, or the one that
    // matches the model chosen on the home page.
    const same = (ipods || []).filter((p) => p.model === mine);
    const sure = ipods?.length === 1 ? ipods[0] : same.length === 1 ? same[0] : null;
    choose(ipods?.find((p) => p.id === chosen?.id) || sure);
  }

  async function loadMine() {
    const [{ loadMyIpods }, { loadMyReports }] = await Promise.all([import("../lib/my-ipods.js"), import("../lib/reports.js")]);
    [ipods, myReports] = await Promise.all([loadMyIpods(), loadMyReports(page.dataset.item).catch(() => ({}))]);
    drawChoices();
  }

  async function send(works) {
    if (!user) {
      wanted = works;
      say("Sign in to send your report.");
      document.querySelector("#account [data-open]")?.click();
      return;
    }
    if (!ipods) {
      wanted = works;
      say("Loading your iPods…");
      return loadMine().then(() => send(works), () => say("Your iPods couldn’t be loaded. Try again in a moment."));
    }
    if (!ipods.length) {
      wanted = works;
      say("");
      if (mine) $("report-add-model").value = mine;
      addForm.hidden = false;
      $("report-add-model").focus();
      return;
    }
    if (!chosen) {
      wanted = works;
      return say("Which of your iPods did you try it on? Pick one above.");
    }
    wanted = null;
    say("Sending…");
    try {
      await sendReport({ itemId: page.dataset.item, ipod: chosen, works, version: page.dataset.version, replacesOld: chosen.model in myReports });
      myReports[chosen.id] = works;
      delete myReports[chosen.model];
      const short = chosen.label || names[chosen.model]?.[0] || "iPod";
      say(works ? `Thanks. You said it works on your ${short}.` : `Thanks. You said it has problems on your ${short}.`);
      counts = await loadReports(page.dataset.item).catch(() => counts);
      draw();
    } catch {
      say("That didn’t go through. Try again in a moment.");
    }
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    say("Adding…");
    try {
      const { addIpod } = await import("../lib/my-ipods.js");
      const ipod = await addIpod($("report-add-model").value, $("report-add-label").value);
      ipods = [...ipods, ipod];
      drawChoices();
      choose(ipod);
      if (wanted !== null) send(wanted);
      else say(`Added your ${nameOf(ipod)}.`);
    } catch {
      say("Couldn’t add it. Try again in a moment.");
    }
  });

  buttons.forEach((b) => b.addEventListener("click", () => send(b.dataset.works === "true")));
  onUser((u) => {
    user = u;
    ipods = null;
    chosen = null;
    myReports = {};
    if (!u) {
      drawChoices();
      draw();
      return;
    }
    const w = wanted;
    wanted = null;
    loadMine().then(() => (w !== null ? send(w) : null), () => {});
  }, { lazy: true });

  loadReports(page.dataset.item)
    .then((c) => { counts = c; draw(); })
    .catch(() => { line.textContent = "Installed it? Tell the next person how it went."; });
}

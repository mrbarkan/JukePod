// The shop floor: pick an iPod and everything rearranges around it. Cards
// are already on the page; this only shows, hides, sorts and relabels them.
const KEY = "cwf-device";
const $ = (id) => document.getElementById(id);
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* private window */ } },
};

const tiles = [...document.querySelectorAll("[data-device]")];
const slots = [...document.querySelectorAll("#grid [data-slot]")];
const cards = slots.map((slot) => slot.querySelector("[data-card]"));
const known = new Set(tiles.map((t) => t.dataset.device));

const params = new URLSearchParams(location.search);
const asked = params.get("ipod");
const state = {
  device: asked && known.has(asked) ? asked : known.has(store.get()) ? store.get() : "all",
  kind: "all",
  order: "shelf",
};
if (asked && known.has(asked)) store.set(asked);

const has = (card, attr, value) => (card.dataset[attr] || "").split(" ").includes(value);
const fitOf = (card, device) =>
  device === "all" ? "any" : has(card, "devices", device) ? "full" : has(card, "partial", device) ? "partial" : "none";

function apply() {
  const tile = tiles.find((t) => t.dataset.device === state.device && t.classList.contains("ipod-tile"));
  tiles.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.device === state.device)));

  let shown = 0;
  const perKind = {};
  cards.forEach((card, i) => {
    const fit = fitOf(card, state.device);
    const fitsDevice = fit !== "none";
    if (fitsDevice) (card.dataset.kinds || "").split(" ").forEach((k) => (perKind[k] = (perKind[k] || 0) + 1));
    const visible = fitsDevice && (state.kind === "all" || has(card, "kinds", state.kind));
    slots[i].hidden = !visible;
    if (visible) shown++;
    const line = card.querySelector("[data-fit]");
    line.textContent =
      fit === "full" ? `Runs on your ${tile.dataset.short}` : fit === "partial" ? `Partly works on your ${tile.dataset.short}` : line.dataset.default;
  });

  const onDevice = cards.filter((c) => fitOf(c, state.device) !== "none").length;
  document.querySelectorAll("#kinds [data-kind]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.kind === state.kind));
    const n = b.dataset.kind === "all" ? onDevice : perKind[b.dataset.kind] || 0;
    b.hidden = b.dataset.kind !== "all" && n === 0 && b.dataset.kind !== state.kind;
  });

  const flavors = (n) => `${n} ${n === 1 ? "flavor" : "flavors"}`;
  $("result-title").textContent = !tile
    ? `${flavors(shown)} on the shelves`
    : shown ? `${flavors(shown)} for your ${tile.dataset.name}` : `No flavors yet for your ${tile.dataset.name}`;
  $("result-note").textContent = !tile
    ? "Every firmware in the shop. Pick your iPod above to see only what runs on it."
    : tile.hasAttribute("data-tools") && shown
      ? "These are developer tools, not players. No player firmware runs on this model yet."
      : "Everything on this page now shows what fits. Your choice is remembered next time.";
  $("empty").hidden = shown > 0;
  // The empty shelf's "Suggest it" link opens the form with this iPod ticked.
  const suggest = $("empty-suggest");
  if (suggest) {
    const url = new URL(suggest.href);
    if (tile) url.searchParams.set("ipod", state.device);
    else url.searchParams.delete("ipod");
    suggest.href = url.toString();
  }
}

function sort() {
  const by = {
    shelf: (a, b) => a.dataset.shelf - b.dataset.shelf,
    name: (a, b) => a.firstElementChild.dataset.name.localeCompare(b.firstElementChild.dataset.name),
    stars: (a, b) => b.firstElementChild.dataset.stars - a.firstElementChild.dataset.stars,
    updated: (a, b) => (b.firstElementChild.dataset.updated || "").localeCompare(a.firstElementChild.dataset.updated || ""),
  }[state.order];
  [...slots].sort((a, b) => by(a, b) || a.dataset.shelf - b.dataset.shelf).forEach((slot) => $("grid").append(slot));
}

tiles.forEach((t) =>
  t.addEventListener("click", () => {
    state.device = t.dataset.device;
    state.kind = "all";
    store.set(state.device === "all" ? null : state.device);
    apply();
  })
);
$("kinds").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  state.kind = b.dataset.kind;
  apply();
});
$("order").addEventListener("change", (e) => {
  state.order = e.target.value;
  sort();
});

/* ---------- search: the header box filters everything the shop has ---------- */
const box = $("site-q");
const results = [...document.querySelectorAll("[data-result]")];
function search(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const on = words.length > 0;
  $("search").hidden = !on;
  $("shop-all").hidden = on;
  if (!on) return;
  let n = 0;
  results.forEach((li) => {
    const match = words.every((w) => li.dataset.search.includes(w));
    li.hidden = !match;
    if (match) n++;
  });
  $("search-title").textContent = `${n} ${n === 1 ? "result" : "results"} for “${text.trim()}”`;
  $("search-list").hidden = n === 0;
  $("search-empty").hidden = n > 0;
}
box.addEventListener("input", () => search(box.value));
box.form.addEventListener("submit", (e) => {
  e.preventDefault();
  search(box.value);
});
$("search-clear").addEventListener("click", () => {
  box.value = "";
  search("");
  history.replaceState(null, "", location.pathname);
});

apply();
// On a phone the picker scrolls sideways: bring the chosen iPod into view.
const chosen = document.querySelector('.ipod-tile[aria-pressed="true"]');
if (chosen) chosen.parentElement.scrollLeft = chosen.offsetLeft - chosen.parentElement.offsetLeft - 12;
if (params.get("q")) {
  box.value = params.get("q");
  search(box.value);
}

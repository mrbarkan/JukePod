(function () {
  "use strict";

  var DATA = window.QUITANDA_DATA;
  var BASE = DATA.base || "";
  function pageUrl(item) { return BASE + item.path; }
  var devices = DATA.devices;
  var notDraft = function (x) { return !x.draft; };
  var firmwares = DATA.firmwares.filter(notDraft);
  var apps = (DATA.apps || []).filter(notDraft);
  firmwares.forEach(function (x) { x.type = "firmware"; });
  apps.forEach(function (x) { x.type = "app"; });
  var watchlist = DATA.watchlist || [];
  var deviceById = indexBy(devices);
  var catById = indexBy(DATA.categories);
  var fwById = indexBy(firmwares);
  var appById = indexBy(apps);
  var itemById = indexBy(firmwares.concat(apps));
  var watchById = indexBy(watchlist);

  var state = {
    kind: "all",
    device: store("cwf-device") || "all",
    order: "name",
    platform: "all",
    q: "",
    open: new Set()
  };
  // Guides link here as /?ipod=ipod-classic to open the shop already filtered.
  var asked = new URLSearchParams(location.search).get("ipod");
  if (asked && deviceById[asked]) { state.device = asked; store("cwf-device", asked); }
  if (state.device !== "all" && !deviceById[state.device]) state.device = "all";

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- helpers ---------- */
  function indexBy(list) { var o = {}; list.forEach(function (x) { o[x.id] = x; }); return o; }
  function store(key, value) {
    try {
      if (arguments.length === 1) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>"); }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function fmtDate(iso, long) {
    if (!iso) return "";
    var p = iso.split("-").map(Number);
    var m = (long ? MONTHS_LONG : MONTHS)[p[1] - 1];
    return p[2] ? p[2] + " " + m + " " + p[0] : m + " " + p[0];
  }
  function listJoin(parts) {
    if (parts.length < 2) return parts.join("");
    if (parts.length === 2) return parts[0] + " and " + parts[1];
    return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
  }
  function isNumbered(v) { return !!v && /^v?\d/i.test(v); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  var ICON = {
    download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    install: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="14" r="3.5"/><path d="M8 7h8"/>',
    source: '<path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/>',
    docs: '<path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z"/><path d="M9 9h5M9 13h5"/>',
    release: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    ext: '<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICON[name] || ICON.info) + "</svg>"; }
  var CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg>';
  // Ripeness is the shop's word for status; the plain word always sits beside it.
  var STATUS_WORDS = DATA.status || {};
  function statusLabel(key) {
    var w = STATUS_WORDS[key];
    return w ? w.ripeness + " \u00b7 " + w.plain : key;
  }

  /* ---------- filtering ---------- */
  function fitOf(fw, deviceId) {
    if (deviceId === "all") return null;
    if (!fw.devices.length && !(fw.partial || []).length) return "unknown";
    if (fw.devices.indexOf(deviceId) > -1) return "full";
    if ((fw.partial || []).indexOf(deviceId) > -1) return "partial";
    return "none";
  }
  function haystack(fw) {
    return [fw.name, fw.maker, fw.blurb, (fw.more || []).join(" "), (fw.features || []).join(" "),
      fw.devices.concat(fw.partial || []).map(function (d) { return deviceById[d] ? deviceById[d].name : d; }).join(" "),
      (fw.categories || []).map(function (c) { return catById[c] ? catById[c].name : c; }).join(" "),
      (fw.platforms || []).join(" "), fw.price || "", fw.devicesNote || "",
      statusLabel(fw.status)].join(" ").toLowerCase();
  }
  function matches(fw, opts) {
    opts = opts || state;
    if (fw.type === "firmware" && opts.kind !== "all" && (fw.categories || []).indexOf(opts.kind) < 0) return false;
    if (fw.type === "app" && opts.platform && opts.platform !== "all" && (fw.platforms || []).indexOf(opts.platform) < 0) return false;
    if (fitOf(fw, opts.device) === "none") return false;
    if (opts.q) {
      var h = haystack(fw);
      return opts.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return h.indexOf(w) > -1; });
    }
    return true;
  }
  function sorted(list) {
    var byName = function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); };
    return list.slice().sort(function (a, b) {
      if (state.order === "stars") return ((b.stars == null ? -1 : b.stars) - (a.stars == null ? -1 : a.stars)) || byName(a, b);
      if (state.order === "updated") {
        var A = a.updated || "", B = b.updated || "";
        if (A !== B) return A < B ? 1 : -1;
      }
      return byName(a, b);
    });
  }

  /* ---------- latest strip ---------- */
  function renderLatest() {
    var L = DATA.latest;
    if (!L) { $("latest-list").closest(".latest").hidden = true; return; }
    var shown = DATA.updatedOn && DATA.updatedOn > L.date ? DATA.updatedOn : L.date;
    $("latest-date").textContent = fmtDate(shown, true);
    $("latest-date").setAttribute("datetime", shown);
    var fresh = (DATA.recentChanges || []).map(function (c) {
      var it = itemById[c.id];
      return it ? '<a href="' + esc(pageUrl(it)) + '">' + esc(it.name) + " " + esc(c.version) + "</a>" : null;
    }).filter(Boolean);
    var freshLine = fresh.length ? '<li class="latest-item">New versions: ' + listJoin(fresh) + "</li>" : "";
    $("latest-list").innerHTML = freshLine + L.lines.map(function (line) {
      var links = line.ids.map(function (id) {
        var fw = itemById[id], w = watchById[id];
        if (fw) return '<a href="#' + esc(id) + '">' + esc(fw.name) + (isNumbered(fw.version) ? " " + esc(fw.version) : "") + "</a>";
        if (w) return '<a href="#watch-' + esc(id) + '">' + esc(w.name) + "</a>";
        return null; // drafts and removed entries are left out
      }).filter(Boolean);
      if (!links.length) return "";
      return '<li class="latest-item">' + esc(line.label) + " " + listJoin(links) + (line.suffix ? " " + esc(line.suffix) : "") + "</li>";
    }).join("");
    var collapsed = store("cwf-latest-hidden") === L.date;
    setLatestCollapsed(collapsed);
  }
  function setLatestCollapsed(c) {
    var box = $("latest-list").closest(".latest");
    box.classList.toggle("is-collapsed", c);
    $("latest-toggle").setAttribute("aria-expanded", String(!c));
    $("latest-toggle").textContent = c ? "Show" : "Hide";
  }

  /* ---------- controls ---------- */
  function renderShowMenu() {
    var base = { kind: "all", device: state.device, q: state.q };
    var opts = [{ id: "all", name: "All" }].concat(DATA.categories);
    $("show-options").innerHTML = opts.map(function (c) {
      var n = firmwares.filter(function (fw) { return matches(fw, Object.assign({}, base, { kind: c.id })); }).length;
      return '<button type="button" class="menu-option" data-kind="' + esc(c.id) + '" aria-pressed="' + (state.kind === c.id) + '">' +
        "<span>" + esc(c.name) + ' <span class="n">' + n + "</span></span></button>";
    }).join("");
    var cur = state.kind === "all" ? "All" : catById[state.kind].name;
    var curN = firmwares.filter(function (fw) { return matches(fw, Object.assign({}, base, { kind: state.kind })); }).length;
    $("show-current").innerHTML = esc(cur) + ' <span class="n">' + curN + "</span>";
  }
  function renderDeviceSelect() {
    $("filter-device").innerHTML = '<option value="all">Any iPod</option>' + devices.map(function (d) {
      return '<option value="' + esc(d.id) + '"' + (state.device === d.id ? " selected" : "") + ">" + esc(d.name) + "</option>";
    }).join("");
  }

  /* ---------- cards ---------- */
  function deviceChips(fw) {
    var chips = fw.devices.map(function (id) { return chip(id, false); })
      .concat((fw.partial || []).map(function (id) { return chip(id, true); }));
    if (!chips.length) return fw.devicesNote ? '<p class="devices-note">' + fmt(fw.devicesNote) + "</p>" : "";
    return '<div class="chips" aria-label="' + (fw.type === "app" ? "Syncs" : "Runs on") + '">' + chips.join("") + "</div>";
    function chip(id, partial) {
      var d = deviceById[id]; if (!d) return "";
      var cls = "chip" + (partial ? " partial" : "") + (state.device === id ? " match" : "");
      return '<span class="' + cls + '" title="' + esc(d.name) + (partial ? ", partial support" : "") + '">' + esc(d.short) + (partial ? "*" : "") + "</span>";
    }
  }
  function actions(fw, open) {
    var links = fw.links || [];
    var html = '<div class="card-actions">';
    if (links.length) {
      var main = links[0];
      html += '<div class="btn-group">' +
        '<a class="btn" href="' + esc(main.url) + '" target="_blank" rel="noopener">' + icon(main.icon) + esc(main.label) + icon("ext") + "</a>";
      if (links.length > 1) {
        html += '<details class="menu"><summary aria-label="More links for ' + esc(fw.name) + '">' + CHEV + '</summary><div class="menu-panel">' +
          links.slice(1).map(function (l) {
            return '<a class="menu-option" href="' + esc(l.url) + '" target="_blank" rel="noopener"><span>' + icon(l.icon) + esc(l.label) + "</span>↗</a>";
          }).join("") + "</div></details>";
      } else {
        html = html.replace('class="btn"', 'class="btn" style="border-radius:var(--r-ctl)"');
      }
      html += "</div>";
    }
    html += '<button type="button" class="more-btn" data-more="' + esc(fw.id) + '" aria-expanded="' + open + '" aria-controls="more-' + esc(fw.id) + '">' +
      (open ? "Less" : "More") + CHEV + "</button></div>";
    return html;
  }
  function moreSection(fw) {
    var left = (fw.more || []).map(function (p) { return "<p>" + fmt(p) + "</p>"; }).join("");
    if (fw.features && fw.features.length) {
      left += "<h3>" + (fw.type === "app" ? "What it does" : "What it adds") + "</h3><ul>" + fw.features.map(function (f) { return "<li>" + fmt(f) + "</li>"; }).join("") + "</ul>";
    }
    var runs = fw.devices.map(function (d) { return deviceById[d] ? deviceById[d].name : d; });
    var partial = (fw.partial || []).map(function (d) { return deviceById[d] ? deviceById[d].name : d; });
    var isApp = fw.type === "app";
    var facts = "<dl class=\"facts\">" +
      (isApp && fw.platforms && fw.platforms.length ? "<dt>Platforms</dt><dd>" + esc(fw.platforms.join(", ")) + "</dd>" : "") +
      (isApp && fw.price ? "<dt>Price</dt><dd>" + esc(fw.price) + "</dd>" : "") +
      "<dt>" + (isApp ? "Syncs" : "Runs on") + "</dt><dd>" + (runs.length ? esc(runs.join(", ")) : fmt(fw.devicesNote || "Not listed by the developer")) + "</dd>" +
      (runs.length && fw.devicesNote ? "<dt>Note</dt><dd>" + fmt(fw.devicesNote) + "</dd>" : "") +
      (partial.length ? "<dt>Partial</dt><dd>" + esc(partial.join(", ")) + "</dd>" : "") +
      (fw.requires ? "<dt>Needs</dt><dd>" + fmt(fw.requires) + "</dd>" : "") +
      (fw.basedOn ? "<dt>Based on</dt><dd>" + (fwById[fw.basedOn] ? '<a href="' + esc(pageUrl(fwById[fw.basedOn])) + '">' + esc(fwById[fw.basedOn].name) + "</a>" : esc(fw.basedOn)) + "</dd>" : "") +
      (fw.license ? "<dt>License</dt><dd>" + esc(fw.license) + "</dd>" : "") +
      "</dl>";
    var right = facts;
    if (fw.install && fw.install.length) {
      right += "<h3>" + (fw.type === "app" ? "Get started" : "Install") + "</h3><ol>" + fw.install.map(function (s) { return "<li>" + fmt(s) + "</li>"; }).join("") + "</ol>";
    }
    if (fw.files && fw.files.length) {
      right += "<h3>Files</h3><div class=\"files\">" + fw.files.map(function (f) {
        return "<div><span>" + esc(f.label) + "</span><code>" + esc(f.file) + "</code></div>";
      }).join("") + "</div>";
    }
    var shots = (fw.screenshots || []).length;
    left += '<p><a class="more-link" href="' + esc(pageUrl(fw)) + '">' + (shots ? "Full page with " + plural(shots, "screenshot", "screenshots") : "Full page and share link") + " " + icon("ext") + "</a></p>";
    return '<div class="more" id="more-' + esc(fw.id) + '"><div class="more-col">' + left + '</div><div class="more-col">' + right + "</div></div>";
  }
  function thumb(fw) {
    var shots = fw.screenshots || [];
    if (!shots.length) return "";
    var s = shots.filter(function (x) { return x.pixel; })[0] || shots[0];
    return '<a class="thumb' + (s.pixel ? " is-pixel" : "") + '" href="' + esc(pageUrl(fw)) + '" aria-label="' + esc(fw.name) + ' screenshots">' +
      '<img src="' + esc(BASE + "/" + s.src) + '" alt="" loading="lazy" width="' + s.w + '" height="' + s.h + '"></a>';
  }
  function card(fw) {
    var open = state.open.has(fw.id);
    var fit = fitOf(fw, state.device);
    var isApp = fw.type === "app";
    var kinds = isApp
      ? (fw.platforms || []).map(function (p) { return '<span class="kind platform">' + esc(p) + "</span>"; }).join("")
      : (fw.categories || []).map(function (c) { return catById[c] ? '<span class="kind">' + esc(catById[c].name) + "</span>" : ""; }).join("");
    var status = '<span class="pill pill-' + esc(fw.status) + '">' + esc(statusLabel(fw.status)) + "</span>";
    if (fit === "full") status += '<span class="fits">' + (isApp ? "Syncs your iPod" : "Runs on your iPod") + "</span>";
    if (fit === "partial") status += '<span class="fits partial">Partial on your iPod</span>';
    if (isApp && fw.price) status += '<span class="meta price">' + esc(fw.price) + "</span>";
    if (fw.version) status += '<span class="meta ver">' + (isNumbered(fw.version) ? "Latest " : "") + esc(fw.version) + "</span>";
    if (fw.updated) status += '<span class="meta">' + icon("clock") + 'Updated <time datetime="' + esc(fw.updated) + '">' + fmtDate(fw.updated) + "</time></span>";
    if (fw.stars != null) status += '<span class="meta" title="' + plural(fw.stars, "star", "stars") + ' on GitHub">' + icon("star") + '<span class="n">' + fw.stars + "</span></span>";
    else if (!fw.github && !isApp) status += '<span class="meta">Not on GitHub</span>';

    return '<article class="card' + (fw.pinned && !isApp ? " is-pinned" : "") + (open ? " is-open" : "") + '" id="' + esc(fw.id) + '" aria-labelledby="t-' + esc(fw.id) + '">' +
      '<div class="card-head"><div class="card-head-text">' +
        '<p class="kicker">' + esc(fw.maker) + (fw.pinned ? '<span class="start">' + (isApp ? "Built in" : "Start here") + "</span>" : "") + "</p>" +
        '<h3 class="card-title" id="t-' + esc(fw.id) + '"><a href="' + esc(pageUrl(fw)) + '">' + esc(fw.name) + "</a></h3>" +
        '<div class="kinds">' + kinds + "</div>" +
      "</div>" + thumb(fw) + "</div>" +
      '<p class="status-line">' + status + "</p>" +
      '<p class="blurb">' + fmt(fw.blurb) + "</p>" +
      deviceChips(fw) +
      (open ? moreSection(fw) : "") +
      actions(fw, open) +
      "</article>";
  }

  var visible = [];
  function renderCards() {
    var list = sorted(firmwares.filter(function (fw) { return matches(fw); }));
    var pinned = list.filter(function (f) { return f.pinned; });
    var rest = list.filter(function (f) { return !f.pinned; });
    $("pinned").innerHTML = pinned.map(card).join("");
    $("pinned").hidden = !pinned.length;
    $("grid").innerHTML = rest.map(card).join("");
    $("empty").hidden = list.length > 0;
    $("count").textContent = plural(list.length, "firmware", "firmwares");
    visible = pinned.concat(rest);
    renderShowMenu();
    renderScreen();
    renderApps();
  }

  /* ---------- library apps ---------- */
  function renderPlatforms() {
    var base = { device: state.device, q: state.q };
    var opts = ["all"].concat(DATA.platforms || []);
    $("app-platforms").innerHTML = opts.map(function (p) {
      var n = apps.filter(function (a) { return matches(a, Object.assign({}, base, { platform: p })); }).length;
      return '<button type="button" class="seg" data-platform="' + esc(p) + '" aria-pressed="' + (state.platform === p) + '">' +
        esc(p === "all" ? "All" : p) + ' <span class="n">' + n + "</span></button>";
    }).join("");
  }
  function renderApps() {
    var list = sorted(apps.filter(function (a) { return matches(a); }));
    var pinned = list.filter(function (a) { return a.pinned; });
    $("app-grid").innerHTML = list.filter(function (a) { return !a.pinned; }).concat(pinned).map(card).join("");
    $("app-empty").hidden = list.length > 0;
    $("app-count").textContent = plural(list.length, "app", "apps");
    renderPlatforms();
  }

  /* ---------- compatibility matrix ---------- */
  function renderMatrix() {
    var cols = firmwares.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.name.localeCompare(b.name); });
    var head = "<thead><tr><th scope=\"col\">iPod</th>" + cols.map(function (fw) {
      return '<th scope="col"><a href="' + esc(pageUrl(fw)) + '">' + esc(fw.name) + "</a></th>";
    }).join("") + "</tr></thead>";
    var body = "<tbody>" + devices.map(function (d) {
      return '<tr class="' + (state.device === d.id ? "is-mine" : "") + '"><th scope="row">' + esc(d.name) + "<small>" + esc(d.years) + "</small></th>" +
        cols.map(function (fw) {
          var f = fitOf(fw, d.id);
          var label = f === "full" ? "Supported" : f === "partial" ? "Partial" : "Not supported";
          return '<td><i class="dot dot-' + f + '" title="' + esc(fw.name + " on " + d.name + ": " + label) + '"></i><span hidden>' + label + "</span></td>";
        }).join("") + "</tr>";
    }).join("") + "</tbody>";
    $("matrix").innerHTML = head + body;
  }

  /* ---------- watch list ---------- */
  function renderWatch() {
    $("watch-count").textContent = watchlist.length;
    $("watch").innerHTML = watchlist.map(function (w) {
      return '<li class="watch-item" id="watch-' + esc(w.id) + '"><div class="watch-top">' +
        '<a href="' + esc(w.url) + '" target="_blank" rel="noopener">' + esc(w.name) + " ↗</a>" +
        '<span class="maker">' + esc(w.maker) + "</span></div>" +
        "<p>" + fmt(w.blurb) + (w.more ? " " + fmt(w.more) : "") + "</p></li>";
    }).join("");
    if (!watchlist.length) $("watch-list").hidden = true;
  }

  /* ---------- click-wheel iPod ---------- */
  var sel = 0, ROWS = 6;
  function renderScreen() {
    var ul = $("screen-list"); if (!ul) return;
    if (!visible.length) { ul.innerHTML = '<li><span>No matches</span></li>'; return; }
    sel = Math.max(0, Math.min(sel, visible.length - 1));
    var start = Math.max(0, Math.min(sel - (ROWS - 1), visible.length - ROWS));
    var rows = visible.slice(start, start + ROWS);
    ul.innerHTML = rows.map(function (fw, i) {
      var idx = start + i;
      return '<li data-idx="' + idx + '" class="' + (idx === sel ? "sel" : "") + '"' + (idx === sel ? ' aria-current="true"' : "") + "><span>" + esc(fw.name) + "</span><span>›</span></li>";
    }).join("");
  }
  function move(step) {
    if (!visible.length) return;
    sel = (sel + step + visible.length) % visible.length;
    renderScreen();
  }
  function openSelected() { if (visible[sel]) go(visible[sel].id); }
  function go(id) {
    if (location.hash === "#" + id) route(); else location.hash = id;
  }
  function setupWheel() {
    var wheel = $("wheel"); if (!wheel) return;
    var acc = 0, lastWheel = 0;
    wheel.addEventListener("wheel", function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - lastWheel < 70) return;
      lastWheel = now;
      move(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1);
    }, { passive: false });
    // Circular drag, like the real thing: every 30 degrees moves one row.
    var lastAngle = null, dragged = false;
    function angle(e) {
      var r = wheel.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    }
    wheel.addEventListener("pointerdown", function (e) { lastAngle = angle(e); acc = 0; dragged = false; });
    wheel.addEventListener("pointermove", function (e) {
      if (lastAngle === null || !e.buttons) return;
      var a = angle(e), d = a - lastAngle;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      lastAngle = a; acc += d;
      while (Math.abs(acc) >= 30) { move(acc > 0 ? 1 : -1); acc -= acc > 0 ? 30 : -30; dragged = true; }
    });
    window.addEventListener("pointerup", function () { lastAngle = null; });
    wheel.addEventListener("click", function (e) {
      if (dragged) { dragged = false; e.preventDefault(); return; }
      var btn = e.target.closest("[data-act]"); if (!btn) return;
      var act = btn.getAttribute("data-act");
      if (act === "prev") move(-1);
      if (act === "next") move(1);
      if (act === "select") openSelected();
      if (act === "menu") window.scrollTo({ top: 0, behavior: "smooth" });
    });
    $("screen-list").addEventListener("click", function (e) {
      var li = e.target.closest("li[data-idx]"); if (!li) return;
      sel = Number(li.getAttribute("data-idx")); renderScreen(); openSelected();
    });
    $("ipod").addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { move(1); e.preventDefault(); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { move(-1); e.preventDefault(); }
    });
  }

  /* ---------- routing: #firmware-id opens that card ---------- */
  function route() {
    var id = decodeURIComponent(location.hash.slice(1));
    var fw = itemById[id];
    if (!fw) return;
    if (!matches(fw)) {
      state.kind = "all"; state.platform = "all"; state.q = ""; $("filter-q").value = "";
      if (fitOf(fw, state.device) === "none") { state.device = "all"; $("filter-device").value = "all"; store("cwf-device", null); }
    }
    state.open.add(id);
    renderCards();
    var i = visible.indexOf(fw); if (i > -1) { sel = i; renderScreen(); }
    var el = $(id);
    if (el) {
      el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      el.classList.add("is-flash");
      setTimeout(function () { el.classList.remove("is-flash"); }, 1600);
    }
  }

  /* ---------- events ---------- */
  function bind() {
    $("latest-toggle").addEventListener("click", function () {
      var collapsed = !$("latest-list").closest(".latest").classList.contains("is-collapsed");
      setLatestCollapsed(collapsed);
      store("cwf-latest-hidden", collapsed ? DATA.latest.date : null);
    });
    $("filter-device").addEventListener("change", function (e) {
      state.device = e.target.value;
      store("cwf-device", state.device === "all" ? null : state.device);
      renderCards(); renderMatrix();
    });
    $("filter-order").addEventListener("change", function (e) { state.order = e.target.value; renderCards(); });
    $("filter-q").addEventListener("input", function (e) { state.q = e.target.value.trim(); renderCards(); });

    document.addEventListener("click", function (e) {
      var kind = e.target.closest("[data-kind]");
      if (kind) {
        state.kind = kind.getAttribute("data-kind");
        $("show-menu").open = false;
        renderCards();
        return;
      }
      var plat = e.target.closest("[data-platform]");
      if (plat) { state.platform = plat.getAttribute("data-platform"); renderApps(); return; }
      var more = e.target.closest("[data-more]");
      if (more) {
        var id = more.getAttribute("data-more");
        if (state.open.has(id)) state.open.delete(id); else state.open.add(id);
        renderCards();
        var btn = document.querySelector('[data-more="' + id + '"]');
        if (btn) btn.focus({ preventScroll: true });
        return;
      }
      // Close any open menu when clicking elsewhere.
      document.querySelectorAll("details.menu[open]").forEach(function (d) { if (!d.contains(e.target)) d.open = false; });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") document.querySelectorAll("details.menu[open]").forEach(function (d) { d.open = false; d.querySelector("summary").focus(); });
    });
    window.addEventListener("hashchange", route);
  }

  /* ---------- boot ---------- */
  renderLatest();
  renderDeviceSelect();
  renderCards();
  renderMatrix();
  renderWatch();
  setupWheel();
  bind();
  if (location.hash) route();
})();

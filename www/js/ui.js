/* ============================================================
   UI helpers: routing, rendering primitives, toast, modal, charts (inline SVG), timers.
   ============================================================ */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const h = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? (vals[i] && vals[i].__raw ? vals[i].v : esc(vals[i])) : ""), "");
  const raw = v => ({ __raw: true, v });

  let toastTimer;
  function toast(msg, kind) {
    let t = $(".toast"); if (t) t.remove();
    t = document.createElement("div"); t.className = "toast " + (kind || ""); t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3200);
  }

  function modal(html, opts) {
    opts = opts || {};
    const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    m.innerHTML = `<div class="box">${html}</div>`;
    m.addEventListener("click", e => { if (e.target === m && !opts.sticky) close(); });
    const onKey = e => { if (e.key === "Escape" && !opts.sticky) close(); };
    document.addEventListener("keydown", onKey);
    function close() { m.remove(); document.removeEventListener("keydown", onKey); opts.onClose && opts.onClose(); }
    document.body.appendChild(m);
    const f = m.querySelector("button, [href], input, select, textarea"); f && f.focus();
    return { el: m, close };
  }

  function confirm(msg, okLabel) {
    return new Promise(res => {
      const m = modal(`<p style="font-size:1.05rem">${esc(msg)}</p><div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-x="0">Cancel</button><button class="btn primary" data-x="1">${esc(okLabel || "OK")}</button></div>`, { onClose: () => res(false) });
      $$("[data-x]", m.el).forEach(b => b.onclick = () => { const v = b.dataset.x === "1"; m.el.remove(); res(v); });
    });
  }

  /* ---------- Simple router ---------- */
  const routes = {};
  let current = null;
  function route(name, fn) { routes[name] = fn; }
  function go(name, params, replace) {
    const hash = "#" + name + (params ? "?" + new URLSearchParams(params).toString() : "");
    if (replace) history.replaceState(null, "", hash); else location.hash = hash;
    if (replace) render();
  }
  function parse() {
    const hsh = location.hash.slice(1) || "home";
    const [name, qs] = hsh.split("?");
    return { name, params: Object.fromEntries(new URLSearchParams(qs || "")) };
  }
  function render() {
    const { name, params } = parse();
    const fn = routes[name] || routes.home;
    current = name;
    const root = $("#view");
    try { root.innerHTML = ""; fn(root, params); }
    catch (e) { console.error(e); root.innerHTML = `<div class="card bad"><h3>Something went wrong</h3><p class="small">${esc(e.message)}</p><button class="btn" onclick="location.hash='#home'">Go Home</button></div>`; }
    $$(".nav button").forEach(b => { if (b.dataset.go === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  /* ---------- Charts (inline SVG, no deps) ---------- */
  function lineChart(series, opts) {
    // series: [{name,color,points:[{x:label,y}]}]
    opts = opts || {}; const W = 600, H = 220, P = 34;
    const all = series.flatMap(s => s.points.map(p => p.y)); if (!all.length) return `<div class="emptystate">No data yet</div>`;
    const maxY = opts.max || Math.max(...all, 1), minY = 0;
    const n = Math.max(...series.map(s => s.points.length));
    const x = i => P + (n > 1 ? (W - 2 * P) * i / (n - 1) : (W - 2 * P) / 2), y = v => H - P - (H - 2 * P) * (v - minY) / (maxY - minY || 1);
    let g = "";
    for (let k = 0; k <= 4; k++) { const v = minY + (maxY - minY) * k / 4; g += `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="#e5e7eb"/><text x="${P - 6}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="#6b7280">${Math.round(v)}</text>`; }
    const paths = series.map(s => `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" points="${s.points.map((p, i) => x(i) + "," + y(p.y)).join(" ")}"/>` + s.points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="3.5" fill="${s.color}"><title>${esc(p.x)}: ${p.y}</title></circle>`).join("")).join("");
    const labels = series[0].points.map((p, i) => (n <= 8 || i % Math.ceil(n / 8) === 0) ? `<text x="${x(i)}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#6b7280">${esc(String(p.x).slice(5))}</text>` : "").join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "chart")}">${g}${paths}${labels}</svg><div class="legend">${series.map(s => `<span><i class="dot" style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div>`;
  }
  function barChart(items, opts) {
    // items: [{label,value,color}] horizontal bars 0..max
    opts = opts || {}; const max = opts.max || Math.max(...items.map(i => i.value), 1);
    return `<div>${items.map(i => `<div style="margin:6px 0"><div class="row between small"><span>${esc(i.label)}</span><b>${i.value}${opts.suffix || ""}</b></div><div class="bar"><i style="width:${Math.round(i.value / max * 100)}%;background:${i.color || "var(--primary)"}"></i></div></div>`).join("")}</div>`;
  }

  /* ---------- Timer ---------- */
  function fmt(sec) { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  function fmtH(sec) { const hh = Math.floor(sec / 3600), mm = Math.round((sec % 3600) / 60); return hh ? `${hh}h ${mm}m` : `${mm}m`; }

  /* Idle-aware active time tracker: counts only while tab visible and user interacted within 90s */
  function activeTimer() {
    let active = 0, last = Date.now(), lastInteract = Date.now(), iv;
    const onI = () => lastInteract = Date.now();
    ["click", "keydown", "touchstart", "scroll", "mousemove"].forEach(e => document.addEventListener(e, onI, { passive: true }));
    iv = setInterval(() => { const now = Date.now(); if (!document.hidden && now - lastInteract < 90000) active += (now - last) / 1000; last = now; }, 1000);
    return { get: () => Math.round(active), stop: () => { clearInterval(iv); ["click", "keydown", "touchstart", "scroll", "mousemove"].forEach(e => document.removeEventListener(e, onI)); return Math.round(active); } };
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function subjName(id) { const s = SUBJECTS.find(x => x.id === id); return s ? s.name : id; }
  function subjColor(id) { const s = SUBJECTS.find(x => x.id === id); return s ? s.color : "#888"; }
  function masteryLabel(m) { return { NOT_STARTED: "Not started", INTRODUCED: "Introduced", LEARNING: "Learning", PRACTICING: "Practicing", COMPETENT: "Competent", STRONG: "Strong", MASTERED: "Mastered" }[m] || m; }
  function masteryPill(m) { return `<span class="mastery m-${m}">${masteryLabel(m)}</span>`; }

  window.UI = { $, $$, esc, h, raw, toast, modal, confirm, route, go, render, parse, lineChart, barChart, fmt, fmtH, activeTimer, download, subjName, subjColor, masteryLabel, masteryPill };
})();

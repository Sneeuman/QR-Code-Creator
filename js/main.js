/* QR Studio: the interface. Ties payloads, renderer, export, storage and scan check together. */
(function (Q) {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const P = Q.payloads, R = Q.render, X = Q.export, ST = Q.storage;
  let S = ST.initialState();
  let cur = null;                         // the currently rendered design { svg, w, h, payload, m }

  /* ---------------- tiny helpers ---------------- */
  const get = p => p.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  const set = (p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; };
  const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2400); }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const nameFor = (payload, type) => { try { return slug(new URL(payload).hostname.replace(/^www\./, "")) || type; } catch { return slug(type) || "qr"; } };

  /* ---------------- build static UI pieces ---------------- */
  function buildTypes() {
    $("#types").innerHTML = P.TYPES.map(t => `<button type="button" class="type" role="radio" data-type="${t.id}" aria-checked="false"><svg viewBox="0 0 24 24"><path d="${P.ICONS[t.id]}"/></svg>${t.label}</button>`).join("");
    $$("#types .type").forEach(b => b.onclick = () => { S.type = b.dataset.type; renderFields(); syncUI(); schedule(); });
  }
  function renderFields() {
    const t = P.byId(S.type), box = $("#fields"); box.innerHTML = "";
    t.fields.forEach(fd => {
      const wrap = document.createElement(fd.type === "checkbox" ? "label" : "label");
      wrap.className = fd.type === "checkbox" ? "check full" : "fld" + (fd.type === "textarea" || t.fields.length === 1 || fd.type === "url" && t.id === "url" ? " full" : "");
      let input;
      if (fd.type === "textarea") input = document.createElement("textarea");
      else if (fd.type === "select") { input = document.createElement("select"); fd.opts.forEach(([v, l]) => input.add(new Option(l, v))); }
      else { input = document.createElement("input"); input.type = fd.type; }
      if (fd.ph) input.placeholder = fd.ph;
      if (input.type === "url") input.setAttribute("inputmode", "url");
      input.autocomplete = "off"; input.spellcheck = false;
      const cur0 = S.fields[t.id][fd.k];
      if (fd.type === "checkbox") input.checked = !!cur0; else input.value = cur0 == null ? "" : cur0;
      input.addEventListener("input", () => { S.fields[t.id][fd.k] = fd.type === "checkbox" ? input.checked : input.value; schedule(); });
      if (fd.type === "checkbox") { wrap.append(input, " " + fd.label); } else { wrap.append(fd.label, input); }
      box.append(wrap);
    });
  }
  const DOTS = ["square", "rounded", "dots", "liquid", "diamond"], EYEF = ["square", "rounded", "circle", "leaf"], EYEB = ["square", "rounded", "circle", "leaf"];
  function buildOpts(sel, kind, values) {
    const box = $(sel); box.innerHTML = values.map(v => `<button type="button" data-v="${v}" title="${v}" aria-label="${v}">${R.swatch(kind, v)}</button>`).join("");
  }
  const PRESETS = [
    { name: "Royal", sw: ["#0f2a7a", "#2f7bff"], s: { dots: "liquid", eyeFrame: "rounded", eyeBall: "rounded", fg: "#0f2a7a", fg2: "#2f7bff", grad: "linear", angle: 45, bg: "#ffffff", transp: false } },
    { name: "Ocean", sw: ["#0b4f8f", "#1a96d8"], s: { dots: "rounded", eyeFrame: "rounded", eyeBall: "circle", fg: "#0b4f8f", fg2: "#1a96d8", grad: "linear", angle: 90, bg: "#ffffff", transp: false } },
    { name: "Ice", sw: ["#0b1a2f", "#cfe3ff"], s: { dots: "dots", eyeFrame: "circle", eyeBall: "circle", fg: "#0b1a2f", fg2: "#0b1a2f", grad: "none", angle: 45, bg: "#dbe9ff", transp: false } },
    { name: "Violet", sw: ["#4b1fb0", "#c04ce0"], s: { dots: "dots", eyeFrame: "circle", eyeBall: "circle", fg: "#4b1fb0", fg2: "#c04ce0", grad: "linear", angle: 60, bg: "#ffffff", transp: false } },
    { name: "Sunset", sw: ["#c2255c", "#d9640a"], s: { dots: "liquid", eyeFrame: "leaf", eyeBall: "leaf", fg: "#c2255c", fg2: "#d9640a", grad: "linear", angle: 30, bg: "#ffffff", transp: false } },
    { name: "Diamond", sw: ["#0e7490", "#1d4ed8"], s: { dots: "diamond", eyeFrame: "leaf", eyeBall: "leaf", fg: "#0e7490", fg2: "#1d4ed8", grad: "linear", angle: 120, bg: "#ffffff", transp: false } },
    { name: "Ink", sw: ["#111827", "#111827"], s: { dots: "square", eyeFrame: "square", eyeBall: "square", fg: "#111827", fg2: "#111827", grad: "none", angle: 45, bg: "#ffffff", transp: false } },
    { name: "Radial", sw: ["#1d4ed8", "#38bdf8"], s: { dots: "rounded", eyeFrame: "rounded", eyeBall: "rounded", fg: "#102a8c", fg2: "#2b86f0", grad: "radial", angle: 0, bg: "#ffffff", transp: false } },
  ];
  function buildPresets() {
    $("#presets").innerHTML = PRESETS.map((p, i) => `<button type="button" class="preset" data-i="${i}"><i style="background:linear-gradient(135deg,${p.sw[0]},${p.sw[1]})"></i>${p.name}</button>`).join("");
    $$("#presets .preset").forEach(b => b.onclick = () => { Object.assign(S.style, PRESETS[b.dataset.i].s, { eyeCustom: false }); syncUI(); schedule(); });
  }
  /* built-in logo badges, generated as little SVGs */
  const GH = "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";
  const stroke = d => `<g transform="translate(16 16) scale(1.333)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></g>`;
  const BADGES = [
    ["GitHub", "#161b22", `<g transform="translate(14 14) scale(2.25)" fill="#fff"><path d="${GH}"/></g>`],
    ["LinkedIn", "#0a66c2", `<text x="32" y="45" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" text-anchor="middle" fill="#fff">in</text>`],
    ["Email", "#2a7de1", stroke(P.ICONS.email)], ["Phone", "#1d5fe0", stroke(P.ICONS.phone)], ["Wi-Fi", "#1590d6", stroke(P.ICONS.wifi)],
    ["Location", "#d9453f", stroke(P.ICONS.geo)], ["Chat", "#128c7e", stroke(P.ICONS.whatsapp)], ["Link", "#4b1fb0", stroke(P.ICONS.url)],
  ];
  const badgeURL = (bg, inner) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><rect width="64" height="64" fill="${bg}"/>${inner}</svg>`);
  function buildIcons() {
    $("#icons").innerHTML = BADGES.map((b, i) => `<button type="button" data-i="${i}" title="${b[0]}" aria-label="Use ${b[0]} icon"><img alt="" src="${badgeURL(b[1], b[2])}"></button>`).join("");
    $$("#icons button").forEach(btn => btn.onclick = () => { const b = BADGES[btn.dataset.i]; S.logo.src = badgeURL(b[1], b[2]); S.logo.place = "center"; syncUI(); schedule(); });
  }

  /* ---------------- two-way binding ---------------- */
  const valOf = el => el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
  function bindInputs() {
    $$("[data-bind]").forEach(el => {
      if (el.classList.contains("opts")) {
        el.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; set(el.dataset.bind, b.dataset.v); syncUI(); schedule(); });
      } else el.addEventListener("input", () => { set(el.dataset.bind, valOf(el)); syncUI(true); schedule(); });
    });
  }
  const test = expr => { const m = expr.match(/^([\w.]+)(!?=)?(.*)$/); const v = get(m[1]); if (!m[2]) return !!v; return m[2] === "=" ? String(v) === m[3] : String(v) !== m[3]; };
  function syncUI(fromInput) {
    $$("[data-bind]").forEach(el => {
      const v = get(el.dataset.bind);
      if (el.classList.contains("opts")) $$("button", el).forEach(b => { const on = b.dataset.v === String(v); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      else if (!fromInput) { if (el.type === "checkbox") el.checked = !!v; else el.value = v; }
    });
    $$("[data-out]").forEach(o => o.textContent = get(o.dataset.out));
    $$("[data-showif]").forEach(el => el.hidden = !test(el.dataset.showif));
    $$("#types .type").forEach(b => { const on = b.dataset.type === S.type; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    $("#type-hint").textContent = P.byId(S.type).hint;
    const thumb = $("#logo-thumb"); thumb.hidden = !S.logo.src; if (S.logo.src) thumb.src = S.logo.src;
    $("#px").value = String(S.px);
  }

  /* ---------------- logo upload ---------------- */
  function loadLogo(file) {
    if (!file || !file.type.startsWith("image/")) return toast("Please choose an image file");
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const w0 = img.naturalWidth || 400, h0 = img.naturalHeight || 400, k = Math.min(1, 420 / Math.max(w0, h0));
      const c = document.createElement("canvas"); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      S.logo.src = file.type === "image/jpeg" ? c.toDataURL("image/jpeg", .88) : c.toDataURL("image/png");
      syncUI(); schedule(); toast("Logo added");
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Could not read that image"); };
    img.src = url;
  }
  function bindLogo() {
    const drop = $("#drop"), file = $("#logo-file");
    drop.onclick = () => file.click();
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } };
    file.onchange = () => { loadLogo(file.files[0]); file.value = ""; };
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => loadLogo(e.dataTransfer.files[0]));
    $("#logo-remove").onclick = () => { S.logo.src = ""; syncUI(); schedule(); };
  }

  /* ---------------- drawing ---------------- */
  const eccFor = () => (S.logo.src && S.logo.place === "center") ? "H" : S.style.ecc;
  let raf = 0, seq = 0, scanT = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  const saveLast = debounce(() => ST.saveLast(S), 500);
  function setScan(cls, msg) { const e = $("#scan"); e.className = "scan " + cls; e.textContent = msg; }
  function canExport(on) { ["dl-png", "dl-svg", "copy", "save", "share"].forEach(id => $("#" + id).disabled = !on); }

  function draw() {
    const payload = P.build(S.type, S.fields[S.type]), prev = $("#preview"), warn = $("#warnings");
    warn.innerHTML = ""; $("#meta").textContent = "";
    if (!payload) { cur = null; canExport(false); prev.innerHTML = `<div class="empty">Fill in the content on the left and your QR code appears here.</div>`; setScan("", "Waiting for content"); return; }
    let m; try { m = Q.core.matrix(payload, eccFor()); }
    catch { cur = null; canExport(false); prev.innerHTML = `<div class="error">That is too much data for one QR code. Try shortening the text or link.</div>`; setScan("bad", "Too much data"); return; }
    const out = R.build(S, m, payload); cur = { ...out, payload, m }; canExport(true);
    prev.innerHTML = out.svg;
    $("#meta").textContent = `${payload.length} characters · QR version ${m.version} (${m.n}×${m.n} squares) · error correction ${eccFor()}`;
    // advice
    const st = S.style, bg = st.transp ? "#ffffff" : st.bg, tips = [];
    const lowest = Math.min(Q.core.contrast(st.fg, bg), st.grad !== "none" ? Q.core.contrast(st.fg2, bg) : 99);
    if (Q.core.luminance(st.fg) > Q.core.luminance(bg)) tips.push("Light pattern on a dark background: many scanner apps cannot read inverted codes.");
    else if (lowest < 3) tips.push("Low contrast between pattern and background. Darken the pattern or lighten the background.");
    if (S.logo.src && S.logo.place === "center" && S.logo.size > 24) tips.push("The logo is large. Below 22% is safest.");
    if (m.n >= 65) tips.push("This is a dense code. Print it bigger, or shorten the link.");
    if (st.transp) tips.push("Transparent background: place it on a light, plain surface.");
    tips.forEach(t => warn.insertAdjacentHTML("beforeend", `<li>${t}</li>`));
    // scan check
    const my = ++seq; setScan("", "Checking that it scans…"); clearTimeout(scanT);
    scanT = setTimeout(async () => {
      try {
        const r = await Q.scan.check(out.svg, out.w, out.h, payload); if (my !== seq) return;
        if (r.ok && !r.inverted) setScan("ok", "Scan check passed. It reads correctly.");
        else if (r.ok) setScan("warn", "Readable, but inverted. Some scanners will fail.");
        else if (r.mismatch) setScan("warn", "Read back something different. Try a simpler style.");
        else setScan("warn", "Couldn't verify with our test reader. Test it with your phone.");
      } catch { if (my === seq) setScan("", "Test it with your phone camera"); }
    }, 350);
    saveLast();
  }

  /* ---------------- downloads, copy, share, save ---------------- */
  const need = () => { if (!cur) { toast("Add some content first"); return false; } return true; };
  function bindActions() {
    $("#px").onchange = e => { S.px = +e.target.value; saveLast(); };
    $("#dl-png").onclick = async () => { if (!need()) return; try { X.download(await X.png(cur.svg, cur.w, cur.h, S.px), nameFor(cur.payload, S.type) + "-qr.png"); toast("PNG downloaded"); } catch { toast("Could not create the image"); } };
    $("#dl-svg").onclick = () => { if (!need()) return; X.download(X.svgBlob(cur.svg), nameFor(cur.payload, S.type) + "-qr.svg"); toast("SVG downloaded"); };
    $("#copy").onclick = async () => { if (!need()) return; try { await X.copyImage(await X.png(cur.svg, cur.w, cur.h, Math.min(S.px, 2048))); toast("Image copied"); } catch { toast("Copy isn't supported here. Use Download."); } };
    $("#share").onclick = async () => {
      if (!need()) return; const link = ST.shareLink(S);
      try { await navigator.clipboard.writeText(link); toast(S.logo.src ? "Design link copied (without your logo)" : "Design link copied"); } catch { window.prompt("Copy this link:", link); }
    };
    $("#save").onclick = () => {
      if (!need()) return;
      const t = P.byId(S.type), label = `${t.label}: ${(cur.payload.replace(/^https?:\/\//, "").replace(/\s+/g, " ")).slice(0, 26)}`;
      const r = ST.saved.add(label, S); countSaved();
      toast(r === true ? "Saved. Find it in the Saved tab" : r === "nologo" ? "Saved (logo too big to store, so it was left out)" : "Browser storage is full or blocked");
    };
  }

  /* ---------------- views ---------------- */
  function show(view) {
    $$(".modes button").forEach(b => { const on = b.dataset.view === view; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    $$(".view").forEach(v => v.hidden = v.id !== "view-" + view);
    if (view === "saved") renderSaved();
    window.scrollTo({ top: 0 });
  }
  function bindViews() {
    $$(".modes button").forEach(b => b.onclick = () => show(b.dataset.view));
    $$(".steps button").forEach(b => b.onclick = () => {
      $$(".steps button").forEach(x => x.classList.toggle("on", x === b)); $$(".pane").forEach(p => p.classList.toggle("on", p.id === "pane-" + b.dataset.tab));
    });
  }
  function countSaved() { const n = ST.saved.list().length, c = $("#saved-count"); c.hidden = !n; c.textContent = n; }

  /* ---------------- saved designs ---------------- */
  function previewFor(state, uid) {
    const payload = P.build(state.type, state.fields[state.type]) || "https://example.com";
    const logoCenter = state.logo.src && state.logo.place === "center";
    return R.build(state, Q.core.matrix(payload, logoCenter ? "H" : state.style.ecc), payload, { uid });
  }
  function renderSaved() {
    const box = $("#saved-out"), list = ST.saved.list(); box.innerHTML = "";
    if (!list.length) { box.innerHTML = `<p class="empty-note">Nothing saved yet. Design a code in the Studio and press “Save design”.</p>`; return; }
    list.forEach((it, i) => {
      const state = ST.merge(ST.DEFAULTS(), it.state), card = document.createElement("div"); card.className = "cardq";
      let svg = ""; try { svg = previewFor(state, "s" + i).svg; } catch {}
      card.innerHTML = `<div class="th">${svg}</div><input type="text" aria-label="Design name" maxlength="40"><small>${new Date(it.at).toLocaleDateString()}</small>
        <div class="actions"><button class="btn" type="button" data-a="open">Open</button><button class="btn ghost" type="button" data-a="del">Delete</button></div>`;
      const name = $("input", card); name.value = it.name; name.onchange = () => ST.saved.rename(it.id, name.value.trim() || it.name);
      $('[data-a="open"]', card).onclick = () => { S = state; renderFields(); syncUI(); schedule(); show("studio"); toast("Design loaded"); };
      $('[data-a="del"]', card).onclick = () => { ST.saved.remove(it.id); countSaved(); renderSaved(); };
      box.append(card);
    });
  }

  /* ---------------- bulk ---------------- */
  let bulk = [];
  const yieldUI = () => new Promise(r => setTimeout(r, 0));
  function parseBulk() {
    return $("#bulk-text").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 300).map(l => {
      const i = l.indexOf("|"); return i > 0 ? { label: l.slice(0, i).trim(), content: l.slice(i + 1).trim() } : { label: "", content: l };
    }).filter(x => x.content);
  }
  async function bulkGenerate() {
    const rows = parseBulk(), out = $("#bulk-out"), st = $("#bulk-status"); out.innerHTML = ""; bulk = []; $("#bulk-zip").disabled = true;
    if (!rows.length) { st.textContent = "Add at least one line first."; return; }
    const url = $("#bulk-mode").value === "url", useLabel = $("#bulk-label").checked; let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], payload = url ? P.normUrl(r.content) : r.content;
      try {
        const m = Q.core.matrix(payload, eccFor());
        const o = R.build(S, m, payload, { uid: "b" + i, title: useLabel && r.label ? r.label : undefined, badge: useLabel && r.label ? r.label : undefined });
        bulk.push({ ...o, payload, label: r.label });
        const card = document.createElement("div"); card.className = "cardq"; card.innerHTML = `<div class="th">${o.svg}</div><div class="name"></div><small></small>`;
        $(".name", card).textContent = r.label || `Code ${i + 1}`; $("small", card).textContent = payload.slice(0, 42); out.append(card);
      } catch { failed++; }
      if (i % 12 === 11) { st.textContent = `Generating… ${i + 1} of ${rows.length}`; await yieldUI(); }
    }
    st.textContent = `Done: ${bulk.length} code${bulk.length === 1 ? "" : "s"}${failed ? `, ${failed} skipped (too long)` : ""}.`;
    $("#bulk-zip").disabled = !bulk.length;
  }
  async function bulkZip() {
    const st = $("#bulk-status"), px = +$("#bulk-px").value, files = [], used = new Set(); $("#bulk-zip").disabled = true;
    for (let i = 0; i < bulk.length; i++) {
      const b = bulk[i]; st.textContent = `Rendering images… ${i + 1} of ${bulk.length}`;
      let base = `${String(i + 1).padStart(3, "0")}-${slug(b.label) || nameFor(b.payload, "qr")}`; while (used.has(base)) base += "x"; used.add(base);
      files.push({ name: base + ".png", blob: await X.png(b.svg, b.w, b.h, px) });
      if (i % 5 === 4) await yieldUI();
    }
    X.download(await X.zip(files), "qr-codes.zip"); st.textContent = `Downloaded ${files.length} images.`; $("#bulk-zip").disabled = false;
  }
  function bindBulk() {
    $("#bulk-go").onclick = bulkGenerate; $("#bulk-zip").onclick = bulkZip;
    $("#bulk-file").onchange = async e => {
      const f = e.target.files[0]; if (!f) return; const txt = await f.text();
      $("#bulk-text").value = txt.split(/\r?\n/).map(l => { const c = l.match(/^\s*"?([^",]+)"?\s*,\s*"?(.+?)"?\s*$/); return c && !/^https?:/i.test(c[1]) ? `${c[1]} | ${c[2]}` : l; }).join("\n");
      toast("File loaded"); e.target.value = "";
    };
  }

  /* ---------------- theme + PWA ---------------- */
  function setTheme(t) { document.documentElement.dataset.theme = t; ST.ls.set("qrs.theme", t); $('meta[name="theme-color"]').content = t === "dark" ? "#0b1a2f" : "#eef4fc"; }
  function initTheme() {
    setTheme(ST.ls.get("qrs.theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
    $("#theme").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  }

  /* ---------------- start ---------------- */
  buildTypes(); buildOpts("#o-dots", "dots", DOTS); buildOpts("#o-eyeFrame", "eyeFrame", EYEF); buildOpts("#o-eyeBall", "eyeBall", EYEB);
  buildPresets(); buildIcons(); renderFields(); bindInputs(); bindLogo(); bindActions(); bindViews(); bindBulk(); initTheme(); countSaved();
  syncUI(); draw();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
  Q.app = { get state() { return S; }, get current() { return cur; }, set: (p, v) => { set(p, v); syncUI(); draw(); }, setState: s => { S = s; renderFields(); syncUI(); draw(); } };   // handy for testing
})(window.QRS = window.QRS || {});

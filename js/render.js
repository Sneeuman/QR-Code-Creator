/* The renderer: turns (state + QR matrix) into ONE SVG string.
   The preview, the PNG export and the SVG export all use this same string. */
(function (Q) {
  const f = n => Math.round(n * 100) / 100;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const FONT = "Inter,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

  /* ---------- path helpers ---------- */
  function rrect(x, y, w, h, tl, tr, br, bl) {
    const m = Math.min(w, h) / 2; tl = Math.min(tl, m); tr = Math.min(tr, m); br = Math.min(br, m); bl = Math.min(bl, m);
    const a = (r, ex, ey) => r ? `A${f(r)} ${f(r)} 0 0 1 ${f(ex)} ${f(ey)}` : "";
    return `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}${a(tr, x + w, y + tr)}V${f(y + h - br)}${a(br, x + w - br, y + h)}H${f(x + bl)}${a(bl, x, y + h - bl)}V${f(y + tl)}${a(tl, x + tl, y)}Z`;
  }
  const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  const diamond = (cx, cy, r) => `M${f(cx)} ${f(cy - r)}L${f(cx + r)} ${f(cy)}L${f(cx)} ${f(cy + r)}L${f(cx - r)} ${f(cy)}Z`;

  /** a shape used for eye frames/balls */
  function shape(kind, x, y, s) {
    switch (kind) {
      case "circle": return circle(x + s / 2, y + s / 2, s / 2);
      case "rounded": { const r = s * .26; return rrect(x, y, s, s, r, r, r, r); }
      case "leaf": { const r = s * .5; return rrect(x, y, s, s, r, 0, r, 0); }
      case "diamond": return diamond(x + s / 2, y + s / 2, s / 2);
      default: return rrect(x - .1, y - .1, s + .2, s + .2, 0, 0, 0, 0);
    }
  }
  /** a single data module */
  function module_(style, x, y, s, nb) {
    switch (style) {
      case "dots": return circle(x + s / 2, y + s / 2, s * .53);
      case "diamond": return diamond(x + s / 2, y + s / 2, s * .74);
      case "rounded": { const r = s * .3; return rrect(x + s * .05, y + s * .05, s * .9, s * .9, r, r, r, r); }
      case "liquid": { const r = s * .5; return rrect(x - .08, y - .08, s + .16, s + .16, !nb.t && !nb.l ? r : 0, !nb.t && !nb.r ? r : 0, !nb.b && !nb.r ? r : 0, !nb.b && !nb.l ? r : 0); }
      default: return rrect(x - .1, y - .1, s + .2, s + .2, 0, 0, 0, 0);
    }
  }

  /* ---------- the QR itself, in a local box [0..Q] ---------- */
  function qrGroup(S, m, uid, opt) {
    const st = S.style, lg = S.logo, cell = 10, mg = st.margin, n = m.n, Qs = (n + mg * 2) * cell;
    const ox = mg * cell, oy = mg * cell;
    const hasLogo = !!lg.src && lg.place === "center" && !opt.noLogo;
    const D = hasLogo ? Qs * lg.size / 100 : 0, backing = D * 1.16, cx = Qs / 2, cy = Qs / 2;
    const clear = (mx, my) => {
      if (!hasLogo) return false;
      const lim = backing / 2 + cell * .55;
      return lg.shape === "circle" ? Math.hypot(mx - cx, my - cy) < lim : (Math.abs(mx - cx) < lim && Math.abs(my - cy) < lim);
    };
    const dark = (r, c) => r >= 0 && c >= 0 && r < n && c < n && m.isDark(r, c);
    const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

    // fill: solid or gradient
    let defs = "", fill = st.fg;
    if (st.grad !== "none") {
      const g = `qg${uid}`;
      if (st.grad === "radial") defs += `<radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="${f(Qs / 2)}" cy="${f(Qs / 2)}" r="${f(Qs * .72)}"><stop offset="0" stop-color="${st.fg2}"/><stop offset="1" stop-color="${st.fg}"/></radialGradient>`;
      else { const a = (st.angle || 0) * Math.PI / 180, h = Qs / 2, dx = Math.cos(a) * h, dy = Math.sin(a) * h;
        defs += `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f(Qs / 2 - dx)}" y1="${f(Qs / 2 - dy)}" x2="${f(Qs / 2 + dx)}" y2="${f(Qs / 2 + dy)}"><stop offset="0" stop-color="${st.fg}"/><stop offset="1" stop-color="${st.fg2}"/></linearGradient>`; }
      fill = `url(#${g})`;
    }
    const eyeFill = st.eyeCustom ? st.eyeColor : fill;

    // data modules
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!dark(r, c) || inEye(r, c)) continue;
      const x = ox + c * cell, y = oy + r * cell;
      if (clear(x + cell / 2, y + cell / 2)) continue;
      d += module_(st.dots, x, y, cell, { t: dark(r - 1, c), r: dark(r, c + 1), b: dark(r + 1, c), l: dark(r, c - 1) });
    }
    // the three finder "eyes"
    let eyes = "";
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => {
      const x = ox + c * cell, y = oy + r * cell;
      eyes += shape(st.eyeFrame, x, y, cell * 7) + shape(st.eyeFrame, x + cell, y + cell, cell * 5);
    });
    let balls = "";
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => { balls += shape(st.eyeBall, ox + (c + 2) * cell, oy + (r + 2) * cell, cell * 3); });

    // background
    const rx = Qs * (st.radius || 0) / 200;
    let out = defs;
    if (opt.panelBg) out += `<path d="${rrect(0, 0, Qs, Qs, rx, rx, rx, rx)}" fill="${opt.panelBg}"/>`;
    else if (!st.transp) out += `<path d="${rrect(0, 0, Qs, Qs, rx, rx, rx, rx)}" fill="${st.bg}"/>`;
    out += `<path d="${d}" fill="${fill}"/><path d="${eyes}" fill="${eyeFill}" fill-rule="evenodd"/><path d="${balls}" fill="${eyeFill}"/>`;

    // logo in the middle
    if (hasLogo) {
      const id = `ql${uid}`;
      const bk = lg.shape === "circle" ? circle(cx, cy, backing / 2) : rrect(cx - backing / 2, cy - backing / 2, backing, backing, lg.shape === "rounded" ? backing * .24 : 0, lg.shape === "rounded" ? backing * .24 : 0, lg.shape === "rounded" ? backing * .24 : 0, lg.shape === "rounded" ? backing * .24 : 0);
      if (lg.pad && !st.transp) out += `<path d="${bk}" fill="${opt.panelBg || st.bg}"/>`;
      out += logoImage(lg, cx, cy, D, id);
    }
    return { svg: out, size: Qs };
  }

  function logoImage(lg, cx, cy, D, id, ring) {
    const clip = lg.shape === "circle" ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(D / 2)}"/>` : `<rect x="${f(cx - D / 2)}" y="${f(cy - D / 2)}" width="${f(D)}" height="${f(D)}" rx="${lg.shape === "rounded" ? f(D * .22) : 0}"/>`;
    return `<clipPath id="${id}">${clip}</clipPath><image xlink:href="${esc(lg.src)}" href="${esc(lg.src)}" x="${f(cx - D / 2)}" y="${f(cy - D / 2)}" width="${f(D)}" height="${f(D)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
  }

  /* shrink text to fit a width (rough but reliable) */
  const fit = (txt, base, maxW) => Math.min(base, maxW / Math.max(1, String(txt).length * .58));
  const text = (t, x, y, size, fill, weight, extra) => t ? `<text x="${f(x)}" y="${f(y)}" font-family="${FONT}" font-size="${f(size)}" font-weight="${weight || 400}" fill="${fill}" text-anchor="middle"${extra || ""}>${esc(t)}</text>` : "";

  /** Build the final SVG. Returns { svg, w, h }. */
  function build(S, m, payload, over) {
    over = over || {};
    const fr = S.frame, uid = over.uid || "";
    const title = over.title != null ? over.title : fr.title;
    let body = "", W, H;

    if (fr.kind === "card") {
      const panelBg = S.style.transp ? "#ffffff" : S.style.bg;
      const g = qrGroup(S, m, uid, { panelBg });
      const Qs = g.size, P = Qs * .1, photo = !!S.logo.src && S.logo.place === "top", pd = Qs * .32;
      let y = P;
      let head = "";
      if (photo) {
        const cy = y + pd / 2, id = `qp${uid}`;
        head += `<circle cx="${f((Qs + 2 * P) / 2)}" cy="${f(cy)}" r="${f(pd / 2 + Qs * .014)}" fill="${fr.tc}" opacity=".95"/>` + logoImage({ ...S.logo, shape: "circle" }, (Qs + 2 * P) / 2, cy, pd, id);
        y += pd + P * .75;
      }
      if (title) { const fs = fit(title, Qs * .07, Qs); y += fs; head += text(title, (Qs + 2 * P) / 2, y, fs, fr.tc, 700); y += P * .15; }
      if (fr.caption) { const fs = fit(fr.caption, Qs * .04, Qs); y += fs * 1.3; head += text(fr.caption, (Qs + 2 * P) / 2, y, fs, fr.tc, 400, ' opacity=".8"'); }
      y += P * .75;
      W = Qs + 2 * P;
      const qy = y; y += Qs;
      let foot = "";
      if (fr.showUrl && payload && /^https?:\/\//i.test(payload)) { const u = payload.replace(/^https?:\/\//i, "").replace(/\/$/, ""); const fs = fit(u, Qs * .036, Qs); y += P * .45 + fs; foot = text(u, W / 2, y, fs, fr.tc, 500, ' opacity=".75"'); y += P * .55; } else y += P;
      H = y;
      const R = Qs * .07, uidg = `cb${uid}`;
      body = `<defs><linearGradient id="${uidg}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fr.c1}"/><stop offset="1" stop-color="${fr.c2}"/></linearGradient></defs>` +
        `<path d="${rrect(0, 0, W, H, R, R, R, R)}" fill="url(#${uidg})"/>${head}<g transform="translate(${f(P)} ${f(qy)})">${g.svg}</g>${foot}`;
    } else if (fr.kind === "badge") {
      const g = qrGroup(S, m, uid, { panelBg: S.style.transp ? "#ffffff" : S.style.bg }), Qs = g.size, pad = Qs * .07, bar = Qs * .2;
      W = Qs + 2 * pad; H = pad + Qs + bar;
      const R = Qs * .08, label = over.badge != null ? over.badge : fr.badge;
      const fs = fit(label, Qs * .095, Qs * .9);
      body = `<path d="${rrect(0, 0, W, H, R, R, R, R)}" fill="${fr.c1}"/><g transform="translate(${f(pad)} ${f(pad)})">${g.svg}</g>` + text(label, W / 2, pad + Qs + bar / 2 + fs * .36, fs, fr.tc, 800, ` letter-spacing="${f(fs * .08)}"`);
    } else {
      const g = qrGroup(S, m, uid, {});
      W = H = g.size; body = g.svg;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${f(W)} ${f(H)}" width="${f(W)}" height="${f(H)}" shape-rendering="geometricPrecision" role="img" aria-label="QR code">${body}</svg>`;
    return { svg, w: W, h: H };
  }

  /* ---------- tiny icons for the option pickers ---------- */
  function swatch(kind, value, color) {
    color = color || "currentColor";
    const wrap = inner => `<svg viewBox="0 0 30 30" width="34" height="34" aria-hidden="true">${inner}</svg>`;
    if (kind === "dots") {
      const g = [[1, 1, 0], [1, 0, 1], [0, 1, 1]]; let d = "";
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (g[r][c]) d += module_(value, 3 + c * 8, 3 + r * 8, 8, { t: r > 0 && g[r - 1][c], b: r < 2 && g[r + 1][c], l: c > 0 && g[r][c - 1], r: c < 2 && g[r][c + 1] });
      return wrap(`<path d="${d}" fill="${color}"/>`);
    }
    if (kind === "eyeFrame") return wrap(`<path d="${shape(value, 3, 3, 24)}${shape(value, 7, 7, 16)}" fill="${color}" fill-rule="evenodd"/><path d="${shape("square", 11, 11, 8)}" fill="${color}"/>`);
    if (kind === "eyeBall") return wrap(`<path d="${shape("square", 3, 3, 24)}${shape("square", 7, 7, 16)}" fill="${color}" fill-rule="evenodd" opacity=".35"/><path d="${shape(value, 10, 10, 10)}" fill="${color}"/>`);
    return "";
  }

  Q.render = { build, swatch, esc };
})(window.QRS = window.QRS || {});

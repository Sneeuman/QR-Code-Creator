/* Defaults, saved designs, last session, and shareable links. Everything stays in the browser. */
(function (Q) {
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const clone = o => JSON.parse(JSON.stringify(o));

  const DEFAULTS = () => ({
    v: 1, type: "url", fields: Q.payloads.defaults(),
    style: { dots: "liquid", eyeFrame: "rounded", eyeBall: "rounded", fg: "#0f2a7a", fg2: "#2f7bff", grad: "linear", angle: 45,
             eyeCustom: false, eyeColor: "#0f2a7a", bg: "#ffffff", transp: false, radius: 10, margin: 3, ecc: "M" },
    logo: { src: "", place: "center", shape: "circle", size: 22, pad: true },
    frame: { kind: "none", title: "Scan me", caption: "", badge: "SCAN ME", c1: "#0b1a2f", c2: "#1b4c82", tc: "#ffffff", showUrl: true },
    px: 1024,
  });

  /** merge saved data over defaults so old saves never break when new options are added */
  function merge(base, extra) {
    if (!extra || typeof extra !== "object") return base;
    for (const k of Object.keys(base)) {
      if (!(k in extra)) continue;
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) merge(base[k], extra[k]);
      else if (typeof extra[k] === typeof base[k]) base[k] = extra[k];
    }
    return base;
  }

  const b64 = {
    enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))),
  };

  /** state -> link that recreates the design (logo image excluded to keep links short) */
  function shareLink(S) {
    const c = clone(S); c.logo.src = ""; c.px = 1024;
    return location.href.split("#")[0].split("?")[0] + "#d=" + b64.enc(JSON.stringify(c));
  }

  function initialState() {
    let S = DEFAULTS();
    const last = ls.get("qrs.last");
    if (last) try { S = merge(S, JSON.parse(last)); } catch {}
    const m = location.hash.match(/#d=([\w-]+)/);
    if (m) try { S = merge(DEFAULTS(), JSON.parse(b64.dec(m[1]))); } catch {}
    const q = new URLSearchParams(location.search);          // e.g. ?url=https://example.com
    for (const t of ["url", "text"]) if (q.get(t)) { S.type = t; S.fields[t][t] = q.get(t); }
    return S;
  }

  const saved = {
    list() { try { return JSON.parse(ls.get("qrs.saved") || "[]"); } catch { return []; } },
    add(name, S) {
      const list = saved.list(); list.unshift({ id: Date.now().toString(36), name, at: Date.now(), state: clone(S) });
      if (!ls.set("qrs.saved", JSON.stringify(list.slice(0, 40)))) { list.forEach(x => x.state.logo.src = ""); return ls.set("qrs.saved", JSON.stringify(list.slice(0, 40))) ? "nologo" : false; }
      return true;
    },
    remove(id) { ls.set("qrs.saved", JSON.stringify(saved.list().filter(x => x.id !== id))); },
    rename(id, name) { ls.set("qrs.saved", JSON.stringify(saved.list().map(x => x.id === id ? { ...x, name } : x))); },
  };

  Q.storage = { ls, DEFAULTS, merge, clone, shareLink, initialState, saved, saveLast: S => ls.set("qrs.last", JSON.stringify(S)) };
})(window.QRS = window.QRS || {});

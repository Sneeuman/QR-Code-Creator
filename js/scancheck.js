/* Scan check: re-reads the finished QR image with a decoder, like a phone would. */
(function (Q) {
  async function check(svg, w, h, expected) {
    const c = await Q.export.toCanvas(svg, w, h, 640, "#ffffff");
    const x = c.getContext("2d"), img = x.getImageData(0, 0, c.width, c.height);
    const read = mode => { try { return jsQR(img.data, img.width, img.height, { inversionAttempts: mode }); } catch { return null; } };   // jsQR can throw when it finds nothing
    let res = read("dontInvert"), inverted = false;
    if (!res) { res = read("onlyInvert"); inverted = !!res; }
    if (!res) return { ok: false };
    return { ok: res.data === expected, inverted, mismatch: res.data !== expected };
  }
  Q.scan = { check };
})(window.QRS = window.QRS || {});

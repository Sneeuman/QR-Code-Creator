/* Thin wrapper around the vendored qrcode-generator library. */
(function (Q) {
  if (window.qrcode && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs["UTF-8"]) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];   // so names like "Müller" or emoji encode correctly
  }
  Q.core = {
    /** Returns { n, version, isDark(r,c), bytes } or throws if the data is too long. */
    matrix(text, ecc) {
      const qr = qrcode(0, ecc || "M");
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      return { n, version: (n - 17) / 4, isDark: (r, c) => qr.isDark(r, c), bytes: new TextEncoder().encode(text).length };
    },
    contrast(a, b) {
      const L = hex => { const m = hex.replace("#", ""); const v = [0, 2, 4].map(i => parseInt(m.substr(i, 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
    },
    luminance(hex) { const m = hex.replace("#", ""); return [0, 2, 4].map(i => parseInt(m.substr(i, 2), 16)).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0) / 255; },
  };
})(window.QRS = window.QRS || {});

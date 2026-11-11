/* Exporting: SVG -> PNG (any size), SVG download, clipboard, and a tiny ZIP writer for bulk. */
(function (Q) {
  const svgBlob = svg => new Blob([svg], { type: "image/svg+xml;charset=utf-8" });

  function toCanvas(svg, w, h, px, bg) {
    return new Promise((resolve, reject) => {
      const scale = Math.min(px, 8192) / w, cw = Math.round(w * scale), ch = Math.round(h * scale);
      const img = new Image(), url = URL.createObjectURL(svgBlob(svg));
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = cw; c.height = ch;
        const x = c.getContext("2d"); if (bg) { x.fillStyle = bg; x.fillRect(0, 0, cw, ch); }
        x.drawImage(img, 0, 0, cw, ch); URL.revokeObjectURL(url); resolve(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("render failed")); };
      img.src = url;
    });
  }
  const png = async (svg, w, h, px) => { const c = await toCanvas(svg, w, h, px); return new Promise(r => c.toBlob(r, "image/png")); };

  function download(blob, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function copyImage(blob) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error("unsupported");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }

  /* ---- minimal ZIP (store, no compression; PNGs are already compressed) ---- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function zip(files) {          // files: [{ name, blob }]
    const te = new TextEncoder(), parts = [], central = []; let off = 0;
    const d = new Date(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dd = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const data = new Uint8Array(await f.blob.arrayBuffer()), name = te.encode(f.name), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, tm, true); lh.setUint16(12, dd, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh.buffer, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, tm, true); ch.setUint16(14, dd, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(ch.buffer, name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, p) => s + (p.byteLength || p.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, end.buffer], { type: "application/zip" });
  }

  Q.export = { toCanvas, png, svgBlob, download, copyImage, zip };
})(window.QRS = window.QRS || {});

# QR Studio

A free, private QR code creator that runs entirely in the browser. Design codes with your own logo, colours and frames, then download them as PNG or SVG. No sign-up, no server, no tracking.

Built with plain HTML, CSS and JavaScript by [Almero Badenhorst](https://sneeuman.github.io/personal-website/).

## Features

**Content types:** website link, plain text, social profile (GitHub, LinkedIn, Instagram, X, TikTok, YouTube, Facebook), Wi-Fi login, contact card (vCard), email, phone call, SMS, WhatsApp chat, map location and calendar event.

**Design**
- 5 patterns: square, rounded, dots, liquid (connected), diamond
- 4 eye frames and 4 eye centres, with an optional separate eye colour
- Solid, linear gradient or radial gradient colours, plus 8 one-click quick looks
- Transparent background, corner roundness and quiet border controls
- Error correction level selector (switches to High automatically when a logo is used)

**Logo and frames**
- Upload your own logo or photo (circle, rounded square or square), or pick a built-in icon
- Profile card frame with your photo on top, a name, a caption and the web address
- "Scan me" badge frame

**Export and sharing**
- PNG at 512, 1024, 2048 or 4096 px, plus vector SVG and copy to clipboard
- **Scan check:** every code is read back by a decoder and you are warned about low contrast, inverted colours, oversized logos and dense codes
- **Bulk mode:** paste a list (or load a CSV) and download a ZIP of images in your current design
- Save designs in the browser and share a design as a link (`#d=…`)
- Pre-fill from the address: `?url=https://example.com`
- Light and dark themes, works on phones, installable and usable offline (PWA)

## Put it online with GitHub Pages

1. Create a new **public** repository, for example `qr-studio`.
2. Upload the contents of this folder so that `index.html` is at the top level of the repository (not inside a subfolder).
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
4. After a minute or two it is live at `https://<your-username>.github.io/<repository-name>/`. For example: `https://sneeuman.github.io/qr-studio/`.

All paths are relative, so it works under any repository name. You can also open `index.html` straight from your computer.

When you publish a change later, bump `VERSION` in `sw.js` (for example `qr-studio-v2`) so returning visitors get the new files.

## Project structure

```
index.html            page structure
css/style.css         themes and layout
js/payloads.js        content types: forms and the text each one encodes
js/qr-core.js         QR matrix wrapper and colour contrast helpers
js/render.js          builds the final SVG (patterns, eyes, gradients, logo, frames)
js/export.js          SVG to PNG, clipboard, and a small ZIP writer
js/storage.js         defaults, saved designs, share links
js/scancheck.js       reads the finished image back to verify it scans
js/main.js            the interface that ties it all together
vendor/               qrcode-generator and jsQR (included so it works offline)
sw.js, manifest.webmanifest, assets/    offline support and app icons
```

The preview, the PNG and the SVG all come from the **same SVG string** built in `render.js`, so what you see is exactly what you download.

## Customising

- **Default look:** edit `DEFAULTS` in `js/storage.js`.
- **Quick looks:** edit the `PRESETS` list in `js/main.js`.
- **New content type:** add an entry to `TYPES` and an icon in `ICONS` in `js/payloads.js`. Give it fields and a `build()` function that returns the text to encode. The interface picks it up automatically.
- **Footer links and name:** `index.html`, at the bottom.

## Good to know

- These are **static** QR codes: the information lives inside the code itself. They never expire and cost nothing, but you cannot change the destination later or count scans.
- Your text, logos and photos never leave your device. Saved designs use the browser's local storage.
- Always test a code with a phone before printing. Keep a logo at 22% or less and print the code at least 2 cm wide.
- Share links contain the design settings but not your logo image, to keep links short.

## Credits and licences

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT)
- [jsQR](https://github.com/cozmo/jsQR) by Cosmo Wolfe (Apache 2.0)
- QR Code is a registered trademark of Denso Wave Incorporated.

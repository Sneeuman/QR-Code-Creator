# QR Maker

A small, self-contained tool that turns a website link into a scannable QR code with your own photo on it. Built for sharing my portfolio, but it works for any link.

Everything runs in the browser. No account, no server, and no image is ever uploaded.

## Features

- Two layouts:
  - **Photo in the middle** of the QR code
  - **Card** with a round profile photo on top, your name and a caption, then the QR code below
- Three QR styles: Rounded, Dots and Square
- Photo shape: circle or rounded square
- Custom QR and background colours (default is deep royal blue)
- Adjustable middle photo size
- One click **Download PNG** (high resolution, 1200 px wide)
- Works offline, because the QR library is built into the file

## How to use

1. Open `qr-maker.html` in any modern browser (Chrome, Edge, Firefox, Safari). Double clicking the file is enough.
2. Check the **Website link** field. It starts as `https://sneeuman.github.io/personal-website/`. Change it if your address is different.
3. Choose your photo with **Your photo**. A square photo with your face in the centre works best.
4. Pick a **Layout** and adjust the style, colours and photo size until you like the preview.
5. Click **Download PNG**. The file is saved as `almero-portfolio-qr.png`.
6. **Test it** with your phone camera before sharing it.

## Tips for a QR code that scans every time

- Keep the middle photo at **22% or smaller**. If a scan fails, lower it with the slider.
- Keep strong contrast: a dark QR colour on a light background works best.
- If a code will not scan, switch the style to **Square**, which is the most reliable.
- A shorter link makes a simpler, easier to scan code.
- Use a static link (like the GitHub Pages address). It never expires.

## Technical notes

- A single HTML file with plain JavaScript and the HTML canvas.
- QR generation uses [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT licence), included inside the file.
- The code uses error correction level **H** (about 30% recovery), which is what allows a photo to sit in the middle and still scan.
- The three corner squares are always drawn solid so scanners lock on quickly, whichever style you choose.
- I verified that the output decodes back to the correct link in all three styles and in the card layout.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| The QR will not scan | Make the middle photo smaller, or use the Square style |
| "That link is too long" message | Use a shorter link |
| The photo looks cut off | Use a squarer photo, or choose the rounded square shape |
| The name and caption do not show | They only appear in the **Card** layout |

## Author

Almero Badenhorst
[GitHub](https://github.com/Sneeuman) · [LinkedIn](https://www.linkedin.com/in/almero-badenhorst-b879a4302/)

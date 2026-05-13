# Local Game Store Pilot flyer

Single-page Letter flyer for outreach to local game store owners during the Loremaster pilot program.

## Build

```sh
node marketing/flyers/lgs-pilot/build.mjs
```

Outputs:
- `dist/loremaster-lgs-pilot.html` — standalone HTML with all assets inlined
- `dist/loremaster-lgs-pilot.pdf` — print-ready Letter PDF

## How it works

`build.mjs` does three things:
1. Generates a QR code for `https://www.askloremaster.com` as a PNG data URL.
2. Rasterizes the gradient SVG headline to a high-resolution PNG (Chromium's print pipeline mangles `url(#id)` SVG fills at certain page offsets, so we bake the headline to pixels).
3. Inlines logo, fonts, and QR as data URLs, then renders to PDF via puppeteer.

## Dependencies

Uses puppeteer + qrcode installed at `/tmp/lm-flyer/`. If missing, run:

```sh
mkdir -p /tmp/lm-flyer && cd /tmp/lm-flyer && npm init -y && npm install puppeteer qrcode
```

## Editing

- Edit `flyer.html` directly. You can preview by opening it in a browser (paths to fonts/logo are relative to the repo's `public/`).
- The gradient headline is defined inline as SVG; `build.mjs` rasterizes it during build.

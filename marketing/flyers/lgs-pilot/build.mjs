#!/usr/bin/env node
// Build the LGS pilot flyer: generate QR, inline assets, render PDF via puppeteer.
// Usage: node marketing/flyers/lgs-pilot/build.mjs

import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const flyerHtmlPath = join(__dirname, "flyer.html");
const outDir = join(__dirname, "dist");
const outPdf = join(outDir, "loremaster-lgs-pilot.pdf");
const outHtml = join(outDir, "loremaster-lgs-pilot.html");

const PUPPETEER_DIR = "/tmp/lm-flyer";

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) =>
      code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`)),
    );
    p.on("error", rej);
  });
}

async function generateQrDataUrl(url) {
  // Use qrcode module from /tmp/lm-flyer if present; otherwise install on the fly.
  const qrModuleDir = "/tmp/lm-flyer/node_modules/qrcode";
  let QRCode;
  try {
    QRCode = (await import(qrModuleDir + "/lib/index.js")).default;
  } catch {
    // fallback: spawn npx
    await run("npm", ["install", "--silent", "qrcode"], { cwd: "/tmp/lm-flyer" });
    QRCode = (await import(qrModuleDir + "/lib/index.js")).default;
  }
  return QRCode.toDataURL(url, {
    margin: 0,
    scale: 10,
    color: { dark: "#0a090c", light: "#fefdfa" },
    errorCorrectionLevel: "M",
  });
}

async function fileToDataUrl(filePath, mime) {
  const buf = await readFile(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function rasterizeHeadline() {
  const puppeteer = (
    await import(`${PUPPETEER_DIR}/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js`)
  ).default;
  const loraNormal = await fileToDataUrl(
    join(repoRoot, "public/fonts/lora-latin-normal.woff2"),
    "font/woff2",
  );
  const loraItalic = await fileToDataUrl(
    join(repoRoot, "public/fonts/lora-latin-italic.woff2"),
    "font/woff2",
  );
  // Render at 4x (1920×504) for crisp print at 8.5in width / ~6.4in headline area
  const W = 1920, H = 504;
  const stage = `<!doctype html><html><head><style>
    @font-face { font-family: "Lora"; font-style: italic; font-weight: 700; src: url("${loraItalic}") format("woff2"); }
    @font-face { font-family: "Lora"; font-style: normal; font-weight: 700; src: url("${loraNormal}") format("woff2"); }
    html, body { margin: 0; padding: 0; background: transparent; }
    body { width: ${W}px; height: ${H}px; }
    svg { display: block; width: 100%; height: 100%; }
  </style></head><body>
    <svg viewBox="0 0 640 168" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#daa040"/>
          <stop offset="30%" stop-color="#daa040"/>
          <stop offset="55%" stop-color="#d47070"/>
          <stop offset="80%" stop-color="#daa040"/>
          <stop offset="100%" stop-color="#daa040"/>
        </linearGradient>
      </defs>
      <text text-anchor="middle" font-family="Lora, Georgia, serif" font-style="italic" font-weight="700" font-size="68" fill="url(#g)" letter-spacing="-0.3">
        <tspan x="320" y="64">Stop taking notes.</tspan>
        <tspan x="320" y="140">Stay in the story.</tspan>
      </text>
    </svg>
  </body></html>`;
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.setContent(stage, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const png = await page.screenshot({ omitBackground: true, type: "png" });
    return `data:image/png;base64,${png.toString("base64")}`;
  } finally {
    await browser.close();
  }
}

async function main() {
  await run("mkdir", ["-p", outDir]);

  console.log("→ Generating QR code");
  const qrDataUrl = await generateQrDataUrl("https://www.askloremaster.com");

  console.log("→ Inlining logo");
  const logoDataUrl = await fileToDataUrl(
    join(repoRoot, "public/static/loremaster-logo.png"),
    "image/png",
  );

  console.log("→ Inlining fonts");
  const fontFiles = {
    "familjen-grotesk-latin-normal": "public/fonts/familjen-grotesk-latin-normal.woff2",
    "familjen-grotesk-latin-italic": "public/fonts/familjen-grotesk-latin-italic.woff2",
    "literata-latin-normal": "public/fonts/literata-latin-normal.woff2",
    "literata-latin-italic": "public/fonts/literata-latin-italic.woff2",
    "lora-latin-normal": "public/fonts/lora-latin-normal.woff2",
    "lora-latin-italic": "public/fonts/lora-latin-italic.woff2",
  };
  const fontDataUrls = {};
  for (const [key, path] of Object.entries(fontFiles)) {
    try {
      fontDataUrls[key] = await fileToDataUrl(join(repoRoot, path), "font/woff2");
    } catch (e) {
      console.warn(`  ! missing font: ${path} — will fall back`);
      fontDataUrls[key] = null;
    }
  }

  console.log("→ Rasterizing headline SVG via puppeteer");
  const headlinePng = await rasterizeHeadline();

  console.log("→ Reading flyer HTML");
  let html = await readFile(flyerHtmlPath, "utf8");

  // Replace the inline headline SVG with a PNG <img>
  html = html.replace(
    /<svg\s+viewBox="0 0 640 168"[\s\S]*?<\/svg>/,
    `<img src="${headlinePng}" alt="Stop taking notes. Stay in the story." style="width: 100%; height: auto; display: block;" />`,
  );

  // Replace QR placeholder
  html = html.replace(
    /id="qr"\s+alt="QR code to askloremaster\.com"\s+src=""/,
    `id="qr" alt="QR code to askloremaster.com" src="${qrDataUrl}"`,
  );

  // Replace logo src
  html = html.replace(
    /src="\.\.\/\.\.\/\.\.\/public\/static\/loremaster-logo\.png"/g,
    `src="${logoDataUrl}"`,
  );

  // Replace each font url with a data URL when available
  for (const [key, dataUrl] of Object.entries(fontDataUrls)) {
    if (!dataUrl) continue;
    const re = new RegExp(
      `url\\("\\.\\./\\.\\./\\.\\./public/fonts/${key}\\.woff2"\\)`,
      "g",
    );
    html = html.replace(re, `url("${dataUrl}")`);
  }

  await writeFile(outHtml, html);
  console.log(`→ Wrote inlined HTML: ${outHtml}`);

  console.log("→ Rendering PDF via puppeteer");
  const puppeteer = (
    await import(`${PUPPETEER_DIR}/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js`)
  ).default;
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${outHtml}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await page.evaluateHandle("document.fonts.ready");
    await page.pdf({
      path: outPdf,
      format: "Letter",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }

  console.log(`\n✓ Built flyer:\n  HTML: ${outHtml}\n  PDF:  ${outPdf}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

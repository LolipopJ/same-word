import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Resvg } from "@resvg/resvg-js";

import { messages } from "../src/client/i18n/messages.ts";

const fontPath = process.argv[2];
if (!fontPath)
  throw new Error(
    "Pass a Noto Sans SC font file: pnpm build:images /path/to/NotoSansSC-Regular.otf",
  );
await access(fontPath);
const font = {
  fontFiles: [resolve(fontPath)],
  loadSystemFonts: false,
  defaultFontFamily: "Noto Sans SC",
};
const publicDir = new URL("../src/client/public/", import.meta.url);
const icon = await readFile(new URL("icon.svg", publicDir), "utf8");
for (const [name, size] of [
  ["icon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
]) {
  const png = new Resvg(icon, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
  await writeFile(new URL(name, publicDir), png);
  console.log(`${name}: ${size}×${size}`);
}

function escape(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}
const t = messages.zh;
const lines = t.home.heroDescription.match(/.{1,30}/gu);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#24173b" />
  <image href="data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}" x="64" y="56" width="112" height="112" />
  <g font-family="Noto Sans SC" fill="#fff7ed">
    <text x="204" y="134" font-size="56" font-weight="700">${escape(t.app.brand)}</text>
    <text x="76" y="280" font-size="76" font-weight="700">${escape(t.home.heroLineOne + t.home.heroLineTwo)}</text>
    ${lines.map((line, index) => `<text x="80" y="${380 + index * 48}" font-size="30">${escape(line)}</text>`).join("\n")}
    <text x="80" y="570" font-size="24" fill="#c4b5fd">${escape(messages.en.app.brand)}</text>
  </g>
</svg>`;
const image = new Resvg(svg, { font }).render().asPng();
await writeFile(new URL("og-image.png", publicDir), image);
console.log("og-image.png: 1200×630 (Noto Sans SC)");

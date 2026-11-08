// Bundles the game into dist/: index.html (script and font inlined) and assets/audio (music and sound effects).
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";

const out = await build({ entryPoints: ["src/main.js"], bundle: true, minify: true, format: "iife", write: false, charset: "utf8" });
const js = out.outputFiles[0].text;
const font = readFileSync("assets/Galmuri11-Bold.woff2").toString("base64");
let html = readFileSync("index.html", "utf8")
  .replace('url("assets/Galmuri11-Bold.woff2")', `url(data:font/woff2;base64,${font})`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
// the sounds stay as files next to the page (loaded on demand)
rmSync("dist/assets", { recursive: true, force: true });
cpSync("assets/audio", "dist/assets/audio", { recursive: true });
console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} KB`);

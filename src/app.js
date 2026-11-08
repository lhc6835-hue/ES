// emojibox's screens: the title with its pixel logo, the map list, the new-map form, saving and the
// emoji-tile wipe that moves between them.
import { view, sprite, THEMES } from "./render.js";
import { world, DEFS, spawn, resize } from "./game.js";
import { sfx } from "./audio.js";

// ---------------------------------------------------------------- map shapes

export const RATIOS = [
  { id: "16:9", w: 16, h: 9 }, { id: "21:9", w: 21, h: 9 }, { id: "3:2", w: 3, h: 2 }, { id: "4:3", w: 4, h: 3 },
  { id: "1:1", w: 1, h: 1 }, { id: "3:4", w: 3, h: 4 }, { id: "9:16", w: 9, h: 16 },
];
// sizes by area, so every ratio of one size holds about as much
export const SIZES = [
  { id: "s", name: "작게", area: 46000 },
  { id: "m", name: "보통", area: 78000 },
  { id: "l", name: "크게", area: 130000 },
  { id: "xl", name: "아주 크게", area: 220000 },
];
/** The longest a map may be either way: 4 times wider than tall, or 4 times taller than wide. */
export const MAX_RATIO = 4;
/** A ratio from a preset id or a custom "w:h" string, kept within 1:4 to 4:1. */
export function parseRatio(id) {
  const p = RATIOS.find((q) => q.id === id);
  if (p) return { w: p.w, h: p.h, preset: true };
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(String(id));
  const w = m ? +m[1] : 16, h = m ? +m[2] : 9;
  return { w: w > 0 ? w : 1, h: h > 0 ? h : 1, preset: false };
}
export function dims(ratioId, sizeId) {
  const r = parseRatio(ratioId), s = SIZES.find((q) => q.id === sizeId) ?? SIZES[1];
  const k = Math.max(1 / MAX_RATIO, Math.min(MAX_RATIO, r.w / r.h)), W = Math.round(Math.sqrt(s.area * k)), H = Math.round(W / k);
  return { W, H };
}

// ---------------------------------------------------------------- storage

const KEY = "emojibox.maps.v1";
export function loadMaps() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function storeMaps(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; }
}
export function deleteMap(id) { return storeMaps(loadMaps().filter((m) => m.id !== id)); }

// what of an emoji survives a save: where it is, how it moves, and its clocks
const KEEP = ["x", "y", "vx", "vy", "a", "va", "size", "hp", "mass", "face", "life", "fuse", "grow", "hatch", "lay", "pull", "drop", "open",
  "dry", "poo", "cd", "nap", "giant", "baseSize", "baseMass", "charged", "heading", "burnTime", "dir"];
export function snapshot() {
  return world.ents.filter((e) => !e.dead && !e.held).map((e) => {
    const o = { t: e.type };
    for (const k of KEEP) if (typeof e[k] === "number" && isFinite(e[k])) o[k] = Math.round(e[k] * 100) / 100;
    return o;
  });
}
export function restore(list) {
  for (const o of list ?? []) {
    if (!DEFS[o.t]) continue;
    const e = spawn(o.t, o.x, o.y);
    if (!e) continue;
    for (const k of KEEP) if (typeof o[k] === "number") e[k] = o[k];
    resize(e);
  }
}
/** A small picture of the map for its card. */
export function thumbnail(canvas) {
  const k = Math.min(1, 200 / canvas.width), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(canvas.width * k));
  c.height = Math.max(1, Math.round(canvas.height * k));
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = k < 1;
  x.drawImage(canvas, 0, 0, c.width, c.height);
  try { return c.toDataURL("image/webp", 0.8); } catch { return c.toDataURL(); }
}
export function saveMap(map, canvas) {
  const list = loadMaps();
  const rec = { ...map, ents: snapshot(), water: Math.round(world.water * 10) / 10, thumb: thumbnail(canvas), updated: Date.now() };
  const i = list.findIndex((m) => m.id === map.id);
  if (i >= 0) list[i] = rec; else list.unshift(rec);
  return storeMaps(list) ? rec : null;
}
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------------------------------------------------------------- the logo

// chunky lowercase glyphs, 10 rows: 2 for ascenders, 6 for the body, 2 for descenders
const GLYPHS = {
  e: ["......", "......", ".####.", "##..##", "######", "##....", "##..##", ".####.", "......", "......"],
  m: ["........", "........", "#######.", "##.##.##", "##.##.##", "##.##.##", "##.##.##", "##.##.##", "........", "........"],
  j: ["..##", "....", "..##", "..##", "..##", "..##", "..##", "..##", "#.##", ".##."],
  i: ["##", "..", "##", "##", "##", "##", "##", "##", "..", ".."],
  b: ["##....", "##....", "#####.", "##..##", "##..##", "##..##", "##..##", "#####.", "......", "......"],
  x: ["......", "......", "##..##", "##..##", ".####.", ".####.", "##..##", "##..##", "......", "......"],
};
const WORD = ["e", "m", "😀", "j", "i", "b", "📦", "x"];
const FACES = ["😀", "😆", "😜", "😎", "🤩", "😋"];
const SLOT = 9, GAP = 2, DEPTH = 3, PAD = 3;
const RAMP = ["#fff6c0", "#fff6c0", "#ffe25a", "#ffd23a", "#ffbe2e", "#ffa424", "#ff8a1e", "#f26a1a", "#e2541a", "#e2541a"];
const SIDE = ["#a83a14", "#8a2c14", "#6a2014"], INK = "#1a1420";

const logoW = () => WORD.reduce((w, ch) => w + (GLYPHS[ch] ? GLYPHS[ch][0].length : SLOT), 0) + GAP * (WORD.length - 1) + PAD * 2 + DEPTH;
const LH = 10 + PAD * 2 + DEPTH + 3;

/** Draw the emojibox logo into a canvas at logo pixels (scale it up with CSS). t: seconds, for the wave. */
export function drawLogo(canvas, t) {
  const W = logoW(), H = LH;
  if (canvas.width !== W) { canvas.width = W; canvas.height = H; }
  const x = canvas.getContext("2d");
  x.clearRect(0, 0, W, H);
  // where each glyph pixel lands, with a wave running through the letters
  const fill = new Int8Array(W * H).fill(-1), depth = new Int8Array(W * H);
  const slots = [];
  let cx = PAD;
  WORD.forEach((ch, i) => {
    const dy = Math.round(Math.sin(t * 3.2 - i * 0.7) * 1.4) + 1;
    const g = GLYPHS[ch];
    if (!g) { slots.push({ ch, x: cx, y: PAD + 2 + dy, i }); cx += SLOT + GAP; return; }
    g.forEach((row, ry) => [...row].forEach((c, rx) => {
      if (c !== "#") return;
      const px = cx + rx, py = PAD + ry + dy;
      fill[py * W + px] = ry;
      for (let k = 1; k <= DEPTH; k++) { const j = (py + k) * W + px + k; if (j < W * H && fill[j] < 0) depth[j] = Math.max(depth[j], k); }
    }));
    cx += g[0].length + GAP;
  });
  const img = x.createImageData(W, H), d32 = new Uint32Array(img.data.buffer);
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); };
  const ink = hex(INK);
  for (let i = 0; i < W * H; i++) {
    if (fill[i] >= 0) d32[i] = hex(RAMP[fill[i]]);
    else if (depth[i] > 0) d32[i] = hex(SIDE[depth[i] - 1]);
  }
  // ink outline around letters and their extrusion
  const solid = (i) => fill[i] >= 0 || depth[i] > 0;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (solid(i)) continue;
      if ((px > 0 && solid(i - 1)) || (px < W - 1 && solid(i + 1)) || (py > 0 && solid(i - W)) || (py < H - 1 && solid(i + W))) d32[i] = ink;
    }
  x.putImageData(img, 0, 0);
  // the two o's are emoji: a face that keeps changing its mind, and a box
  for (const s of slots) {
    const ch = s.ch === "😀" ? FACES[Math.floor(t / 1.1) % FACES.length] : s.ch;
    const sp = sprite(ch, 8);
    const wob = s.ch === "📦" ? Math.round(Math.sin(t * 6) * 0.6) : 0;
    // centred on the letters' body (rows 2 to 7)
    x.drawImage(sp.canvas, s.x + Math.round((SLOT - sp.w) / 2) + wob, s.y + Math.round((6 - sp.h) / 2));
  }
}

// ---------------------------------------------------------------- the wipe

// emoji tiles pop in along a diagonal until the screen is covered, the screen changes underneath, and they
// pop out the same way
const WIPE_COLORS = ["#ffcf4a", "#ff7ab0", "#5ad1ff", "#9a7bff", "#7be07b", "#ff9a4a"];
const WIPE_EMOJI = ["😀", "🦖", "🐔", "💣", "🔥", "🎈", "🐸", "🍕", "🌀", "🚀", "🐧", "⚡", "🧊", "🍄", "🎁", "🐝"];
let wiping = false;
export function wipe(mid) {
  if (wiping) { mid?.(); return Promise.resolve(); }
  wiping = true;
  const cv = document.getElementById("wipe"), x = cv.getContext("2d");
  const P = 3, w = Math.ceil(innerWidth / P), h = Math.ceil(innerHeight / P);
  cv.width = w; cv.height = h;
  cv.style.display = "block";
  const C = Math.max(14, Math.round(Math.min(w, h) / 9)), cols = Math.ceil(w / C) + 1, rows = Math.ceil(h / C) + 1;
  const tiles = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      tiles.push({ c, r, col: WIPE_COLORS[(c * 3 + r * 5) % WIPE_COLORS.length], ch: WIPE_EMOJI[(c * 7 + r * 11 + ((Math.random() * 3) | 0)) % WIPE_EMOJI.length], j: Math.random() * 0.05 });
  const IN = 0.5, HOLD = 0.1, OUT = 0.5, POP = 0.2;
  const back = (p) => { const s = 1.70158; return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };
  const t0 = performance.now();
  let switched = false;
  sfx("whoosh", { rate: 0.9 });
  return new Promise((resolve) => {
    const tick = (now) => {
      const t = (now - t0) / 1000;
      x.clearRect(0, 0, w, h);
      const out = t > IN + HOLD;
      if (!switched && t >= IN) { switched = true; mid?.(); sfx("whoosh", { rate: 1.2, vol: 0.7, gap: 0 }); }
      for (const q of tiles) {
        const delay = ((q.c + q.r) / (cols + rows)) * (IN - POP) + q.j;
        let p = out ? 1 - Math.min(1, Math.max(0, (t - IN - HOLD - delay) / POP)) : Math.min(1, Math.max(0, (t - delay) / POP));
        if (p <= 0) continue;
        const s = out ? p * p : back(p), size = Math.round(C * s) + 1;
        const cx = q.c * C + C / 2, cy = q.r * C + C / 2;
        x.fillStyle = INK;
        x.fillRect(Math.round(cx - size / 2) - 1, Math.round(cy - size / 2) - 1, size + 2, size + 2);
        x.fillStyle = q.col;
        x.fillRect(Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
        if (s > 0.55) {
          const sp = sprite(q.ch, Math.round(C * 0.62));
          x.drawImage(sp.canvas, Math.round(cx - sp.w / 2), Math.round(cy - sp.h / 2));
        }
      }
      if (t < IN + HOLD + OUT + 0.06) requestAnimationFrame(tick);
      else { cv.style.display = "none"; wiping = false; resolve(); }
    };
    requestAnimationFrame(tick);
  });
}

// ---------------------------------------------------------------- small UI helpers

export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("on"), 1800);
}

/** A modal with a message and buttons; resolves with the chosen button's value (null when dismissed). */
export function ask(title, body, buttons) {
  const el = document.getElementById("modal");
  el.innerHTML = "";
  const box = document.createElement("div");
  box.className = "box";
  const h = document.createElement("h3"); h.textContent = title; box.appendChild(h);
  if (body) { const p = document.createElement("p"); p.textContent = body; box.appendChild(p); }
  const row = document.createElement("div"); row.className = "row";
  box.appendChild(row);
  el.appendChild(box);
  el.classList.add("on");
  return new Promise((resolve) => {
    const done = (v) => { el.classList.remove("on"); resolve(v); };
    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.className = "btn " + (b.kind ?? "");
      btn.textContent = b.label;
      btn.onclick = () => done(b.value);
      row.appendChild(btn);
    }
    el.onclick = (ev) => { if (ev.target === el) done(null); };
  });
}

export function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "방금";
  if (s < 3600) return Math.floor(s / 60) + "분 전";
  if (s < 86400) return Math.floor(s / 3600) + "시간 전";
  return Math.floor(s / 86400) + "일 전";
}

export { THEMES, view };

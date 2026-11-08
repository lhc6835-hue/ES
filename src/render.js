// Drawing: emoji turned into crisp pixel sprites, the backdrop, and the bridge to pixelfx effects.
import { createFrame, clearFrame, createFx } from "../vendor/pixelfx/core/fx.js";

export const view = { W: 320, H: 200, S: 3, ground: 180 };

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
const OUTLINE = 0xff20141a; // ABGR: #1a1420

// ---------------------------------------------------------------- emoji sprites

const sprites = new Map();

/**
 * An emoji drawn at `size` px, alpha snapped to on/off and given a one-pixel dark outline, so it reads as
 * pixel art next to the effects. { canvas, w, h, actor } where actor is the shape pixelfx status effects wrap.
 */
export function sprite(ch, size, tint = "") {
  const key = ch + "|" + size + "|" + tint;
  let s = sprites.get(key);
  if (s) return s;
  const pad = Math.ceil(size * 0.5), N = size + pad * 2;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.font = `${size}px ${EMOJI_FONT}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(ch, N / 2, N / 2 + size * 0.06);
  const src = x.getImageData(0, 0, N, N), d = src.data;
  // snap alpha, find the bounds
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let i = 0; i < N * N; i++) {
    const a = d[i * 4 + 3];
    if (a < 96) { d[i * 4 + 3] = 0; continue; }
    // un-premultiplied colors come back from getImageData; just make it opaque
    d[i * 4 + 3] = 255;
    const px = i % N, py = (i / N) | 0;
    if (px < x0) x0 = px; if (px > x1) x1 = px;
    if (py < y0) y0 = py; if (py > y1) y1 = py;
  }
  if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 1; } // the font has no such emoji: an empty sprite
  // crop with a one-pixel border for the outline
  const w = x1 - x0 + 3, h = y1 - y0 + 3;
  const px32 = new Uint32Array(w * h), mask = new Uint8Array(w * h);
  const s32 = new Uint32Array(d.buffer);
  for (let yy = 0; yy < h - 2; yy++)
    for (let xx = 0; xx < w - 2; xx++) {
      const v = s32[(y0 + yy) * N + x0 + xx];
      if (v >>> 24) px32[(yy + 1) * w + xx + 1] = v;
    }
  // tints
  if (tint) for (let i = 0; i < px32.length; i++) if (px32[i]) px32[i] = tintPx(px32[i], tint);
  // outline: empty pixels touching the body
  const body = px32.slice();
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx;
      if (body[i]) { mask[i] = 1; continue; }
      if ((xx > 0 && body[i - 1]) || (xx < w - 1 && body[i + 1]) || (yy > 0 && body[i - w]) || (yy < h - 1 && body[i + w])) {
        px32[i] = OUTLINE;
        mask[i] = 1;
      }
    }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ox = out.getContext("2d");
  const img = ox.createImageData(w, h);
  new Uint32Array(img.data.buffer).set(px32);
  ox.putImageData(img, 0, 0);
  const m = { w, h, data: mask };
  const actor = { mask: m, pixels: px32, x: -Math.floor(w / 2), y: -h, w, h, k: 2, head: [0, -h], chest: [0, -Math.round(h * 0.55)] };
  s = { canvas: out, w, h, actor };
  sprites.set(key, s);
  return s;
}

function tintPx(v, tint) {
  let r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
  if (tint === "flash") r = g = b = 255;
  else if (tint === "burnt") { r *= 0.35; g *= 0.3; b *= 0.3; }
  else if (tint === "ghost") { const l = (r + g + b) / 3; r = l * 0.8 + 40; g = l * 0.85 + 40; b = l + 50; }
  else if (tint === "red") { r = Math.min(255, r * 0.6 + 140); g *= 0.5; b *= 0.5; }
  return (0xff << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
}

// ---------------------------------------------------------------- backdrop

let bg = null;
export function buildBackdrop() {
  const { W, H, ground } = view;
  bg = document.createElement("canvas");
  bg.width = W;
  bg.height = H;
  const x = bg.getContext("2d");
  // sky in hard bands
  const sky = ["#2a2a5c", "#33407a", "#3f5a96", "#4f78ae", "#6496c2", "#7fb2d2", "#a2cede"];
  const band = Math.ceil(ground / sky.length);
  sky.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * band, W, band + 1); });
  // dither between bands
  for (let i = 1; i < sky.length; i++)
    for (let xx = 0; xx < W; xx += 2) {
      x.fillStyle = sky[i - 1];
      x.fillRect(xx + (i % 2), i * band, 1, 1);
      x.fillStyle = sky[i];
      x.fillRect(xx + ((i + 1) % 2), i * band - 1, 1, 1);
    }
  // stars in the top band
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  x.fillStyle = "#c8d4ff";
  for (let i = 0; i < W / 12; i++) x.fillRect((rnd() * W) | 0, (rnd() * band * 1.5) | 0, 1, 1);
  // clouds
  const cloud = (cx, cy, s) => {
    x.fillStyle = "#e8f2f8";
    for (let i = 0; i < 5; i++) {
      const r = s * (0.5 + rnd() * 0.5), ox = (i - 2) * s * 0.7;
      disc(x, cx + ox, cy - r * 0.3, r);
    }
    x.fillStyle = "#c2d6e6";
    x.fillRect(cx - s * 1.8, cy + 1, s * 3.6, 2);
  };
  for (let i = 0; i < Math.max(2, W / 110); i++) cloud(rnd() * W, ground * (0.2 + rnd() * 0.35), 5 + rnd() * 5);
  // far hills
  const hill = (base, amp, freq, col, ph) => {
    x.fillStyle = col;
    for (let xx = 0; xx < W; xx++) {
      const y = base - amp * (0.5 + 0.5 * Math.sin(xx * freq + ph)) - amp * 0.3 * Math.sin(xx * freq * 2.7 + ph * 2);
      x.fillRect(xx, Math.round(y), 1, ground - Math.round(y));
    }
  };
  hill(ground - 8, 22, 0.021, "#5c8ca0", 1.3);
  hill(ground - 2, 14, 0.034, "#4a7a6a", 4.1);
  // ground: grass lip, dirt, pebbles
  x.fillStyle = "#3f8a3a";
  x.fillRect(0, ground, W, 3);
  x.fillStyle = "#6cc04a";
  x.fillRect(0, ground, W, 1);
  x.fillStyle = "#6a4a3a";
  x.fillRect(0, ground + 3, W, H - ground - 3);
  x.fillStyle = "#553a30";
  for (let yy = ground + 5; yy < H; yy += 2) for (let xx = (yy % 4) / 2; xx < W; xx += 4) if (rnd() < 0.35) x.fillRect(xx, yy, 1, 1);
  x.fillStyle = "#8a6a52";
  for (let i = 0; i < W / 8; i++) x.fillRect((rnd() * W) | 0, ground + 4 + ((rnd() * (H - ground - 5)) | 0), 2, 1);
  // grass tufts
  x.fillStyle = "#6cc04a";
  for (let i = 0; i < W / 6; i++) { const gx = (rnd() * W) | 0; x.fillRect(gx, ground - 1, 1, 1); if (rnd() < 0.4) x.fillRect(gx + 1, ground - 2, 1, 2); }
  // the walls: a dark frame so it's clear things bounce off the sides
  x.fillStyle = "#1a1420";
  x.fillRect(0, 0, 1, H);
  x.fillRect(W - 1, 0, 1, H);
}
function disc(x, cx, cy, r) {
  for (let yy = -r; yy <= r; yy++) {
    const w = Math.sqrt(r * r - yy * yy);
    x.fillRect(Math.round(cx - w), Math.round(cy + yy), Math.round(w * 2), 1);
  }
}
export const drawBackdrop = (ctx) => bg && ctx.drawImage(bg, 0, 0);

// ---------------------------------------------------------------- pixelfx bridge

let frames = null, cc, lc, cctx, lctx, cimg, limg, c32, l32;
const live = [];

export function resizeFx() {
  const { W, H } = view;
  frames = { back: createFrame(W, H), front: createFrame(W, H) };
  cc = document.createElement("canvas");
  lc = document.createElement("canvas");
  cc.width = lc.width = W;
  cc.height = lc.height = H;
  cctx = cc.getContext("2d");
  lctx = lc.getContext("2d");
  cimg = cctx.createImageData(W, H);
  limg = lctx.createImageData(W, H);
  c32 = new Uint32Array(cimg.data.buffer);
  l32 = new Uint32Array(limg.data.buffer);
}

let seedN = 1;
/**
 * Play an effect. follow: a function returning {x, y, flip} each frame (or null when the effect should end),
 * so status effects ride on the creature they belong to.
 */
export function fx(mod, o = {}, follow = null) {
  const inst = createFx(mod, { seed: (seedN = (seedN * 48271) % 2147483647) % 100000, ...o });
  inst.follow = follow;
  live.push(inst);
  return inst;
}
export const fxCount = () => live.length;
export function clearFx() { live.length = 0; }

export function updateFx(dt) {
  for (let i = live.length - 1; i >= 0; i--) {
    const f = live[i];
    if (f.follow) {
      const p = f.follow();
      if (!p) { f.follow = null; f.stop(); }
      else { f.options.x = Math.round(p.x); f.options.y = Math.round(p.y); if (p.flip !== undefined) f.options.flip = p.flip; }
    }
    f.update(Math.min(dt, 0.05));
    if (f.done()) live.splice(i, 1);
  }
}

export function drawFx(ctx, which) {
  if (!frames || !live.length) return;
  const fr = frames[which];
  clearFrame(fr);
  for (const f of live) f.draw(fr, which);
  const C = fr.color, L = fr.light, n = C.length;
  let anyC = false, anyL = false;
  for (let i = 0; i < n; i++) {
    const c = C[i];
    c32[i] = c;
    if (c) anyC = true;
    const l = L[i] & 0xffffff;
    if (l) { l32[i] = l | 0xff000000; anyL = true; } else l32[i] = 0;
  }
  if (anyC) { cctx.putImageData(cimg, 0, 0); ctx.drawImage(cc, 0, 0); }
  if (anyL) {
    lctx.putImageData(limg, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(lc, 0, 0);
    ctx.restore();
  }
}

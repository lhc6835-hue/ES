// Placed blocks: emoji tiles fixed to a grid that everything stands on, bumps into and builds with. Each kind
// has a trait (burns, shatters, sticks, bounces, explodes...). They live outside world.ents, in a grid map, so
// hundreds of them stay cheap.
import { view, sprite, fx } from "./render.js";
import { FX } from "./effects.js";
import { sfx } from "./audio.js";
import { world, DEFS, HOOK, ignite, explode, emote, waterTop, rnd, pick } from "./game.js";

export const G = 12; // cell size in world pixels

export const BLOCKS = {
  bBrick: { ch: "🧱", name: "벽돌", hp: 1, breakAt: 0.35, sound: "rock", info: "기본 블럭. 쌓아서 벽이나 집을 지어요. 폭발에는 부서져요." },
  bWood: { ch: "🪵", name: "나무", hp: 1, breakAt: 0.25, sound: "wood", burns: true, info: "불이 붙으면 활활 타고, 옆 나무 블럭으로 번져요." },
  bGlass: { ch: "🪟", name: "유리", hp: 1, breakAt: 0.02, sound: "glass", glass: true, info: "투명해요. 세게 부딪히거나 폭발하면 와장창 깨져요." },
  bDiamond: { ch: "💎", name: "다이아", hp: 1, breakAt: 9, sound: "glass", info: "절대 안 부서져요. 폭발도, 망치도 소용없어요." },
  bHoney: { ch: "🍯", name: "꿀", hp: 1, breakAt: 0.3, sound: "squish", sticky: true, info: "끈적끈적! 닿은 건 달라붙어 느릿느릿해져요." },
  bBouncy: { ch: "🛟", name: "탱탱", hp: 1, breakAt: 0.4, sound: "pluck", bouncy: true, info: "트램펄린! 위에 떨어지면 높이 튕겨 올라가요." },
  bTnt: { ch: "🧨", name: "폭죽", hp: 1, breakAt: 0.01, sound: "wood", tnt: true, info: "불·번개·폭발에 닿으면 펑! 옆 폭죽도 줄줄이 터져요." },
  bGrass: { ch: "🟩", name: "잔디", hp: 1, breakAt: 0.3, sound: "thud", grass: true, info: "위에 심은 🌱 새싹이 쑥쑥 빨리 자라요." },
};

// blocks join the palette as tools: press to place, drag to paint a line
for (const [k, b] of Object.entries(BLOCKS)) DEFS[k] = { ch: b.ch, name: b.name + " 블럭", tool: true, block: true, brush: 0.016, info: b.info };

world.blocks = new Map(); // "cx,row" -> { t, cx, row, burn, fuse }
const key = (cx, row) => cx + "," + row;
const cols = () => Math.floor(view.W / G);
const rows = () => Math.floor(view.ground / G);
/** The cell under a point: column from the left wall, row counted up from the floor. */
export const cellAt = (x, y) => ({ cx: Math.floor(x / G), row: Math.floor((view.ground - y) / G) });
const box = (b) => ({ x0: b.cx * G, x1: b.cx * G + G, y0: view.ground - (b.row + 1) * G, y1: view.ground - b.row * G });
const center = (b) => ({ x: b.cx * G + G / 2, y: view.ground - b.row * G - G / 2 });
export const blockAt = (x, y) => { const c = cellAt(x, y); return world.blocks.get(key(c.cx, c.row)); };

export function placeBlock(t, cx, row, quiet = false) {
  if (cx < 0 || row < 0 || cx >= cols() || row >= rows() || !BLOCKS[t]) return false;
  const k = key(cx, row), old = world.blocks.get(k);
  if (old && old.t === t) return false;
  if (world.blocks.size >= 2000 && !old) return false;
  world.blocks.set(k, { t, cx, row, burn: 0, fuse: 0 });
  if (!quiet) sfx(BLOCKS[t].sound, { x: cx * G, vol: 0.45, gap: 0.04, rate: 1.15 });
  return true;
}

export function removeBlock(b, how = "break") {
  if (!world.blocks.delete(key(b.cx, b.row))) return;
  const c = center(b), d = BLOCKS[b.t];
  if (how === "quiet") return;
  // crumbs in the block's colours
  const s = sprite(d.ch, G);
  for (let i = 0; i < 8; i++) world.parts.push({ x: c.x + rnd(-5, 5), y: c.y + rnd(-5, 5), vx: rnd(-70, 70), vy: rnd(-140, -30), life: rnd(0.4, 0.8), c: pick(d.glass ? ["#d8f4ff", "#9bdcff", "#ffffff"] : sampleColors(s)), g: 1 });
  if (how === "break") sfx(d.glass ? "shatter" : d.sound, { x: c.x, gap: 0.03 });
}
const colorCache = new Map();
function sampleColors(s) {
  if (colorCache.has(s)) return colorCache.get(s);
  const out = [];
  for (let i = 0; i < s.actor.pixels.length; i += 7) {
    const v = s.actor.pixels[i];
    if (v >>> 24 && (v & 0xffffff) !== 0x1a1420 && (v & 0xffffff) !== 0x20141a) out.push("#" + [(v & 255), (v >> 8) & 255, (v >> 16) & 255].map((n) => n.toString(16).padStart(2, "0")).join(""));
  }
  const res = out.length ? out : ["#888"];
  colorCache.set(s, res);
  return res;
}

// ---------------------------------------------------------------- painting

/** The block tools: place along the drag, cell by cell, with no gaps however fast the finger moves. */
function paint(t) {
  return (x, y, p) => {
    const c = cellAt(x, y);
    const from = p.lastCell && p.down ? p.lastCell : c;
    let { cx: x0, row: y0 } = from;
    const x1 = c.cx, y1 = c.row, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) {
      placeBlock(t, x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    p.lastCell = c;
  };
}
export function blockTools(TOOLS) {
  for (const t of Object.keys(BLOCKS)) TOOLS[t] = paint(t);
  // the eraser and the hammer work on blocks too
  const erase = TOOLS.eraser, hammer = TOOLS.hammer;
  TOOLS.eraser = (x, y, p) => {
    const b = blockAt(x, y);
    if (!b) return erase(x, y, p);
    removeBlock(b, "quiet");
    sfx("erase", { x, gap: 0.04 });
    const c = center(b);
    fx(FX.poof, { x: Math.round(c.x), y: Math.round(c.y + G / 2), light: 0.3 });
  };
  TOOLS.hammer = (x, y, p) => {
    hammer(x, y, p);
    const b = blockAt(x, y);
    if (!b) return;
    if (b.t === "bDiamond") { sfx("glass", { x, rate: 1.5 }); return; }
    if (b.t === "bTnt") { light(b, 0.1); return; }
    removeBlock(b);
  };
}

// ---------------------------------------------------------------- physics

/** Push a round thing out of any block it overlaps, bounce it, and let it stand on top. */
function collide(e, dt) {
  if (e.type === "ghost" || e.type === "hole" || e.type === "cloud" || e.type === "storm" || !world.blocks.size) return;
  const c0 = Math.floor((e.x - e.r) / G), c1 = Math.floor((e.x + e.r) / G);
  const r0 = Math.floor((view.ground - (e.y + e.r)) / G), r1 = Math.floor((view.ground - (e.y - e.r)) / G);
  for (let cx = c0; cx <= c1; cx++)
    for (let row = Math.max(0, r0); row <= r1; row++) {
      const b = world.blocks.get(key(cx, row));
      if (!b) continue;
      const { x0, x1, y0, y1 } = box(b);
      const px = Math.max(x0, Math.min(e.x, x1)), py = Math.max(y0, Math.min(e.y, y1));
      let dx = e.x - px, dy = e.y - py, d = Math.hypot(dx, dy);
      if (d >= e.r) continue;
      let nx, ny, pen;
      if (d < 0.001) {
        // the centre is inside: leave by the nearest side
        const l = e.x - x0, r = x1 - e.x, t = e.y - y0, bt = y1 - e.y, m = Math.min(l, r, t, bt);
        [nx, ny] = m === t ? [0, -1] : m === bt ? [0, 1] : m === l ? [-1, 0] : [1, 0];
        pen = m + e.r;
      } else { nx = dx / d; ny = dy / d; pen = e.r - d; }
      e.x += nx * pen;
      e.y += ny * pen;
      const vn = e.vx * nx + e.vy * ny;
      const d2 = BLOCKS[b.t];
      if (ny < -0.5) e.onGround = true;
      if (vn < 0) {
        const hit = -vn;
        e.impact = Math.max(e.impact ?? 0, hit);
        if (d2.glass && hit > 330) { removeBlock(b); continue; }
        if (d2.tnt && hit > 420) light(b, 0.2);
        if (d2.bouncy && ny < -0.5) {
          // trampoline
          e.vy = -Math.max(300, hit * 1.05);
          e.vx *= 0.9;
          if (e.d.creature && Math.random() < 0.5) emote(e, pick(["😆", "🤸", "🎉"]));
          sfx("pluck", { x: e.x, rate: 0.6, gap: 0.08 });
          continue;
        }
        const bounce = d2.bouncy ? 0.9 : Math.max(e.d.bounce ?? 0.15, 0.1);
        e.vx -= (1 + bounce) * vn * nx;
        e.vy -= (1 + bounce) * vn * ny;
      }
      if (d2.sticky) {
        const k = Math.exp(-9 * dt);
        e.vx *= k; e.vy *= k; e.va *= k;
        if (e.d.creature && Math.random() < dt * 0.8) emote(e, "🍯");
      }
      if (d2.grass && e.type === "sprout") e.grow -= dt;
      if (b.burn > 0 && e.d.burn && Math.random() < dt * 3) ignite(e, 3);
    }
}

function light(b, t) {
  if (b.fuse > 0) return;
  b.fuse = t;
}

// ---------------------------------------------------------------- what happens to them

function step(dt) {
  if (!world.blocks.size) return;
  const top = waterTop();
  for (const b of [...world.blocks.values()]) {
    if (b.fuse > 0) {
      b.fuse -= dt;
      if (Math.random() < dt * 30) { const c = center(b); world.parts.push({ x: c.x + rnd(-3, 3), y: c.y - 5, vx: rnd(-20, 20), vy: rnd(-60, -20), life: 0.3, c: pick(["#ffe26b", "#ff8a2a"]), g: 0.3 }); }
      if (b.fuse <= 0) {
        removeBlock(b, "quiet");
        const c = center(b);
        explode({ x: c.x, y: c.y, r: G / 2, dead: false }, 46);
      }
      continue;
    }
    if (b.burn > 0) {
      b.burn -= dt;
      const c = center(b);
      // under water it goes out
      if (world.water > 0.5 && c.y > top) { b.burn = 0; continue; }
      if (Math.random() < dt * 14) world.parts.push({ x: c.x + rnd(-5, 5), y: c.y - rnd(0, 6), vx: rnd(-10, 10), vy: rnd(-50, -25), life: rnd(0.3, 0.7), c: pick(["#ffc23d", "#ff8a2a", "#ffe26b", "#f2561d"]), g: -0.03 });
      b.spread = (b.spread ?? 0.5) - dt;
      if (b.spread <= 0) {
        b.spread = 0.5;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = world.blocks.get(key(b.cx + dx, b.row + dy));
          if (n && Math.random() < 0.45) burnBlock(n);
        }
        // and it warms whatever sits on or against it
        for (const o of world.ents) if (!o.dead && Math.abs(o.x - c.x) < G / 2 + o.r + 2 && Math.abs(o.y - c.y) < G / 2 + o.r + 2) ignite(o, 3);
      }
      if (b.burn <= 0) { removeBlock(b, "quiet"); fx(FX.poof, { x: Math.round(c.x), y: Math.round(c.y + G / 2), palette: ["#3a3440", "#5a5060", "#7a7080", "#9a90a0", "#b8b0c0"], light: 0 }); }
    }
  }
}

function burnBlock(b) {
  const d = BLOCKS[b.t];
  if (d.tnt) return light(b, rnd(0.15, 0.4));
  if (!d.burns || b.burn > 0) return;
  b.burn = rnd(5, 7);
  sfx("fire", { x: b.cx * G, gap: 0.2, vol: 0.7 });
}

/** A blast: blocks near the middle break (each kind has its own toughness), fireworks go off. */
function blast(x, y, R) {
  for (const b of [...world.blocks.values()]) {
    const c = center(b), d = Math.hypot(c.x - x, c.y - y);
    if (d > R + G / 2) continue;
    const f = 1 - Math.min(1, d / (R + G / 2)), D = BLOCKS[b.t];
    if (D.tnt) { light(b, 0.12 + rnd(0, 0.15)); continue; }
    if (f > D.breakAt) removeBlock(b);
    else if (D.burns && f > 0.1) burnBlock(b);
  }
}

/** Lightning hits the highest block in its column. */
function strike(x) {
  const cx = Math.floor(x / G);
  let top = null;
  for (const b of world.blocks.values()) if (b.cx === cx && (!top || b.row > top.row)) top = b;
  if (!top) return;
  const D = BLOCKS[top.t];
  if (D.glass) removeBlock(top);
  else if (D.tnt || D.burns) burnBlock(top);
}

/** Fire on the ground lights wood and fireworks next to it. */
function fireNear(e) {
  const c = cellAt(e.x, e.y + e.r - 1);
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const b = world.blocks.get(key(c.cx + dx, c.row + dy));
      if (b) burnBlock(b);
    }
}

/** A black hole eats the blocks near its middle. */
function hole(e) {
  const R = 6 + e.pull * 6;
  for (const b of [...world.blocks.values()]) {
    const c = center(b);
    if (Math.hypot(c.x - e.x, c.y - e.y) < R + G / 2 && Math.random() < 0.08) {
      if (b.t === "bDiamond") continue;
      removeBlock(b, "quiet");
      sfx("portal", { x: e.x, rate: 1.8, vol: 0.4, gap: 0.12 });
    }
  }
}

Object.assign(HOOK, {
  collide, step, explode: blast, strike, fire: fireNear, hole,
  clear: () => world.blocks.clear(),
});

// ---------------------------------------------------------------- drawing, saving

export function drawBlocks(ctx) {
  if (!world.blocks.size) return;
  const t = world.t;
  for (const b of world.blocks.values()) {
    const D = BLOCKS[b.t], s = sprite(D.ch, G);
    const { x0, y0 } = box(b);
    let ox = 0;
    if (b.fuse > 0) ox = Math.round(Math.sin(t * 60) * 1);
    if (D.glass) ctx.globalAlpha = 0.72;
    ctx.drawImage(s.canvas, x0 + Math.round((G - s.w) / 2) + ox, y0 + Math.round((G - s.h) / 2));
    ctx.globalAlpha = 1;
    if (b.burn > 0) {
      ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.sin(t * 20 + b.cx) * 40)},40,${0.35 + 0.15 * Math.sin(t * 13 + b.row)})`;
      ctx.fillRect(x0 + 1, y0 + 1, G - 2, G - 2);
    }
  }
}

/** Where a block would go, for the cursor. */
export function drawGhost(ctx, x, y, t) {
  const c = cellAt(x, y);
  if (c.cx < 0 || c.row < 0 || c.cx >= cols() || c.row >= rows()) return;
  const s = sprite(BLOCKS[t].ch, G), x0 = c.cx * G, y0 = view.ground - (c.row + 1) * G;
  ctx.globalAlpha = 0.45;
  ctx.drawImage(s.canvas, x0 + Math.round((G - s.w) / 2), y0 + Math.round((G - s.h) / 2));
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "#fff6c0";
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, G - 1, G - 1);
  ctx.globalAlpha = 1;
}

export const saveBlocks = () => [...world.blocks.values()].map((b) => [b.t, b.cx, b.row]);
export function loadBlocks(list) {
  world.blocks.clear();
  for (const [t, cx, row] of list ?? []) placeBlock(t, cx, row, true);
}
/** After the map changes size: drop blocks that no longer fit. */
export function trimBlocks() {
  for (const b of [...world.blocks.values()]) if (b.cx >= cols() || b.row >= rows()) world.blocks.delete(key(b.cx, b.row));
}

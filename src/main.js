// Emoji Sandbox: the loop, drawing the world, touch and mouse input, and the toolbar.
import { view, sprite, buildBackdrop, drawBackdrop, resizeFx, updateFx, drawFx, fx, clearFx } from "./render.js";
import { world, DEFS, PALETTE, spawn, step, strike, entityAt, emote, clearWorld, flipOf } from "./game.js";
import { FX } from "./effects.js";

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const ui = {
  tabs: document.getElementById("tabs"),
  items: document.getElementById("items"),
  hint: document.getElementById("hint"),
  count: document.getElementById("count"),
  pause: document.getElementById("pause"),
  slow: document.getElementById("slow"),
  clear: document.getElementById("clear"),
  panel: document.getElementById("panel"),
};

const state = { tab: 0, sel: "person", paused: false, slow: false };

// ---------------------------------------------------------------- sizing

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const panelH = ui.panel.getBoundingClientRect().height;
  const S = vw < 700 ? 2 : vw < 1500 ? 3 : 4;
  const W = Math.max(160, Math.floor(vw / S)), H = Math.max(140, Math.floor((vh - panelH) / S));
  const oldW = view.W, oldG = view.ground;
  Object.assign(view, { W, H, S, ground: H - 14 });
  cv.width = W;
  cv.height = H;
  cv.style.width = W * S + "px";
  cv.style.height = H * S + "px";
  ctx.imageSmoothingEnabled = false;
  buildBackdrop();
  resizeFx();
  for (const e of world.ents) {
    e.x = Math.min(e.x * (W / oldW), W - e.r);
    e.y = Math.min(e.y + (view.ground - oldG), view.ground - e.r);
  }
}

// ---------------------------------------------------------------- drawing

const LAYER = { tree: 0, sprout: 1, skull: 2, fried: 2, leg: 2, apple: 2, egg: 2, rock: 3, ice: 3, bomb: 3, water: 6, balloon: 5, ghost: 7, bee: 6, hero: 6 };

function drawEnt(e) {
  const d = e.d;
  if (d.hidden) return;
  let tint = "";
  if (e.hurt > 0.08) tint = "flash";
  else if (e.type === "bomb" && e.fuse < 1.6 && Math.sin(world.t * (8 + (1.6 - e.fuse) * 22)) > 0.2) tint = "red";
  const s = sprite(d.ch, e.size, tint);
  const flip = flipOf(e);
  // a hop every few frames while walking, a peck for the chicken
  let bob = 0;
  if (d.creature && e.onGround && !e.tumble && Math.abs(e.vx) > 8 && !(e.frozen > 0)) bob = Math.floor(e.t * 10) % 2 ? -1 : 0;
  if (d.fly && !e.tumble) bob = Math.round(Math.sin(e.t * 6 + e.id) * 1.2);
  const step = Math.PI / 8;
  let a = Math.round(e.a / step) * step;
  if (e.peck > 0) a = (flip ? 1 : -1) * 0.4;
  if (e.held && d.creature) a = Math.sin(world.t * 18) * 0.25;
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y) + bob);
  if (a) ctx.rotate(a);
  if (flip) ctx.scale(-1, 1);
  if (e.type === "ghost") ctx.globalAlpha = 0.55 + 0.25 * Math.sin(world.t * 3 + e.id);
  if (e.type === "skull" && e.life < 1.5) ctx.globalAlpha = Math.max(0, e.life / 1.5);
  ctx.drawImage(s.canvas, -Math.floor(s.w / 2), -Math.floor(s.h / 2));
  ctx.restore();
  // bomb fuse spark
  if (e.type === "bomb") {
    const sx = e.x + Math.cos(e.a - 1.0) * e.r * 1.05, sy = e.y + Math.sin(e.a - 1.0) * e.r * 1.05;
    ctx.fillStyle = Math.sin(world.t * 40) > 0 ? "#fff07a" : "#ff8a2a";
    ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    if (Math.random() < 0.6) ctx.fillRect(Math.round(sx + (Math.random() - 0.5) * 4), Math.round(sy - Math.random() * 3), 1, 1);
  }
}

function drawString(b) {
  const c = b.carry;
  if (!c) return;
  const x0 = b.x, y0 = b.y + b.r, x1 = c.x, y1 = c.y - c.h / 2 + 1;
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  ctx.fillStyle = "#e8e0d8";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * 2), Math.round(y0 + (y1 - y0) * t), 1, 1);
  }
}

function drawEmote(e) {
  if (!e.emote || e.d.hidden) return;
  const s = sprite(e.emote.ch, 12);
  const age = e.emote.T - e.emote.t, pop = age < 0.08 ? 2 : 0;
  const bw = s.w + 4, bh = s.h + 3;
  const x = Math.round(e.x - bw / 2), y = Math.round(e.y - e.h / 2 - bh - 5) - pop;
  if (e.emote.t < 0.15 && Math.floor(e.emote.t * 40) % 2) return; // blink out
  // a little speech bubble
  ctx.fillStyle = "#1a1420";
  ctx.fillRect(x + 1, y - 1, bw - 2, bh + 2);
  ctx.fillRect(x - 1, y + 1, bw + 2, bh - 2);
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(x + 1, y, bw - 2, bh);
  ctx.fillRect(x, y + 1, bw, bh - 2);
  ctx.fillRect(Math.round(e.x) - 1, y + bh, 3, 1);
  ctx.fillRect(Math.round(e.x), y + bh + 1, 1, 1);
  ctx.fillStyle = "#1a1420";
  ctx.fillRect(Math.round(e.x) - 2, y + bh, 1, 1);
  ctx.fillRect(Math.round(e.x) + 2, y + bh, 1, 1);
  ctx.fillRect(Math.round(e.x) - 1, y + bh + 1, 1, 1);
  ctx.fillRect(Math.round(e.x) + 1, y + bh + 1, 1, 1);
  ctx.fillRect(Math.round(e.x), y + bh + 2, 1, 1);
  ctx.drawImage(s.canvas, x + 2, y + 1);
}

function draw() {
  const { W, H, S } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sh = world.shake > 0.5 ? world.shake : 0;
  const ox = Math.round((Math.random() - 0.5) * sh), oy = Math.round((Math.random() - 0.5) * sh);
  ctx.translate(ox, oy);
  drawBackdrop(ctx);
  drawFx(ctx, "back");
  const ents = world.ents.slice().sort((a, b) => (LAYER[a.type] ?? 4) - (LAYER[b.type] ?? 4));
  for (const e of ents) if (e.type === "balloon") drawString(e);
  for (const e of ents) drawEnt(e);
  drawFx(ctx, "front");
  for (const e of ents) drawEmote(e);
  // brush cursor
  if (pointer.inside && !pointer.down && matchMedia("(hover: hover)").matches) {
    const s = sprite(DEFS[state.sel].ch, 9);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(s.canvas, Math.round(pointer.x - s.w / 2), Math.round(pointer.y - s.h / 2));
    ctx.globalAlpha = 1;
  }
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,255,240,${Math.min(0.7, world.flash * 6)})`;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
  if (state.paused) {
    ctx.fillStyle = "rgba(10,8,20,0.35)";
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
}

// ---------------------------------------------------------------- input

const pointer = { x: 0, y: 0, vx: 0, vy: 0, down: false, inside: false, held: null, brushT: 0, lastT: 0 };

function toWorld(ev) {
  const r = cv.getBoundingClientRect();
  return [(ev.clientX - r.left) / view.S, (ev.clientY - r.top) / view.S];
}

function place(type, x, y) {
  const d = DEFS[type];
  if (type === "lightning") return strike(x);
  if (type === "eraser") {
    const e = entityAt(x, y, 6);
    if (e) {
      e.dead = true;
      fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.4 });
    }
    return;
  }
  const brush = !!d.brush;
  const e = spawn(type, x + (brush ? (Math.random() - 0.5) * 6 : 0), Math.min(y, view.ground - 4));
  if (!e) return;
  if (!brush || type === "fire") fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.4 });
  if (type === "water") e.vy = 60;
  if (type === "dino") emote(e, "💢", 1.4);
}

cv.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  cv.setPointerCapture(ev.pointerId);
  const [x, y] = toWorld(ev);
  Object.assign(pointer, { x, y, vx: 0, vy: 0, down: true, inside: true, lastT: performance.now(), brushT: 0 });
  const tool = DEFS[state.sel].tool;
  if (!tool) {
    const e = entityAt(x, y, 2);
    if (e && !e.d.hidden) {
      pointer.held = e;
      pointer.grab = [e.x - x, e.y - y];
      e.held = true;
      e.carried = null;
      if (e.d.creature) emote(e, e.type === "dino" ? "💢" : "😨");
      return;
    }
  }
  place(state.sel, x, y);
  pointer.brushT = DEFS[state.sel].brush ?? Infinity;
});
cv.addEventListener("pointermove", (ev) => {
  const [x, y] = toWorld(ev);
  const now = performance.now(), dt = Math.max(1, now - pointer.lastT) / 1000;
  if (pointer.down) {
    pointer.vx = pointer.vx * 0.5 + ((x - pointer.x) / dt) * 0.5;
    pointer.vy = pointer.vy * 0.5 + ((y - pointer.y) / dt) * 0.5;
  }
  Object.assign(pointer, { x, y, lastT: now, inside: true });
});
const release = () => {
  if (!pointer.down) return;
  pointer.down = false;
  const e = pointer.held;
  if (e) {
    e.held = false;
    const sp = Math.hypot(pointer.vx, pointer.vy), k = sp > 900 ? 900 / sp : 1;
    // a stale velocity from a pause before letting go is not a throw
    const fresh = performance.now() - pointer.lastT < 80;
    e.vx = fresh ? pointer.vx * k : 0;
    e.vy = fresh ? pointer.vy * k : 0;
    if (e.d.creature && sp * k > 200 && fresh) { e.tumble = true; emote(e, "😱"); }
    if (e.d.roll) e.va = e.vx / e.r;
  }
  pointer.held = null;
};
cv.addEventListener("pointerup", release);
cv.addEventListener("pointercancel", release);
cv.addEventListener("pointerleave", () => (pointer.inside = false));

function updatePointer(dt) {
  const e = pointer.held;
  if (e) {
    if (e.dead) { pointer.held = null; return; }
    const tx = Math.max(e.r, Math.min(view.W - e.r, pointer.x + pointer.grab[0]));
    const ty = Math.max(e.r, Math.min(view.ground - e.r, pointer.y + pointer.grab[1]));
    e.vx = (tx - e.x) / Math.max(dt, 1 / 120);
    e.vy = (ty - e.y) / Math.max(dt, 1 / 120);
    e.x = tx;
    e.y = ty;
    if (performance.now() - pointer.lastT > 80) { pointer.vx *= 0.8; pointer.vy *= 0.8; }
    return;
  }
  if (pointer.down) {
    const b = DEFS[state.sel].brush;
    if (!b) return;
    pointer.brushT -= dt;
    if (pointer.brushT <= 0) {
      pointer.brushT = b;
      place(state.sel, pointer.x, pointer.y);
    }
  }
}

// keyboard: 1-8 picks from the tab, Tab/Q/E switch tabs, Space pauses
addEventListener("keydown", (ev) => {
  if (ev.key === " ") { togglePause(); ev.preventDefault(); return; }
  if (ev.key === "q" || ev.key === "Q") return selectTab((state.tab + PALETTE.length - 1) % PALETTE.length);
  if (ev.key === "e" || ev.key === "E" || ev.key === "Tab") { ev.preventDefault(); return selectTab((state.tab + 1) % PALETTE.length); }
  const n = parseInt(ev.key, 10);
  if (n >= 1 && n <= 9) { const it = PALETTE[state.tab].items[n - 1]; if (it) select(it); }
});

// ---------------------------------------------------------------- toolbar

function selectTab(i) {
  state.tab = i;
  ui.tabs.querySelectorAll("button").forEach((b, j) => b.classList.toggle("on", j === i));
  ui.items.innerHTML = "";
  for (const [k, type] of PALETTE[i].items.entries()) {
    const d = DEFS[type];
    const b = document.createElement("button");
    b.className = "item" + (state.sel === type ? " on" : "");
    b.innerHTML = `<span class="em">${d.ch}</span><span class="nm">${d.name}</span><span class="key">${k + 1}</span>`;
    b.onclick = () => select(type);
    b.dataset.type = type;
    ui.items.appendChild(b);
  }
}
function select(type) {
  state.sel = type;
  ui.items.querySelectorAll(".item").forEach((b) => b.classList.toggle("on", b.dataset.type === type));
  const d = DEFS[type];
  ui.hint.innerHTML = `<b>${d.ch} ${d.name}</b> ${d.info}`;
}
function togglePause() {
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "▶️" : "⏸️";
}
PALETTE.forEach((p, i) => {
  const b = document.createElement("button");
  b.textContent = p.tab;
  b.onclick = () => selectTab(i);
  ui.tabs.appendChild(b);
});
ui.pause.onclick = togglePause;
ui.slow.onclick = () => { state.slow = !state.slow; ui.slow.classList.toggle("on", state.slow); };
ui.clear.onclick = () => { clearWorld(); clearFx(); };

// ---------------------------------------------------------------- go

let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.slow) dt *= 0.3;
  updatePointer(dt);
  if (!state.paused) {
    step(dt);
    updateFx(dt);
  }
  draw();
  ui.count.textContent = world.ents.filter((e) => e.d.creature).length + " 마리 · " + world.ents.length + " 개";
  requestAnimationFrame(frame);
}

function starter() {
  const { W, ground } = view;
  spawn("tree", W * 0.78, ground - 20);
  spawn("person", W * 0.3, ground - 10);
  spawn("person", W * 0.45, ground - 10);
  spawn("dog", W * 0.38, ground - 10);
  spawn("chicken", W * 0.62, ground - 10);
  spawn("bee", W * 0.8, ground - 50);
  for (let i = 0; i < 3; i++) spawn("apple", W * 0.15 + i * 9, ground - 30 - i * 12);
}

async function boot() {
  try { await document.fonts.load('12px "Galmuri11"'); } catch {}
  selectTab(0);
  select("person");
  resize();
  addEventListener("resize", resize);
  starter();
  requestAnimationFrame(frame);
}
boot();

// for automated checks
window.__sandbox = { world, spawn, state, select, strike, view };

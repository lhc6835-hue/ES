// emojibox: the loop, drawing the world, touch and mouse input, the toolbar, and moving between screens.
import { view, sprite, buildBackdrop, drawBackdrop, resizeFx, updateFx, drawFx, fx, clearFx, THEMES } from "./render.js";
import { world, DEFS, spawn, step, strike, entityAt, emote, clearWorld, flipOf } from "./game.js";
import { RATIOS, SIZES, dims, parseRatio, MAX_RATIO, loadMaps, deleteMap, saveMap, restore, newId, drawLogo, wipe, toast, ask, ago } from "./app.js";
import { PALETTE, TOOLS } from "./more.js";
import { drawBlocks, drawGhost, blockTools, saveBlocks, loadBlocks, trimBlocks } from "./blocks.js";
blockTools(TOOLS);
import { FX } from "./effects.js";
import { sfx, music, unlock, loopSound, prefs, setPref } from "./audio.js";

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
  stage: document.getElementById("stage"),
  logo: document.getElementById("logo"),
};

const state = { tab: 0, sel: "person", paused: false, slow: false };
/** Which screen is up (title, maps, new, game) and the map being played. */
const app = { screen: "title", map: null, form: null };

// ---------------------------------------------------------------- sizing

/** The world behind the menus fills the window. */
function demoDims() {
  const vw = innerWidth, vh = innerHeight, S = vw < 700 ? 2 : vw < 1500 ? 3 : 4;
  return { W: Math.max(160, Math.floor(vw / S)), H: Math.max(140, Math.floor(vh / S)) };
}

/** Make the world W x H with a theme; what's already in it keeps its place relative to the floor. */
function setWorld(W, H, theme = "day") {
  const oldW = view.W, oldG = view.ground;
  Object.assign(view, { W, H, ground: H - 14, theme });
  cv.width = W;
  cv.height = H;
  ctx.imageSmoothingEnabled = false;
  buildBackdrop();
  resizeFx();
  for (const e of world.ents) {
    e.x = Math.max(e.r, Math.min(e.x * (W / oldW), W - e.r));
    e.y = Math.max(e.r, Math.min(e.y + (view.ground - oldG), view.ground - e.r));
  }
  world.water = Math.min(world.water, view.ground * 0.75);
  trimBlocks();
  fit();
}

/** Scale the world to the space it has: whole pixels when that wastes little room, otherwise exactly fitted. */
function fit() {
  const r = ui.stage.getBoundingClientRect();
  const pad = app.screen === "game" ? 8 : 0;
  const k = app.screen === "game" ? Math.min((r.width - pad) / view.W, (r.height - pad) / view.H) : Math.max(r.width / view.W, r.height / view.H);
  const ki = Math.floor(k);
  const S = ki >= 1 && ki / k > 0.86 ? ki : k;
  view.S = S;
  cv.style.width = Math.round(view.W * S) + "px";
  cv.style.height = Math.round(view.H * S) + "px";
}

function onResize() {
  if (app.map) fit();
  else { const d = demoDims(); setWorld(d.W, d.H, "day"); }
}

// ---------------------------------------------------------------- drawing

const LAYER = { volcano: 0, cloud: 8, storm: 8, tornado: 5, ufo: 7, dragon: 7, meteor: 7, rocket: 6, hole: 0, tree: 0, sprout: 1, skull: 2, fried: 2, leg: 2, apple: 2, egg: 2, rock: 3, ice: 3, bomb: 3, water: 6, balloon: 5, ghost: 7, bee: 6, hero: 6 };

function drawEnt(e) {
  const d = e.d;
  let tint = "";
  if (e.hurt > 0.08) tint = "flash";
  else if (e.type === "bomb" && e.fuse < 1.6 && Math.sin(world.t * (8 + (1.6 - e.fuse) * 22)) > 0.2) tint = "red";
  let size = e.size;
  if (e.type === "hole") size = Math.round(e.size * e.pull * (e.life < 0.6 ? Math.max(0.2, e.life / 0.6) : Math.min(1, e.t * 5)));
  if (e.type === "fire") size = e.size + (Math.floor(e.t * 7) % 3) - 1 - (e.life < 2 ? Math.round((2 - e.life) * 3) : 0);
  if (e.type === "fire" || e.type === "hole") glow(e, size);
  const s = sprite(d.ch, Math.max(4, size), tint);
  const flip = flipOf(e);
  // a hop every few frames while walking, a peck for the chicken
  let bob = 0;
  if (d.creature && e.onGround && !e.tumble && Math.abs(e.vx) > 8 && !(e.frozen > 0)) bob = Math.floor(e.t * 10) % 2 ? -1 : 0;
  if (d.fly && !e.tumble) bob = Math.round(Math.sin(e.t * 6 + e.id) * 1.2);
  const step = Math.PI / 8;
  let a = Math.round(e.a / step) * step;
  if (e.peck > 0) a = (flip ? 1 : -1) * 0.4;
  if (e.slide > 0) a = e.face * Math.PI / 2; // belly slide
  if (e.napping > 0) bob = 1;
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

// a soft pool of light behind fire, a dark halo behind the black hole
function glow(e, size) {
  const fire = e.type === "fire", R = size * (fire ? 1.4 : 1.3) + (fire ? Math.sin(world.t * 13 + e.id) * 1.5 : 0);
  const g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, R);
  g.addColorStop(0, fire ? "rgba(255,170,60,0.45)" : "rgba(20,6,40,0.75)");
  g.addColorStop(1, fire ? "rgba(255,120,40,0)" : "rgba(60,20,110,0)");
  ctx.save();
  if (fire) ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.fillRect(Math.round(e.x - R), Math.round(e.y - R), Math.ceil(R * 2), Math.ceil(R * 2));
  ctx.restore();
}

// the pool: see-through blue over everything in it, a bright rippling surface line, glints
function drawWater() {
  if (world.water < 0.3) return;
  const { W, ground } = view, top = ground - world.water, t = world.t;
  for (let x = 0; x < W; x++) {
    const y = Math.round(top + Math.sin(x * 0.19 + t * 2.6) * 0.7 + Math.sin(x * 0.067 - t * 1.6) * 0.9);
    if (y >= ground) continue;
    ctx.fillStyle = "rgba(36,104,200,0.42)";
    ctx.fillRect(x, y + 1, 1, ground - y - 1);
    ctx.fillStyle = "rgba(20,60,150,0.25)";
    if (ground - y > 6) ctx.fillRect(x, ground - Math.min(4, (ground - y) >> 2), 1, Math.min(4, (ground - y) >> 2));
    ctx.fillStyle = "rgba(200,240,255,0.9)";
    ctx.fillRect(x, y, 1, 1);
    if (((x * 7 + Math.floor(t * 3)) % 23) === 0 && ground - y > 4) { ctx.fillStyle = "rgba(220,245,255,0.6)"; ctx.fillRect(x, y + 2, 2, 1); }
  }
}

function drawBeam(u) {
  const c = u.carry, top = u.y + u.h * 0.3, bot = Math.max(c.y + c.h / 2, top + 4), w0 = u.w * 0.25, w1 = Math.max(c.w * 0.7, w0 + 6);
  ctx.save();
  ctx.globalAlpha = 0.28 + 0.08 * Math.sin(world.t * 20);
  ctx.fillStyle = "#8affb0";
  ctx.beginPath();
  ctx.moveTo(u.x - w0, top); ctx.lineTo(u.x + w0, top); ctx.lineTo(u.x + w1, bot); ctx.lineTo(u.x - w1, bot);
  ctx.fill();
  ctx.restore();
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
  if (!e.emote) return;
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

function draw(clean = false) {
  const { W, H, S } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sh = world.shake > 0.5 ? world.shake : 0;
  const ox = Math.round((Math.random() - 0.5) * sh), oy = Math.round((Math.random() - 0.5) * sh);
  ctx.translate(ox, oy);
  drawBackdrop(ctx);
  drawFx(ctx, "back");
  drawBlocks(ctx);
  const ents = world.ents.slice().sort((a, b) => (LAYER[a.type] ?? 4) - (LAYER[b.type] ?? 4));
  for (const e of ents) if (e.type === "balloon") drawString(e);
  for (const e of ents) if (e.type === "ufo" && e.carry) drawBeam(e);
  for (const e of ents) drawEnt(e);
  drawWater();
  for (const q of world.parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  drawFx(ctx, "front");
  for (const e of ents) drawEmote(e);
  // brush cursor
  if (!clean && app.screen === "game" && pointer.inside && DEFS[state.sel].block && matchMedia("(hover: hover)").matches) drawGhost(ctx, pointer.x, pointer.y, state.sel);
  else if (!clean && app.screen === "game" && pointer.inside && !pointer.down && matchMedia("(hover: hover)").matches) {
    const s = sprite(DEFS[state.sel].ch, 9);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(s.canvas, Math.round(pointer.x - s.w / 2), Math.round(pointer.y - s.h / 2));
    ctx.globalAlpha = 1;
  }
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,255,240,${Math.min(0.7, world.flash * 6)})`;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
  if (!clean && state.paused && app.screen === "game") {
    ctx.fillStyle = "rgba(10,8,20,0.35)";
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
}

// ---------------------------------------------------------------- input

const pointer = { x: 0, y: 0, vx: 0, vy: 0, down: false, inside: false, held: null, brushT: 0, lastT: 0 };

function toWorld(ev) {
  const r = cv.getBoundingClientRect();
  return [((ev.clientX - r.left) * view.W) / r.width, ((ev.clientY - r.top) * view.H) / r.height];
}

function place(type, x, y) {
  const d = DEFS[type];
  if (d.tool) return TOOLS[type]?.(x, y, pointer);
  const brush = !!d.brush;
  const e = spawn(type, x + (brush ? (Math.random() - 0.5) * 6 : 0), Math.min(y, view.ground - 4));
  if (!e) return;
  if (!brush || type === "fire") fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.4 });
  if (!brush) sfx(type === "dino" || type === "dragon" ? "heavy" : "place", { x: e.x, rate: e.size > 24 ? 0.7 : 1 });
  if (type === "dino") sfx("roar", { x: e.x, rate: 0.8, gap: 0.5 });
  if (type === "dragon") sfx("growl", { x: e.x, gap: 0.5 });
  if (type === "zombie") sfx("zombie", { x: e.x, vol: 0.8, gap: 0.5 });
  if (type === "hole") sfx("portal", { x: e.x, rate: 0.8 });
  if (type === "ufo") sfx("beam", { x: e.x, rate: 0.7 });
  if (type === "water") e.vy = 60;
  if (type === "dino") emote(e, "💢", 1.4);
}

cv.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  if (app.screen !== "game") return;
  cv.setPointerCapture(ev.pointerId);
  const [x, y] = toWorld(ev);
  Object.assign(pointer, { x, y, vx: 0, vy: 0, down: true, inside: true, lastT: performance.now(), brushT: 0, lastCell: null });
  const tool = DEFS[state.sel].tool;
  if (!tool) {
    const e = entityAt(x, y, 2);
    if (e) {
      pointer.held = e;
      pointer.grab = [e.x - x, e.y - y];
      e.held = true;
      e.carried = null;
      if (e.d.creature) emote(e, e.type === "dino" ? "💢" : "😨");
      sfx("grab", { x: e.x });
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
    if (fresh && sp * k > 250) sfx("throw", { x: e.x, vol: Math.min(1, (sp * k) / 700) });
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
  if (app.screen !== "game" || ev.target.tagName === "INPUT" || document.getElementById("modal").classList.contains("on")) return;
  if (ev.key === "Escape") return openMenu();
  if (ev.key === " ") { togglePause(); ev.preventDefault(); return; }
  if (ev.key === "q" || ev.key === "Q") return selectTab((state.tab + PALETTE.length - 1) % PALETTE.length);
  if (ev.key === "e" || ev.key === "E" || ev.key === "Tab") { ev.preventDefault(); return selectTab((state.tab + 1) % PALETTE.length); }
  const n = parseInt(ev.key, 10);
  if (n >= 1 && n <= 9) { const it = PALETTE[state.tab].items[n - 1]; if (it) select(it); }
});

// ---------------------------------------------------------------- toolbar

function selectTab(i) {
  if (state.tab !== i) sfx("click");
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
function select(type, quiet) {
  if (!quiet && state.sel !== type) sfx("tick");
  state.sel = type;
  ui.items.querySelectorAll(".item").forEach((b) => b.classList.toggle("on", b.dataset.type === type));
  const d = DEFS[type];
  ui.hint.innerHTML = `<b>${d.ch} ${d.name}</b> ${d.info}`;
}
function togglePause() {
  sfx("click");
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
ui.slow.onclick = () => {
  sfx("click"); state.slow = !state.slow; ui.slow.classList.toggle("on", state.slow); };
ui.clear.onclick = async () => {
  const ok = await ask("모두 지울까요?", "맵 위의 이모지와 물이 전부 사라져요.", [{ label: "지우기", value: true, kind: "danger" }, { label: "취소", value: false, kind: "ghost" }]);
  if (ok) { clearWorld(); clearFx(); }
};

// ---------------------------------------------------------------- screens

function show(screen) {
  app.screen = screen;
  music("title"); // the title track plays everywhere, in the menus and in every map
  document.body.dataset.screen = screen;
  if (screen === "title") document.getElementById("map-count").textContent = loadMaps().length ? ` · ${loadMaps().length}개` : "";
  fit();
}

/** Leave the map being played (if any) for the menus, with the world behind them filling the window. */
function leaveMap() {
  if (!app.map) return;
  app.map = null;
  clearWorld();
  clearFx();
  state.paused = false;
  ui.pause.textContent = "⏸️";
  const d = demoDims();
  show("title");
  setWorld(d.W, d.H, "day");
}

function goTitle() { return wipe(() => { leaveMap(); show("title"); }); }
function goMaps() { return wipe(() => { leaveMap(); renderMaps(); show("maps"); }); }

function play(map) {
  return wipe(() => {
    clearWorld();
    clearFx();
    app.map = map;
    show("game");
    setWorld(map.W, map.H, map.theme);
    world.water = map.water ?? 0;
    loadBlocks(map.blocks);
    restore(map.ents);
    ui.mapname.innerHTML = "";
    const b = document.createElement("b"); b.textContent = "emojibox";
    ui.mapname.append(b, " · " + map.name);
  });
}

function doSave() {
  if (!app.map) return null;
  draw(true);
  const rec = saveMap({ ...app.map, blocks: saveBlocks() }, cv);
  if (rec) { app.map = rec; toast(`💾 "${rec.name}" 저장했어요`); sfx("save"); }
  else toast("저장 공간이 부족해요. 안 쓰는 맵을 지워 주세요.");
  return rec;
}

async function openMenu() {
  sfx("open");
  const v = await ask("메뉴", app.map ? `"${app.map.name}"` : "", [
    { label: "💾 저장하고 나가기", value: "save", kind: "primary" },
    { label: "저장하지 않고 나가기", value: "leave" },
    { label: `🎵 음악 ${prefs.music ? "켜짐" : "꺼짐"}`, value: "music" },
    { label: `🔊 효과음 ${prefs.sfx ? "켜짐" : "꺼짐"}`, value: "sfx" },
    { label: "계속 놀기", value: null, kind: "ghost" },
  ]);
  if (v === "save") { if (doSave()) goMaps(); }
  else if (v === "leave") goMaps();
  else if (v === "music" || v === "sfx") { setPref(v, !prefs[v]); syncAudioButtons(); openMenu(); }
  else sfx("back");
}

// the map list
function renderMaps() {
  const grid = document.getElementById("map-grid"), maps = loadMaps();
  document.getElementById("maps-n").textContent = maps.length ? `${maps.length}개` : "";
  grid.innerHTML = "";
  const add = document.createElement("div");
  add.className = "card new";
  add.innerHTML = `<div class="plus">＋</div><div>새 맵 만들기</div>`;
  add.onclick = () => openForm("new");
  grid.appendChild(add);
  if (!maps.length) {
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = "아직 저장한 맵이 없어요. 새 맵을 만들고 게임 안에서 💾를 눌러 저장해 보세요.";
    grid.appendChild(e);
  }
  for (const m of maps) {
    const c = document.createElement("div");
    c.className = "card";
    const th = document.createElement("div"); th.className = "thumb";
    if (m.thumb) { const img = new Image(); img.src = m.thumb; img.alt = ""; th.appendChild(img); }
    const meta = document.createElement("div"); meta.className = "meta";
    const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = m.name;
    const sm = document.createElement("div"); sm.className = "sm";
    const size = SIZES.find((q) => q.id === m.size)?.name ?? "";
    sm.textContent = `${THEMES[m.theme]?.icon ?? ""} ${m.ratio} · ${size} · ${(m.ents ?? []).length}개 · ${ago(m.updated ?? m.created)}`;
    meta.append(nm, sm);
    const del = document.createElement("button");
    del.className = "del"; del.textContent = "🗑️"; del.title = "지우기";
    del.onclick = async (ev) => {
      ev.stopPropagation();
      const ok = await ask(`"${m.name}"을(를) 지울까요?`, "지운 맵은 되돌릴 수 없어요.", [{ label: "지우기", value: true, kind: "danger" }, { label: "취소", value: false, kind: "ghost" }]);
      if (ok) { deleteMap(m.id); renderMaps(); toast("🗑️ 지웠어요"); sfx("delete"); }
    };
    c.append(th, meta, del);
    c.onclick = () => play(m);
    grid.appendChild(c);
  }
}

// the new-map (or map settings) form
function openForm(mode) {
  const m = mode === "edit" ? app.map : null;
  app.form = { mode, name: m?.name ?? `맵 ${loadMaps().length + 1}`, ratio: m?.ratio ?? "16:9", size: m?.size ?? "m", theme: m?.theme ?? "day" };
  // a custom ratio (anything that isn't a preset) opens with its numbers filled in
  const r = parseRatio(app.form.ratio);
  app.form.customOn = !r.preset;
  app.form.custom = r.preset ? { w: 5, h: 2 } : { w: r.w, h: r.h };
  document.getElementById("f-cw").value = app.form.custom.w;
  document.getElementById("f-ch").value = app.form.custom.h;
  document.getElementById("f-title").textContent = mode === "edit" ? "맵 비율·크기" : "새 맵";
  document.getElementById("f-ok").textContent = mode === "edit" ? "적용하기" : "만들기";
  document.getElementById("f-name").value = app.form.name;
  renderForm();
  if (mode === "edit") { show("new"); return; }
  return wipe(() => { leaveMap(); show("new"); });
}
function chip(label, on, onclick, extra) {
  const b = document.createElement("button");
  b.className = "chip" + (on ? " on" : "");
  if (extra) b.appendChild(extra);
  b.append(label);
  b.onclick = onclick;
  return b;
}
function renderForm() {
  const f = app.form;
  const R = document.getElementById("f-ratio"), Z = document.getElementById("f-size"), T = document.getElementById("f-theme");
  R.innerHTML = ""; Z.innerHTML = ""; T.innerHTML = "";
  for (const r of RATIOS) {
    const sh = document.createElement("span");
    sh.className = "shape";
    const k = 16 / Math.max(r.w, r.h);
    sh.style.width = Math.round(r.w * k) + "px";
    sh.style.height = Math.round(r.h * k) + "px";
    R.appendChild(chip(r.id, !f.customOn && f.ratio === r.id, () => { f.ratio = r.id; f.customOn = false; renderForm(); }, sh));
  }
  // your own ratio
  {
    const { w, h } = f.custom, k = Math.max(1 / MAX_RATIO, Math.min(MAX_RATIO, w / h)), s = 16 / Math.max(k, 1);
    const sh = document.createElement("span");
    sh.className = "shape dashed";
    sh.style.width = Math.round(k * s) + "px";
    sh.style.height = Math.round(s) + "px";
    R.appendChild(chip(f.customOn ? `${w}:${h}` : "✏️ 직접", f.customOn, () => { f.customOn = true; f.ratio = `${w}:${h}`; renderForm(); setTimeout(() => document.getElementById("f-cw").focus(), 0); }, sh));
  }
  document.getElementById("f-custom").hidden = !f.customOn;
  const ck = f.custom.w / f.custom.h;
  document.getElementById("f-cnote").textContent = ck > MAX_RATIO || ck < 1 / MAX_RATIO ? `너무 길어서 ${ck > 1 ? "4:1" : "1:4"}로 맞춰져요` : "가로 : 세로 (1:4 ~ 4:1 사이)";
  for (const z of SIZES) {
    const d = dims(f.ratio, z.id), sm = document.createElement("small");
    sm.textContent = ` ${d.W}×${d.H}`;
    const b = chip(z.name, f.size === z.id, () => { f.size = z.id; renderForm(); });
    b.appendChild(sm);
    Z.appendChild(b);
  }
  for (const [id, t] of Object.entries(THEMES)) T.appendChild(chip(`${t.icon} ${t.name}`, f.theme === id, () => { f.theme = id; renderForm(); }));
  // the preview: the map's shape, its size relative to the biggest, its sky
  const d = dims(f.ratio, f.size), big = dims(f.ratio, "xl");
  const box = { w: Math.min(innerWidth - 80, 300), h: 140 };
  const k = Math.min(box.w / big.W, box.h / big.H) * Math.sqrt((d.W * d.H) / (big.W * big.H)) ** 0.3;
  const prev = document.getElementById("f-prev"), th = THEMES[f.theme];
  const fitK = Math.min(box.w / d.W, box.h / d.H, k * (big.W / d.W));
  prev.style.width = Math.round(d.W * fitK) + "px";
  prev.style.height = Math.round(d.H * fitK) + "px";
  prev.style.background = `linear-gradient(${th.sky.join(",")})`;
  prev.style.setProperty("--grass", th.grass[0]);
  document.getElementById("f-dims").textContent = `${d.W} × ${d.H}`;
}
document.getElementById("f-name").addEventListener("input", (ev) => (app.form.name = ev.target.value));
for (const id of ["f-cw", "f-ch"]) {
  document.getElementById(id).addEventListener("input", () => {
    const f = app.form, num = (el) => Math.max(1, Math.min(99, Math.round(+el.value || 1)));
    f.custom = { w: num(document.getElementById("f-cw")), h: num(document.getElementById("f-ch")) };
    f.customOn = true;
    f.ratio = `${f.custom.w}:${f.custom.h}`;
    renderForm();
  });
}
document.getElementById("f-ok").onclick = () => {
  const f = app.form, d = dims(f.ratio, f.size), name = (f.name || "").trim() || "이름 없는 맵";
  if (f.mode === "edit" && app.map) {
    Object.assign(app.map, { name, ratio: f.ratio, size: f.size, theme: f.theme, W: d.W, H: d.H });
    return wipe(() => {
      show("game");
      setWorld(d.W, d.H, f.theme);
      ui.mapname.lastChild.textContent = " · " + name;
    });
  }
  play({ id: newId(), name, ratio: f.ratio, size: f.size, theme: f.theme, W: d.W, H: d.H, created: Date.now(), ents: [], water: 0 });
};
document.getElementById("f-back").onclick = () => (app.form?.mode === "edit" ? show("game") : goMaps());
document.querySelector("[data-home]").onclick = goTitle;
document.getElementById("go-new").onclick = () => openForm("new");
document.getElementById("go-maps").onclick = goMaps;
document.getElementById("menu").onclick = openMenu;
document.getElementById("save").onclick = doSave;
document.getElementById("settings").onclick = () => openForm("edit");
ui.mapname = document.getElementById("mapname");

// sound needs a tap first; then every menu button clicks
addEventListener("pointerdown", unlock, { capture: true });
addEventListener("keydown", unlock, { capture: true });
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("button, .card");
  if (b && !b.closest("#items") && !b.closest("#tabs") && !["pause", "slow", "menu"].includes(b.id)) sfx("click");
});
function syncAudioButtons() {
  const m = document.getElementById("t-mus"), f = document.getElementById("t-snd");
  m.classList.toggle("off", !prefs.music);
  f.classList.toggle("off", !prefs.sfx);
  f.textContent = prefs.sfx ? "🔊" : "🔇";
}
document.getElementById("t-mus").onclick = () => { setPref("music", !prefs.music); syncAudioButtons(); toast(prefs.music ? "🎵 음악 켰어요" : "🎵 음악 껐어요"); };
document.getElementById("t-snd").onclick = () => { setPref("sfx", !prefs.sfx); syncAudioButtons(); toast(prefs.sfx ? "🔊 효과음 켰어요" : "🔇 효과음 껐어요"); };
syncAudioButtons();

// ---------------------------------------------------------------- go

// behind the menus, a steady rain of emoji to play with the physics
const DEMO = ["person", "dog", "chicken", "cat", "apple", "ball", "balloon", "frog", "penguin", "cow", "box", "pizza", "banana", "fish",
  "egg", "bee", "mushroom", "brick", "baby", "monkey", "gift", "snail", "cactus", "mouse", "cheese", "rock", "bomb"];
let demoT = 0;
function demo(dt) {
  demoT -= dt;
  if (demoT > 0) return;
  demoT = 0.55;
  const live = world.ents.filter((e) => e.type !== "tree" && !e.dead);
  if (live.length > 38) { const o = live[0]; o.dead = true; fx(FX.poof, { x: Math.round(o.x), y: Math.round(o.y + o.h / 2), light: 0.3 }); }
  const type = DEMO[(Math.random() * DEMO.length) | 0];
  const e = spawn(type, view.W * (0.08 + Math.random() * 0.84), -10);
  if (e) { e.y = e.r + 2; e.vx = (Math.random() - 0.5) * 120; e.va = (Math.random() - 0.5) * 8; }
}

let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const playing = app.screen === "game";
  if (playing && state.slow) dt *= 0.3;
  if (playing) updatePointer(dt);
  else if (!app.map) demo(dt);
  if (!(playing && state.paused)) {
    step(dt);
    updateFx(dt);
  }
  draw();
  // the tornado's wind swells while one is around
  const torn = world.ents.filter((e) => e.type === "tornado" && !e.dead).length;
  loopSound("wind", playing && !state.paused ? Math.min(1, torn * 0.8) : 0);
  if (app.screen === "title") drawLogo(ui.logo, now / 1000);
  if (playing) ui.count.textContent = world.ents.filter((e) => e.d.creature).length + " 마리 · " + world.ents.length + " 개";
  requestAnimationFrame(frame);
}

async function boot() {
  try { await document.fonts.load('12px "Galmuri11"'); } catch {}
  selectTab(0);
  select("person");
  show("title");
  const d = demoDims();
  setWorld(d.W, d.H, "day");
  addEventListener("resize", onResize);
  requestAnimationFrame(frame);
}
boot();

// for automated checks
window.__sandbox = { world, spawn, state, select, strike, view, app, play, doSave, goMaps, openForm, loadMaps };

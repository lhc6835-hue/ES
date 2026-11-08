// The sandbox: every emoji's traits, the physics (circles that bounce, stack and roll, like a fruit-merge
// game), and how they act on each other.
import { view, sprite, fx } from "./render.js";
import { FX } from "./effects.js";

export const world = { ents: [], parts: [], water: 0, t: 0, shake: 0, flash: 0, hitstop: 0 };
export const GRAV = 520;
/** Extra per-entity rules, run every step before the creature thinks (added by more.js). */
export const PER = [];
/** What a lightning bolt does to a type, instead of the usual burn and hurt. */
export const ZAP = {};
/** The top of the pooled water (screen y). */
export const waterTop = () => view.ground - world.water;
/** Pour in an area of water (px²): it spreads over the whole floor, between the walls. */
export function addWater(area) {
  world.water = Math.min(view.ground * 0.75, world.water + area / view.W);
}
/** Things that ignore the water: weather, effects in the air, plants and fixtures rooted in the floor. */
const DRY = new Set(["hole", "water", "snow", "cloud", "storm", "ghost", "tree", "volcano", "sprout", "tornado", "fire", "meteor", "rocket"]);
const DROP = 55;
/** Called when something eats something (added by more.js). */
export const ON_EAT = [];

// ---------------------------------------------------------------- the emoji
// size: drawn px. mass: heavier pushes lighter. solid: takes part in collisions. roll: spins as it rolls.
// left: the emoji's art faces left (flip it to walk right). fly: no gravity. burn: catches fire.

export const DEFS = {
  person: { brains: true, ch: "🏃", name: "사람", size: 15, hp: 30, mass: 1, solid: true, left: true, burn: true, creature: true, fearful: true, prey: true,
    info: "땅을 돌아다녀요. 무서운 게 보이면 도망가고, 배고프면 🍎🍗를 주워 먹어요." },
  dino: { density: 0.8, villain: true, threat: 90, ch: "🦖", name: "공룡", size: 34, hp: 220, mass: 8, solid: true, left: true, creature: true, burn: true,
    info: "크고 무거워요. 사람·닭·좀비를 쫓아가서 한입에 먹고 점점 커져요." },
  zombie: { villain: true, threat: 90, ch: "🧟", name: "좀비", size: 15, hp: 25, mass: 1, solid: true, burn: true, creature: true, prey: true, burnHurt: 2,
    info: "느릿느릿 사람을 쫓아가요. 물리면 사람도 좀비가 돼요. 불에 약해요." },
  chicken: { ch: "🐔", name: "닭", size: 14, hp: 15, mass: 0.7, solid: true, left: true, burn: true, creature: true, prey: true,
    info: "알을 낳아요. 강아지랑 공룡을 무서워해요. 불이나 번개를 맞으면… 🍗" },
  dog: { brains: true, toyLover: true, ch: "🐕", name: "강아지", size: 16, hp: 40, mass: 1.2, solid: true, left: true, burn: true, creature: true, prey: true,
    info: "사람을 졸졸 따라가요. 닭을 쫓고, 좀비를 보면 짖고 물어요." },
  hero: { ch: "🦸", name: "히어로", size: 16, hp: 140, mass: 1.5, solid: true, fly: true, burn: true, creature: true,
    info: "날아다니며 공룡이랑 좀비를 찾아가 한 방 먹여요." },
  ghost: { threat: 90, ch: "👻", name: "유령", size: 15, hp: 1, mass: 0.5, fly: true, creature: true,
    info: "벽도 물건도 통과해요. 사람한테 다가가 겁을 줘요. 번개에만 사라져요." },
  bee: { ch: "🐝", name: "벌", size: 10, hp: 5, mass: 0.2, fly: true, left: true, burn: true, creature: true,
    info: "나무 주위를 붕붕 날아요. 가끔 근처 생물을 쏘고 도망가요." },

  fire: { ch: "🔥", name: "불", size: 14, hp: 1, mass: 0.5, sensor: true,
    info: "닿는 걸 태우고 얼음을 녹여요. 💧로 끌 수 있어요. 꾹 누르고 그으면 불길이 번져요.", brush: 0.25 },
  water: { ch: "💧", name: "물", size: 8, hp: 1, mass: 0.2, sensor: true,
    info: "꾹 누르면 비가 와요. 땅에 고이면 점점 차올라요. 가벼운 건 뜨고 무거운 건 가라앉아요. 🧽로 닦아낼 수 있어요.", brush: 0.05 },
  sprout: { ch: "🌱", name: "새싹", size: 11, hp: 5, mass: 0.3, sensor: true, burn: true,
    info: "시간이 지나면 🌳 나무가 돼요. 물을 주면 더 빨리 자라요." },
  ice: { density: 0.85, ch: "🧊", name: "얼음", size: 16, hp: 60, mass: 2, solid: true, slide: true,
    info: "미끄러워요. 닿은 생물을 꽁꽁 얼려요. 불에 녹으면 물이 돼요." },
  lightning: { ch: "⚡", name: "번개", tool: true,
    info: "누른 곳에 번개가 떨어져요. 태우고, 터뜨리고, 유령도 없애요.", brush: 0.35 },
  apple: { density: 0.6, ch: "🍎", name: "사과", size: 11, hp: 5, mass: 0.4, solid: true, roll: true, food: 20, bounce: 0.35,
    info: "데굴데굴 굴러요. 사람이 먹으면 기운이 나요." },

  bomb: { density: 1.6, ch: "💣", name: "폭탄", size: 14, hp: 1, mass: 1.2, solid: true, roll: true,
    info: "3초 뒤에 펑! 근처 모든 걸 날려버려요. 불이 닿으면 바로 터져요." },
  rock: { density: 3, ch: "🪨", name: "바위", size: 19, hp: 999, mass: 6, solid: true, roll: true, bounce: 0.08,
    info: "엄청 무거워요. 높은 데서 떨어뜨리면 깔린 게 납작해져요." },
  balloon: { density: 0.1, ch: "🎈", name: "풍선", size: 14, hp: 1, mass: 0.15, solid: true, bounce: 0.6, burn: true,
    info: "둥실 떠올라요. 생물에 닿으면 묶어서 하늘로 데려가요. 꼭대기에서 펑!" },
  hole: { ch: "🌀", name: "블랙홀", size: 16, hp: 1, mass: 1, sensor: true, fly: true,
    info: "8초 동안 주변 모든 걸 빨아들여요." },
  egg: { density: 1.2, ch: "🥚", name: "달걀", size: 10, hp: 1, mass: 0.4, solid: true, roll: true, burn: true, bounce: 0.3,
    info: "시간이 지나면 🐣가 나와요. 세게 떨어지거나 불에 닿으면 🍳" },

  eraser: { ch: "🧽", name: "지우개", tool: true, info: "누르고 문지르면 지워져요. 고인 물도 쭉 빨아들여요.", brush: 0.03 },

  // things that only come from other things
  tree: { ch: "🌳", name: "나무", size: 34, hp: 80, mass: 4, sensor: true, burn: true, burnTime: 8 },
  chick: { ch: "🐣", name: "병아리", size: 11, hp: 6, mass: 0.4, solid: true, left: true, burn: true, creature: true, prey: true },
  leg: { ch: "🍗", name: "치킨", size: 12, hp: 5, mass: 0.4, solid: true, roll: true, food: 30, meat: true, bounce: 0.25 },
  fried: { ch: "🍳", name: "계란후라이", size: 12, hp: 5, mass: 0.4, solid: true, food: 20, meat: true },
  skull: { density: 1.4, ch: "💀", name: "해골", size: 11, hp: 999, mass: 0.6, solid: true, roll: true, bounce: 0.3 },
};


// ---------------------------------------------------------------- spawning

let ids = 1;
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function spawn(type, x, y, extra = {}) {
  const d = DEFS[type];
  if (world.ents.length > 220) {
    // too crowded: drop the oldest raindrop or crumb first
    const i = world.ents.findIndex((e) => e.type === "water" || e.type === "skull");
    if (i >= 0) world.ents.splice(i, 1); else return null;
  }
  const e = {
    id: ids++, type, d, x, y, vx: 0, vy: 0, a: 0, va: 0, size: d.size, hp: d.hp, mass: d.mass,
    t: 0, face: Math.random() < 0.5 ? -1 : 1, want: 0, think: rnd(0, 1), onGround: false,
    burn: 0, frozen: 0, stun: 0, scared: 0, tumble: false, hurt: 0, emote: null, fxs: {},
    ...extra,
  };
  resize(e);
  e.y = Math.min(e.y, view.ground - e.r);
  INIT[type]?.(e);
  world.ents.push(e);
  return e;
}
export function resize(e) {
  const s = sprite(e.d.ch, e.size);
  e.w = s.w;
  e.h = s.h;
  e.r = Math.max(3, Math.min(s.w, s.h) * 0.48);
}

export const INIT = {
  bomb: (e) => (e.fuse = 3.2),
  egg: (e) => (e.hatch = rnd(9, 13)),
  chick: (e) => (e.grow = rnd(14, 18)),
  sprout: (e) => (e.grow = 12),
  tree: (e) => (e.drop = rnd(4, 9)),
  chicken: (e) => (e.lay = rnd(5, 9)),
  balloon: (e) => (e.life = 14),
  hole: (e) => { e.life = 8; e.pull = 1; e.va = -7; },
  fire: (e) => (e.life = rnd(10, 14)),
  hero: (e) => (e.cd = 0),
  bee: (e) => (e.cd = rnd(2, 4)),
  skull: (e) => (e.life = 9),
  water: (e) => (e.life = 6),
};

export function emote(e, ch, t = 1.1) {
  if (e.emote && e.emote.ch === ch && e.emote.t > 0.4) return;
  e.emote = { ch, t, T: t };
}

const feet = (e) => ({ x: e.x, y: e.y + e.h / 2, flip: flipOf(e) });
export const flipOf = (e) => (e.d.left ? e.face > 0 : e.face < 0);

// ---------------------------------------------------------------- queries

export function nearest(e, test, maxD = 1e9) {
  let best = null, bd = maxD;
  for (const o of world.ents) {
    if (o === e || o.dead || !test(o)) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const touching = (a, b, pad = 2) => dist(a, b) < a.r + b.r + pad;
const alive = (o) => !o.dead && o.d.creature;
export const isThreatTo = (e) => (o) => {
  if (o.d.threat) return dist(e, o) < o.d.threat && !(o.type === "zombie" && e.type === "zombie");
  if (o.type === "fire") return dist(e, o) < 40;
  if (o.type === "bomb") return o.fuse < 2 && dist(e, o) < 70;
  if (o.type === "hole") return dist(e, o) < 130;
  if (o.burn > 0 && o !== e) return dist(e, o) < 30;
  return false;
};

// ---------------------------------------------------------------- damage, fire, ice, death

export function hurt(e, n, from = null) {
  if (e.dead || n <= 0) return;
  if (e.type === "ghost") return;
  e.hp -= n;
  if (n >= 3) e.hurt = 0.12;
  if (e.hp <= 0) die(e, from);
}

export function ignite(e, t) {
  if (e.dead || !e.d.burn || e.type === "ghost") return;
  if (e.type === "balloon") return pop(e);
  if (e.type === "egg") return transform(e, "fried");
  if (e.frozen > 0) { e.frozen = 0; return; }
  if (e.burn > 0) { e.burn = Math.max(e.burn, t ?? 3); return; }
  e.burn = t ?? e.d.burnTime ?? 5;
  if (e.d.creature) emote(e, "😱");
  const s = sprite(e.d.ch, e.size);
  e.fxs.burn = fx(FX.burning, { actor: s.actor, light: 0.8 }, () => (e.dead || e.burn <= 0 ? null : feet(e)));
}
export function douse(e) {
  e.burn = 0;
  e.wet = 2;
}
export function freeze(e, t = 5) {
  if (e.dead || !e.d.creature || e.type === "ghost" || e.frozen > 0) return;
  if (e.burn > 0) { e.burn = 0; return; }
  e.frozen = t;
  e.want = 0;
  const s = sprite(e.d.ch, e.size);
  e.fxs.frozen = fx(FX.frozen, { actor: s.actor, light: 0.6 }, () => (e.dead || e.frozen <= 0 ? null : feet(e)));
}

export function transform(e, type) {
  if (e.dead) return null;
  e.dead = true;
  const n = spawn(type, e.x, e.y);
  if (n) { n.vx = e.vx; n.vy = e.vy; n.va = e.va; n.a = e.a; }
  fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.5 });
  return n;
}

export function die(e, from) {
  if (e.dead) return;
  if (e.type === "chicken" || e.type === "chick") { transform(e, "leg"); return; }
  if (e.type === "egg") { transform(e, "fried"); return; }
  if (e.type === "balloon") { pop(e); return; }
  if (e.type === "bomb") { explode(e); return; }
  e.dead = true;
  if (e.d.creature && e.type !== "bee" && e.type !== "ghost") {
    const s = sprite(e.d.ch, e.size);
    fx(FX.soulRise, { actor: s.actor, x: Math.round(e.x), y: Math.round(e.y + e.h / 2), height: 30 + e.size, light: 0.6 });
    const k = spawn("skull", e.x, e.y, { size: Math.round(Math.min(26, 9 + e.size * 0.2)) });
    if (k) { k.vy = -120; k.vx = rnd(-40, 40); k.va = rnd(-6, 6); }
  } else if (e.type === "tree") {
    fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), palette: ["#1a1420", "#3a3040", "#5a5060", "#8a8090", "#c0b8c0"], light: 0 });
    if (Math.random() < 0.5) spawn("fire", e.x, e.y);
  } else {
    fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.5 });
  }
}

export function pop(e) {
  if (e.dead) return;
  e.dead = true;
  if (e.carry) { e.carry.carried = null; e.carry.tumble = true; emote(e.carry, "😵"); }
  fx(FX.hitSpark, { x: Math.round(e.x), y: Math.round(e.y), light: 0.8 });
  fx(FX.collect, { x: Math.round(e.x), y: Math.round(e.y), palette: ["#5a1020", "#c8243a", "#ff6a7a", "#ffc0c8", "#ffffff"], light: 0.5 });
}

export function explode(b, R = 60) {
  if (b.dead) return;
  b.dead = true;
  const x = b.x, y = b.y;
  fx(FX.smallExplosion, { x: Math.round(x), y: Math.round(Math.min(view.ground, y + b.r)), size: 0.9, light: 1 });
  world.shake = Math.max(world.shake, 9);
  world.flash = 0.08;
  world.hitstop = 0.05;
  for (const o of world.ents) {
    if (o.dead || o === b) continue;
    const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy);
    if (d > R + o.r) continue;
    const f = 1 - Math.min(1, d / (R + o.r)), nx = d > 0.1 ? dx / d : 0, ny = d > 0.1 ? dy / d : -1;
    if (o.type === "hole" || o.type === "fire") continue;
    const imp = 720 * f / Math.sqrt(o.mass);
    o.vx += nx * imp;
    o.vy += ny * imp - 220 * f / Math.sqrt(o.mass);
    o.va += rnd(-12, 12) * f;
    if (o.d.creature) { o.tumble = true; if (f > 0.15) emote(o, "😵"); }
    if (o.type === "bomb") { o.fuse = Math.min(o.fuse, 0.12 + Math.random() * 0.1); continue; }
    if (o.type === "ice") { shatter(o); continue; }
    if (o.type === "egg") { transform(o, "fried"); continue; }
    if (o.type === "water") { o.dead = true; continue; }
    if (f > 0.45) ignite(o, 3);
    hurt(o, 75 * f, b);
  }
}

export function shatter(e) {
  if (e.dead) return;
  e.dead = true;
  fx(FX.iceShatter, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.6 });
  for (let i = 0; i < 3; i++) {
    const w = spawn("water", e.x + rnd(-5, 5), e.y + rnd(-5, 2));
    if (w) { w.vx = rnd(-60, 60); w.vy = rnd(-120, -40); }
  }
}

export function strike(x) {
  const gy = view.ground;
  // the effect charges for a while before the bolt lands: skip most of that so a tap strikes now
  const bolt = fx(FX.lightning, { x: Math.round(x), y: gy, light: 1 });
  bolt.update(0.62);
  later(0.14, () => land(x, gy));
}
function land(x, gy) {
  world.flash = 0.12;
  world.shake = Math.max(world.shake, 5);
  for (const o of world.ents) {
    if (o.dead || Math.abs(o.x - x) > o.r + 7) continue;
    if (ZAP[o.type]) { ZAP[o.type](o); continue; }
    if (o.type === "ghost") { die(o); continue; }
    if (o.type === "bomb") { o.fuse = 0.05; continue; }
    if (o.type === "sprout") { grow(o); continue; }
    if (o.type === "ice") { shatter(o); continue; }
    if (o.type === "water" || o.type === "hole" || o.type === "fire") continue;
    o.vy -= 120;
    if (o.d.creature) { o.tumble = true; o.stun = Math.max(o.stun, 1); emote(o, "😵"); }
    ignite(o, 4);
    hurt(o, o.type === "dino" ? 45 : 70);
  }
  if (world.water > 2) {
    // the bolt hits the pool: everyone in it gets a shock
    const top = waterTop();
    for (let i = 0; i < 30; i++) world.parts.push({ x: Math.random() * view.W, y: top + Math.random() * world.water, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, c: Math.random() < 0.5 ? "#e4f2ff" : "#a8d0ff", g: 0 });
    for (const o of world.ents) {
      if (o.dead || !(o.sub > 0) || !o.d.creature) continue;
      if (ZAP[o.type]) { ZAP[o.type](o); continue; }
      o.stun = Math.max(o.stun, 1.5);
      emote(o, "😵");
      hurt(o, o.type === "fish" ? 5 : 20);
    }
    return;
  }
  if (Math.random() < 0.5) spawn("fire", x, gy - 6);
}

export function grow(s) {
  const t = transform(s, "tree");
  if (t) fx(FX.bloom, { x: Math.round(t.x), y: Math.round(t.y + t.h / 2), light: 0.8 });
}

export function eat(e, food) {
  if (food.dead) return;
  food.dead = true;
  e.hp = Math.min(e.d.hp * (e.type === "dino" ? 3 : 1.5), e.hp + (food.d.food ?? 20));
  fx(FX.collect, { x: Math.round(food.x), y: Math.round(food.y), light: 0.6 });
  emote(e, pick(["😋", "❤️"]));
  for (const f of ON_EAT) f(e, food);
}

// ---------------------------------------------------------------- behaviour

export function walk(e, dt, speed, accel = 10) {
  // only feet on something can push
  if ((!e.onGround && !(e.sub > 0.4)) || e.tumble) return;
  if (!e.onGround) { speed *= 0.6; accel *= 0.5; } // swimming
  e.vx += (speed - e.vx) * Math.min(1, accel * dt);
  if (Math.abs(speed) > 4) e.face = Math.sign(speed);
  // stuck against something: hop over it
  if (Math.abs(speed) > 8 && Math.abs(e.vx) < Math.abs(speed) * 0.25) {
    e.stuck = (e.stuck ?? 0) + dt;
    if (e.stuck > 0.25) { e.vy = -Math.min(240, 150 + e.r * 3); e.stuck = 0; }
  } else e.stuck = 0;
}
export function fly(e, dt, tx, ty, speed, k = 3) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  const s = Math.min(speed, d * 3);
  e.vx += ((dx / d) * s - e.vx) * Math.min(1, k * dt);
  e.vy += ((dy / d) * s - e.vy) * Math.min(1, k * dt);
  if (Math.abs(e.vx) > 5) e.face = Math.sign(e.vx);
}
export function wander(e, dt, speed) {
  e.think -= dt;
  if (e.think <= 0) {
    e.think = rnd(1.5, 4);
    e.want = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1) * speed * rnd(0.6, 1);
  }
  // turn back from the walls
  if (e.x < 20) e.want = Math.abs(e.want);
  if (e.x > view.W - 20) e.want = -Math.abs(e.want);
  walk(e, dt, e.want);
}
export function flee(e, dt, from, speed) {
  let dir = Math.sign(e.x - from.x) || 1;
  // cornered: try to run past
  if ((dir < 0 && e.x < 14) || (dir > 0 && e.x > view.W - 14)) dir = -dir;
  if (e.scared <= 0) emote(e, pick(["😱", "😨", "❗"]));
  e.scared = 0.6;
  walk(e, dt, dir * speed, 12);
}

export const AI = {
  person(e, dt) {
    if (e.burn > 0) {
      e.think -= dt;
      if (e.think <= 0) { e.think = rnd(0.4, 0.9); e.want = (Math.random() < 0.5 ? -1 : 1) * 80; }
      if (e.x < 20) e.want = 80; if (e.x > view.W - 20) e.want = -80;
      walk(e, dt, e.want, 12);
      emote(e, "😫", 0.5);
      return;
    }
    const th = nearest(e, isThreatTo(e));
    if (th) return flee(e, dt, th, 72);
    const food = nearest(e, (o) => o.d.food && !o.held, e.hp < e.d.hp ? 220 : 110);
    if (food) {
      walk(e, dt, Math.sign(food.x - e.x) * 40);
      if (touching(e, food, 3)) eat(e, food);
      return;
    }
    const dog = nearest(e, (o) => o.type === "dog", 40);
    if (dog && Math.random() < dt * 0.15) emote(e, "❤️");
    const hero = nearest(e, (o) => o.type === "hero", 50);
    if (hero && Math.random() < dt * 0.1) emote(e, "🤩");
    wander(e, dt, 24);
  },

  dino(e, dt) {
    const prey = nearest(e, (o) => (o.d.prey || o.d.meat) && !o.held && !o.carried, 320);
    if (prey) {
      walk(e, dt, Math.sign(prey.x - e.x) * (prey.d.meat ? 30 : 52), 6);
      if (touching(e, prey, 4)) {
        prey.dead = true;
        fx(FX.pow, { x: Math.round(prey.x), y: Math.round(prey.y + 6), text: "CHOMP!", scale: 2, big: 0.5, light: 0.5 });
        fx(FX.hitSpark, { x: Math.round(prey.x), y: Math.round(prey.y), light: 0.6 });
        world.shake = Math.max(world.shake, 3);
        world.hitstop = 0.06;
        e.hp = Math.min(e.d.hp * 2, e.hp + 30);
        if (e.size < 56) { e.size += 3; e.mass += 0.8; resize(e); }
        emote(e, "😋");
      }
      e.roar = (e.roar ?? 3) - dt;
      if (e.roar <= 0) { e.roar = rnd(4, 8); emote(e, "💢", 1.4); world.shake = Math.max(world.shake, 2); }
    } else wander(e, dt, 16);
  },

  zombie(e, dt) {
    const prey = nearest(e, (o) => o.d.brains && !o.infect && !o.held && !o.carried, 260);
    if (e.burn > 0 && Math.random() < dt * 2) emote(e, "😫", 0.5);
    if (prey) {
      walk(e, dt, Math.sign(prey.x - e.x) * (16 + 6 * Math.sin(e.t * 5)), 6);
      if (touching(e, prey, 2)) {
        prey.infect = 1.3;
        prey.stun = 1.3;
        emote(prey, "😨");
        const s = sprite(prey.d.ch, prey.size);
        prey.fxs.poison = fx(FX.poisoned, { actor: s.actor, light: 0.6 }, () => (prey.dead || !prey.infect ? null : feet(prey)));
        fx(FX.bluntHit, { x: Math.round(prey.x), y: Math.round(prey.y + 4), light: 0.4 });
      }
      if (Math.random() < dt * 0.3) emote(e, "🧠");
    } else wander(e, dt, 8);
  },

  chicken(e, dt) {
    const th = nearest(e, (o) => ((o.type === "dog" || o.type === "dino" || o.type === "zombie") && dist(e, o) < 80) || isThreatTo(e)(o));
    if (th) {
      flee(e, dt, th, 66);
      if (e.onGround && Math.random() < dt * 2.5) e.vy = -130; // flap
    } else {
      wander(e, dt, 18);
      if (e.onGround && Math.random() < dt * 0.4) e.peck = 0.3;
    }
    e.lay -= dt;
    if (e.lay <= 0) {
      e.lay = rnd(8, 14);
      if (world.ents.filter((o) => o.type === "egg").length < 10) {
        const g = spawn("egg", e.x - e.face * 4, e.y);
        if (g) { g.vx = -e.face * 30; emote(e, "❗"); }
      }
    }
  },

  chick(e, dt) {
    const th = nearest(e, isThreatTo(e));
    if (th) return flee(e, dt, th, 45);
    const mom = nearest(e, (o) => o.type === "chicken", 250);
    if (mom && Math.abs(mom.x - e.x) > 16) walk(e, dt, Math.sign(mom.x - e.x) * 30);
    else wander(e, dt, 10);
    e.grow -= dt;
    if (e.grow <= 0) { const c = transform(e, "chicken"); if (c) emote(c, "✨"); }
  },

  dog(e, dt) {
    const foe = nearest(e, (o) => o.type === "zombie" || o.type === "ghost", 130);
    e.cd = (e.cd ?? 0) - dt;
    if (foe) {
      if (Math.random() < dt * 1.2) emote(e, "💢", 0.8);
      if (foe.type === "ghost") {
        // barks but keeps its distance
        const d = foe.x - e.x;
        walk(e, dt, Math.abs(d) < 35 ? -Math.sign(d) * 50 : 0);
        e.face = Math.sign(d) || e.face;
      } else {
        walk(e, dt, Math.sign(foe.x - e.x) * 60);
        if (touching(e, foe, 3) && e.cd <= 0) {
          e.cd = 0.8;
          hurt(foe, 7, e);
          foe.vx += Math.sign(foe.x - e.x) * 120;
          foe.vy -= 60;
          fx(FX.hitSpark, { x: Math.round((e.x + foe.x) / 2), y: Math.round(foe.y), light: 0.5 });
        }
      }
      return;
    }
    const th = nearest(e, (o) => o.type === "dino" || o.type === "fire" || (o.type === "bomb" && o.fuse < 2), 70);
    if (th) return flee(e, dt, th, 70);
    const bird = nearest(e, (o) => o.type === "chicken" || o.type === "chick", 130);
    if (bird) {
      walk(e, dt, Math.sign(bird.x - e.x) * 58);
      if (Math.random() < dt * 0.6) emote(e, "🐾");
      return;
    }
    const food = nearest(e, (o) => o.d.meat && !o.held, 160);
    if (food) {
      walk(e, dt, Math.sign(food.x - e.x) * 50);
      if (touching(e, food, 3)) eat(e, food);
      return;
    }
    const owner = nearest(e, (o) => o.type === "person", 400);
    if (owner) {
      const d = owner.x - e.x;
      walk(e, dt, Math.abs(d) > 26 ? Math.sign(d) * 48 : 0);
      if (Math.abs(d) <= 26 && Math.random() < dt * 0.25) emote(e, "❤️");
      if (Math.abs(d) <= 26 && e.onGround && Math.random() < dt * 0.4) e.vy = -90; // happy hop
      return;
    }
    wander(e, dt, 22);
  },

  hero(e, dt) {
    e.cd -= dt;
    const foe = nearest(e, (o) => o.d.villain && !o.held);
    if (foe) {
      const side = Math.sign(e.x - foe.x) || 1;
      fly(e, dt, foe.x + side * (foe.r + e.r - 2), foe.y - foe.r * 0.3, 150, 4);
      e.face = -side;
      if (touching(e, foe, 6) && e.cd <= 0) {
        e.cd = 0.55;
        const dir = -side;
        hurt(foe, foe.type === "dino" ? 22 : 30, e);
        foe.vx += dir * 420 / Math.sqrt(foe.mass);
        foe.vy -= 260 / Math.sqrt(foe.mass);
        foe.tumble = true;
        foe.va += dir * 6;
        e.vx -= dir * 80;
        fx(FX.pow, { x: Math.round(foe.x), y: Math.round(foe.y + 4), text: pick(["POW!", "BAM!", "WHAM!"]), scale: 2, big: foe.type === "dino" ? 0.7 : 0.45, light: 0.5 });
        world.shake = Math.max(world.shake, foe.type === "dino" ? 5 : 3);
        world.hitstop = 0.07;
      }
    } else {
      // patrol above the ground
      e.patrol = e.patrol ?? (Math.random() < 0.5 ? -1 : 1);
      if (e.x < 30) e.patrol = 1;
      if (e.x > view.W - 30) e.patrol = -1;
      fly(e, dt, e.x + e.patrol * 40, view.ground - 50 + Math.sin(e.t * 2) * 10, 40, 2);
    }
  },

  ghost(e, dt) {
    const v = nearest(e, (o) => o.type === "person" || o.type === "dog", 220);
    const tx = v ? v.x : e.x + Math.sin(e.t * 0.7 + e.id) * 40;
    const ty = (v ? v.y - 10 : view.ground - 40) + Math.sin(e.t * 2.3 + e.id) * 8;
    fly(e, dt, tx, ty, v ? 22 : 15, 1.5);
    if (v && dist(e, v) < 30 && Math.random() < dt * 0.8) emote(e, pick(["👻", "😜"]));
  },

  bee(e, dt) {
    e.cd -= dt;
    const tree = nearest(e, (o) => o.type === "tree", 400);
    let tx, ty;
    if (e.target && !e.target.dead && e.cd <= 0) {
      tx = e.target.x; ty = e.target.y;
      fly(e, dt, tx, ty, 130, 5);
      if (touching(e, e.target, 2)) {
        hurt(e.target, 4, e);
        e.target.scared = 0;
        emote(e.target, pick(["😣", "😫"]));
        e.target.vy -= 70;
        fx(FX.hitSpark, { x: Math.round(e.x), y: Math.round(e.y), light: 0.4 });
        e.target = null;
        e.cd = rnd(4, 7);
        e.vy = -120;
      }
      return;
    }
    if (tree) { tx = tree.x + Math.sin(e.t * 1.7 + e.id) * 22; ty = tree.y - 6 + Math.cos(e.t * 2.3 + e.id) * 12; }
    else { tx = e.x + Math.sin(e.t * 1.1 + e.id) * 50; ty = view.ground - 50 + Math.sin(e.t * 1.9) * 20; }
    fly(e, dt, tx + rnd(-15, 15), ty + rnd(-15, 15), 60, 3);
    if (e.cd <= 0) {
      e.target = nearest(e, (o) => (o.type === "person" || o.type === "dog" || o.type === "dino" || o.type === "zombie") && !o.dead, 90);
      if (!e.target) e.cd = 1;
    }
  },
};

// things, not creatures
export const TICK = {
  fire(e, dt) {
    e.life -= dt;
    if (e.life <= 0) { e.dead = true; fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), palette: SMOKE, light: 0 }); return; }
    // flicker: the flame mirrors itself now and then, and throws embers
    e.flick = (e.flick ?? 0) - dt;
    if (e.flick <= 0) { e.flick = rnd(0.08, 0.2); e.face = -e.face; }
    if (Math.random() < dt * 10) part(e.x + rnd(-3, 3), e.y - e.h * 0.3, rnd(-10, 10), rnd(-45, -20), rnd(0.4, 0.8), pick(["#ffc23d", "#ff8a2a", "#ffe26b", "#f2561d"]), -0.03);
    e.spread = (e.spread ?? 0) - dt;
    if (e.spread > 0) return;
    e.spread = 0.35;
    for (const o of world.ents) {
      if (o.dead || o === e) continue;
      const near = Math.abs(o.x - e.x) < o.r + 7 && o.y + o.r > e.y - 16 && o.y - o.r < e.y + e.r + 2;
      if (!near) continue;
      if (o.type === "ice") { shatter(o); continue; }
      if (o.type === "bomb") { o.fuse = Math.min(o.fuse, 0.3); continue; }
      if (o.type === "water") { o.dead = true; e.life -= 4; steam(e); continue; }
      if (o.frozen > 0) { o.frozen = 0; continue; }
      ignite(o);
    }
  },
  water(e, dt) {
    e.life -= dt;
    if (e.life <= 0) { e.dead = true; return; }
    if (world.water > 0.5 && e.y + e.r >= waterTop()) {
      // into the pool
      addWater(DROP);
      if (Math.random() < 0.4) droplets(e.x, waterTop() - 1, 2, ["#9bdcff", "#d8f4ff"]);
      e.dead = true;
      return;
    }
    for (const o of world.ents) {
      if (o.dead || o === e || o.type === "water" || !touching(e, o, 0)) continue;
      if (o.type === "fire") { o.dead = true; steam(o); e.dead = true; return; }
      if (o.burn > 0) { douse(o); steam(o); e.dead = true; return; }
      if (o.type === "sprout") { o.grow -= 3; sparkle(o); e.dead = true; return; }
      if (o.type === "tree" || o.type === "hole" || o.type === "ghost") continue;
      if (o.type === "bee") { o.stun = 1.5; }
      if (o.d.solid || o.d.creature) { o.wet = 2; splash(e); e.dead = true; return; }
    }
    if (e.onGround) {
      for (const o of world.ents) if (o.type === "sprout" && Math.abs(o.x - e.x) < 14) { o.grow -= 2; sparkle(o); }
      splash(e);
      addWater(DROP);
      e.dead = true;
    }
  },
  sprout(e, dt) {
    e.grow -= dt;
    if (e.grow <= 0) grow(e);
  },
  tree(e, dt) {
    e.drop -= dt;
    if (e.drop <= 0) {
      e.drop = rnd(10, 16);
      const apples = world.ents.filter((o) => o.type === "apple" && Math.abs(o.x - e.x) < 40).length;
      if (apples < 3 && e.burn <= 0) spawn("apple", e.x + rnd(-e.w * 0.3, e.w * 0.3), e.y - e.h * 0.2);
    }
  },
  bomb(e, dt) {
    e.fuse -= dt;
    if (e.fuse <= 0) explode(e);
  },
  egg(e, dt) {
    e.hatch -= dt;
    if (e.hatch <= 0) {
      e.dead = true;
      fx(FX.eggHatch, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.6 });
      const x = e.x, y = e.y;
      later(1.3, () => { const c = spawn("chick", x, y - 2); if (c) { c.vy = -80; emote(c, "✨"); } });
    }
  },
  balloon(e, dt) {
    e.life -= dt;
    if (e.life <= 0 || e.y - e.r < 3) return pop(e);
    if (!e.carry && !e.held) {
      const c = world.ents.find((o) => !o.dead && o.d.creature && !o.d.fly && o.mass <= 2.5 && !o.carried && !o.held && touching(e, o, 4));
      if (c) { e.carry = c; c.carried = e; emote(c, pick(["😲", "🤩"])); }
    }
    if (e.carry && (e.carry.dead || e.carry.carried !== e)) e.carry = null;
  },
  hole(e, dt) {
    e.life -= dt;
    e.vx *= 0.9; e.vy *= 0.9;
    e.va = -7 * e.pull;
    // and it drinks the pool
    if (world.water > 0) world.water = Math.max(0, world.water - 4 * e.pull * dt);
    // swirling motes falling into it
    if (Math.random() < dt * 30) {
      const a = rnd(0, Math.PI * 2), R = rnd(14, 30) * e.pull, T = 0.35;
      part(e.x + Math.cos(a) * R, e.y + Math.sin(a) * R, -Math.cos(a) * R / T - Math.sin(a) * 25, -Math.sin(a) * R / T + Math.cos(a) * 25, T, pick(["#9a48ec", "#c684ff", "#6b2cc0", "#ecc8ff"]), 0);
    }
    if (e.life <= 0) {
      e.dead = true;
      fx(FX.implosion, { x: Math.round(e.x), y: Math.round(e.y), light: 0.9 });
      world.shake = Math.max(world.shake, 6);
      return;
    }
    const R = 150 * e.pull;
    for (const o of world.ents) {
      if (o.dead || o === e || o.type === "hole" || o.held) continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d > R) continue;
      const f = (24000 / (d + 30)) * dt / Math.sqrt(o.mass);
      o.vx += (dx / d) * f;
      o.vy += (dy / d) * f - (o.d.fly ? 0 : GRAV * 0.6 * dt);
      if (o.d.creature && d < 90) { o.tumble = true; if (Math.random() < dt) emote(o, "😵"); }
      if (o.carried) o.carried = null;
      if (d < 5 * e.pull + o.r * 0.4) {
        o.dead = true;
        e.pull = Math.min(1.8, e.pull + 0.03);
        fx(FX.hitSpark, { x: Math.round(e.x), y: Math.round(e.y), palette: ["#140a26", "#481c88", "#9a48ec", "#ecc8ff", "#ffffff"], light: 0.6 });
      }
    }
  },
  skull(e, dt) {
    e.life -= dt;
    if (e.life <= 0) e.dead = true;
  },
};

export function steam(e) {
  fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.r), palette: ["#4a5460", "#6a7888", "#8a98a8", "#a8b4c0", "#c0ccd8"], light: 0 });
}
// a raindrop landing: a few tiny pixels hop up, nothing more
export function splash(e) {
  droplets(e.x, Math.min(view.ground - 1, e.y + e.r), 3, ["#9bdcff", "#58b4ec", "#d8f4ff"]);
}
const SMOKE = ["#3a3440", "#5a5060", "#7a7080", "#9a90a0", "#b8b0c0"];
export function part(x, y, vx, vy, life, c, g = 1) {
  if (world.parts.length > 300) world.parts.shift();
  world.parts.push({ x, y, vx, vy, life, c, g });
}
export function droplets(x, y, n, cols) {
  for (let i = 0; i < n; i++) {
    if (world.parts.length > 300) world.parts.shift();
    world.parts.push({ x, y, vx: rnd(-35, 35), vy: rnd(-70, -30), life: rnd(0.2, 0.4), c: pick(cols) });
  }
}
export function sparkle(e) {
  droplets(e.x, e.y, 2, ["#7ee88a", "#c8ffc4"]);
}

const timers = [];
export function later(t, f) { timers.push({ t, f }); }

// ---------------------------------------------------------------- physics

/** Floor, walls and circle-circle contacts, a few substeps per frame so piles settle. */
function physics(dt) {
  const { W, ground } = view;
  const ents = world.ents;
  const n = ents.length;
  for (const e of ents) { e.onGround = false; e.impact = 0; }

  for (const e of ents) {
    if (e.dead || e.held) continue;
    const d = e.d;
    let g = d.fly && !e.tumble && !(e.frozen > 0) && !(e.stun > 0 && e.type !== "bee") ? 0 : GRAV;
    if (d.fly && e.type === "ghost") g = 0;
    if (e.type === "balloon") g = -110 - (e.carry ? 0 : 60);
    if (e.type === "hole" || e.nograv) g = 0;
    g *= d.g ?? 1;
    if (e.carried) {
      // dangling under a balloon: rise with it
      const b = e.carried;
      e.vx += (b.x - e.x) * 4 * dt;
      e.vy += (-55 - e.vy) * 3 * dt;
      g = 0;
    }
    if (e.type === "balloon" && e.carry) {
      // the balloon floats on a short string above its passenger
      const c = e.carry, tx = c.x + Math.sin(e.t * 2) * 3, ty = c.y - c.r - 16;
      e.vx += (tx - e.x) * 30 * dt - e.vx * 6 * dt;
      e.vy += (ty - e.y) * 30 * dt - e.vy * 6 * dt;
      g = 0;
    }
    e.vy += g * dt;
    // the pool: what's lighter than water floats, what's heavier sinks, everything slows down
    const was = e.sub ?? 0;
    e.sub = 0;
    if (world.water > 0.5 && !DRY.has(e.type) && !(d.fly && !e.tumble && !(e.frozen > 0))) {
      const sub = Math.max(0, Math.min(1, (e.y + e.r - waterTop()) / (2 * e.r)));
      e.sub = sub;
      if (sub > 0) {
        const dens = d.density ?? (d.creature ? 0.65 : 0.8);
        e.vy -= (GRAV * sub / dens) * dt;
        const k = Math.exp(-3 * sub * dt);
        e.vx *= k; e.vy *= k; e.va *= k;
        if (was === 0 && e.vy > 90) {
          for (let i = 0; i < Math.min(10, e.vy / 30); i++) world.parts.push({ x: e.x + (Math.random() - 0.5) * e.w, y: waterTop() - 1, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * e.vy * 0.5, life: 0.5, c: Math.random() < 0.5 ? "#d8f4ff" : "#9bdcff", g: 1 });
        }
      }
    }
    const drag = d.fly && !e.tumble ? 0.4 : e.type === "balloon" ? 1.2 : 0.05;
    e.vx *= Math.exp(-drag * dt);
    e.vy *= Math.exp(-drag * dt);
    if (e.type === "balloon") e.vy = Math.max(e.vy, -70);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.a += e.va * dt;
  }

  // pairs
  for (let i = 0; i < n; i++) {
    const a = ents[i];
    if (a.dead || !a.d.solid) continue;
    for (let j = i + 1; j < n; j++) {
      const b = ents[j];
      if (b.dead || !b.d.solid) continue;
      if (a.carried === b || b.carried === a || a.carry === b || b.carry === a) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const R = a.r + b.r;
      if (dx > R || dx < -R || dy > R || dy < -R) continue;
      let d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (d < 0.01) { dx = Math.random() - 0.5; dy = -1; d = Math.hypot(dx, dy); }
      const nx = dx / d, ny = dy / d, pen = R - d;
      const ia = a.held ? 0 : 1 / a.mass, ib = b.held ? 0 : 1 / b.mass, s = ia + ib;
      if (s === 0) continue;
      const corr = Math.max(0, pen - 0.2) * 0.85 / s;
      a.x -= nx * corr * ia; a.y -= ny * corr * ia;
      b.x += nx * corr * ib; b.y += ny * corr * ib;
      const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
      if (ny > 0.55) a.onGround = true; // a rests on b
      if (ny < -0.55) b.onGround = true;
      if (vn < 0) {
        const e = Math.max(a.d.bounce ?? 0.15, b.d.bounce ?? 0.15);
        const jn = -(1 + e) * vn / s;
        a.vx -= jn * nx * ia; a.vy -= jn * ny * ia;
        b.vx += jn * nx * ib; b.vy += jn * ny * ib;
        // friction along the contact, which also sets round things spinning
        const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
        const jt = Math.max(-jn * 0.3, Math.min(jn * 0.3, -vt / s));
        a.vx -= jt * tx * ia; a.vy -= jt * ty * ia;
        b.vx += jt * tx * ib; b.vy += jt * ty * ib;
        if (a.d.roll) a.va += (vt / a.r) * 0.3;
        if (b.d.roll) b.va -= (vt / b.r) * 0.3;
        const hit = -vn;
        a.impact = Math.max(a.impact, hit * Math.min(3, b.mass / a.mass));
        b.impact = Math.max(b.impact, hit * Math.min(3, a.mass / b.mass));
        if (hit > 60) { a.touched = b; b.touched = a; }
      }
      contact(a, b);
    }
  }

  // world bounds
  for (const e of ents) {
    if (e.dead || e.held) continue;
    const bounce = e.d.bounce ?? 0.25;
    if (e.type === "ghost") { e.x = Math.max(e.r, Math.min(W - e.r, e.x)); e.y = Math.max(e.r, Math.min(ground - e.r, e.y)); continue; }
    if (e.x < e.r) { e.x = e.r; if (e.vx < 0) { wallHit(e, -e.vx); e.vx = -e.vx * Math.max(0.35, bounce); } }
    if (e.x > W - e.r) { e.x = W - e.r; if (e.vx > 0) { wallHit(e, e.vx); e.vx = -e.vx * Math.max(0.35, bounce); } }
    if (e.y < e.r) { e.y = e.r; if (e.vy < 0) { wallHit(e, -e.vy); e.vy = -e.vy * 0.4; } }
    if (e.y > ground - e.r) {
      e.y = ground - e.r;
      if (e.vy > 0) {
        e.impact = Math.max(e.impact, e.vy);
        e.vy = e.vy > 60 ? -e.vy * bounce : 0;
      }
      e.onGround = true;
    }
    if (e.onGround && !e.d.fly) {
      const fr = e.d.slide ? 0.3 : e.d.roll ? 0.6 : e.d.creature && !e.tumble ? 0 : 5;
      e.vx *= Math.exp(-fr * dt);
      if (e.d.roll) e.va += (e.vx / e.r - e.va) * Math.min(1, 12 * dt);
    }
  }
}

function contact(a, b) {
  // ice freezes what it touches
  if (a.type === "ice" && b.d.creature) freeze(b);
  if (b.type === "ice" && a.d.creature) freeze(a);
  // fire spreads by touch
  if (a.burn > 0 && b.d.burn && Math.random() < 0.02) ignite(b, 3);
  if (b.burn > 0 && a.d.burn && Math.random() < 0.02) ignite(a, 3);
  // a balloon picks up what it bumps into
  if (a.type === "bomb" && b.type === "balloon" && a.fuse < 1) pop(b);
  if (b.type === "bomb" && a.type === "balloon" && b.fuse < 1) pop(a);
}

function wallHit(e, speed) {
  e.impact = Math.max(e.impact, speed);
}

/** Hard landings and crashes: creatures get hurt and dazed, eggs crack, ice shatters. */
function impacts() {
  for (const e of world.ents) {
    if (e.dead || !e.impact) continue;
    const v = e.impact;
    if (e.type === "egg" && v > 260) { transform(e, "fried"); continue; }
    if (e.type === "ice" && v > 420) { shatter(e); continue; }
    if (e.type === "balloon" && v > 380) { pop(e); continue; }
    if (e.type === "rock" && v > 180) {
      fx(FX.heavyLanding, { actor: sprite(e.d.ch, e.size).actor, x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.4 });
      world.shake = Math.max(world.shake, Math.min(6, v / 80));
    }
    if (!e.d.creature) continue;
    if (e.type === "dino" && v > 160) {
      fx(FX.heavyLanding, { actor: sprite(e.d.ch, e.size).actor, x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.4 });
      world.shake = Math.max(world.shake, 5);
    }
    const safe = e.frozen > 0 ? 220 : 300;
    if (v > safe) {
      const dmg = (v - safe) * (e.frozen > 0 ? 0.35 : 0.12);
      hurt(e, dmg);
      if (e.frozen > 0 && v > 300) { e.frozen = 0; fx(FX.iceShatter, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.5 }); }
      if (!e.dead) {
        e.stun = Math.max(e.stun, Math.min(2, (v - safe) / 200));
        emote(e, pick(["😵", "🤕", "💫"]));
        if (dmg > 3) fx(FX.bluntHit, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.4 });
      }
    }
  }
}

// ---------------------------------------------------------------- the step

export function step(dt) {
  world.t += dt;
  world.shake *= Math.exp(-10 * dt);
  world.flash = Math.max(0, world.flash - dt);
  if (world.hitstop > 0) { world.hitstop -= dt; return; }

  for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].f; timers.splice(i, 1); f(); }

  for (const e of world.ents) {
    if (e.dead) continue;
    e.t += dt;
    e.hurt = Math.max(0, e.hurt - dt);
    e.wet = Math.max(0, (e.wet ?? 0) - dt);
    e.scared = Math.max(0, e.scared - dt);
    if (e.peck) e.peck = Math.max(0, e.peck - dt);
    if (e.emote && (e.emote.t -= dt) <= 0) e.emote = null;

    // statuses
    if (e.burn > 0) {
      e.burn -= dt;
      if (e.wet > 0) e.burn = 0;
      hurt(e, (e.d.burnHurt ?? 1) * (e.type === "tree" ? 12 : 7) * dt);
      if (e.burn <= 0 && e.type === "tree" && !e.dead) die(e);
      if (e.dead) continue;
    }
    if (e.infect) {
      e.infect -= dt;
      if (e.infect <= 0) {
        e.infect = 0;
        const z = transform(e, "zombie");
        if (z) { emote(z, "🧠"); fx(FX.poof, { x: Math.round(z.x), y: Math.round(z.y + z.h / 2), palette: ["#0c2010", "#1f5a28", "#3e9a3a", "#8ad860", "#d8ffb0"], light: 0.5 }); }
        continue;
      }
    }
    if (e.frozen > 0) { e.frozen -= dt; if (e.frozen <= 0) emote(e, "🥶"); }
    if (e.stun > 0) e.stun -= dt;

    // thrown creatures tumble until they land and slow down
    if (e.d.creature) {
      if (!e.tumble && !e.held && !e.carried && !e.d.fly && Math.hypot(e.vx, e.vy) > 260) e.tumble = true;
      if (e.tumble) {
        if (!e.onGround) e.va = e.vx / Math.max(4, e.r) * 0.6;
        if ((e.onGround || e.d.fly || e.sub > 0.4) && Math.hypot(e.vx, e.vy) < 50) { e.tumble = false; e.stun = Math.max(e.stun, 0.4); }
      }
      if (!e.tumble) {
        // stand back up
        e.va = 0;
        e.a = wrapAngle(e.a) * Math.exp(-12 * dt);
      }
    }

    if (e.sub > 0.3) {
      e.wet = Math.max(e.wet ?? 0, 1);
      if (e.burn > 0) { douse(e); steam(e); }
    }
    if (e.type === "fire" && world.water > e.h * 0.4) { e.dead = true; steam(e); continue; }
    if (e.type === "sprout" && world.water > 1) e.grow -= dt;
    for (const f of PER) f(e, dt);
    if (e.dead) continue;
    const busy = e.held || e.frozen > 0 || e.stun > 0 || e.tumble || e.infect || e.carried;
    if (e.d.creature && !busy) AI[e.type]?.(e, dt);
    else if (e.d.creature && e.carried && Math.random() < dt * 0.4) emote(e, pick(e.carried.type === "balloon" ? ["😲", "🎈", "😆"] : ["😱", "😨", "🆘"]));
    TICK[e.type]?.(e, dt);
  }

  const SUB = 3;
  for (let i = 0; i < SUB; i++) physics(dt / SUB);
  impacts();
  for (let i = world.parts.length - 1; i >= 0; i--) {
    const q = world.parts[i];
    q.vy += GRAV * (q.g ?? 1) * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if ((q.life -= dt) <= 0 || (q.y > view.ground && (q.g ?? 1) > 0)) world.parts.splice(i, 1);
  }

  // clean up the gone, and their effects
  const ents = world.ents;
  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i];
    if (!e.dead) continue;
    for (const f of Object.values(e.fxs)) f.stop?.();
    if (e.carry) e.carry.carried = null;
    if (e.carried) e.carried.carry = null;
    ents.splice(i, 1);
  }
}
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function clearWorld() {
  for (const e of world.ents) for (const f of Object.values(e.fxs)) f.stop?.();
  world.ents.length = 0;
  world.parts.length = 0;
  world.water = 0;
  timers.length = 0;
}

export function entityAt(x, y, pad = 4) {
  let best = null, bd = 1e9;
  for (const e of world.ents) {
    if (e.dead || e.type === "water" || e.type === "snow") continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r;
    if (d < pad && d < bd) { bd = d; best = e; }
  }
  return best;
}

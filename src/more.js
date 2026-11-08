// The second wave of emoji: more people and animals, weather and disasters, food, toys and tools.
// Each one plugs into the tables in game.js (DEFS, INIT, AI, TICK, PER, ZAP).
import { view, fx } from "./render.js";
import { FX } from "./effects.js";
import { sfx } from "./audio.js";
import {
  world, DEFS, INIT, AI, TICK, PER, ZAP, ON_EAT, GRAV, spawn, emote, hurt, ignite, douse, freeze, explode, strike,
  resize, nearest, dist, touching, isThreatTo, transform, pop, shatter, eat, walk, fly, wander, flee, steam, part, droplets, later, rnd, pick,
} from "./game.js";

const poofAt = (e, palette, light = 0.4) => fx(FX.poof, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light, ...(palette ? { palette } : {}) });
const DUST = ["#8a6a52", "#a08070", "#c0b0a0", "#6a5040"];
const MAGIC = ["#2b1252", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff"];
const SLIME = ["#0c2010", "#1f5a28", "#3e9a3a", "#8ad860", "#d8ffb0"];

/** Sparkles strung along a line, for spells, lasers and tongues. */
function beam(a, b, cols, n = 10, life = 0.25) {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    part(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, rnd(-6, 6), rnd(-6, 6), life * rnd(0.6, 1.2), pick(cols), 0);
  }
}

/** Mushroom or wizard: twice the size for a while. */
export function makeGiant(e, t = 12) {
  if (e.dead || !e.d.creature) return;
  if (!e.giant) { e.baseSize = e.size; e.baseMass = e.mass; e.size = Math.round(e.size * 1.8); e.mass *= 3; resize(e); }
  e.giant = t;
  sfx("rise", { x: e.x, rate: 0.8 });
  fx(FX.bloom, { x: Math.round(e.x), y: Math.round(e.y + e.h / 2), light: 0.6 });
  emote(e, "🤩");
}

// ---------------------------------------------------------------- the new emoji

Object.assign(DEFS, {
  // people
  baby: { ch: "👶", name: "아기", size: 12, hp: 15, mass: 0.6, solid: true, burn: true, creature: true, prey: true, brains: true,
    info: "엉금엉금 기어다녀요. 혼자 있으면 울어요. 시간이 지나면 어른이 돼요." },
  wizard: { ch: "🧙", name: "마법사", size: 15, hp: 40, mass: 1, solid: true, burn: true, creature: true, prey: true, brains: true,
    info: "가끔 근처 생물한테 마법을 걸어요. 개구리로 만들거나, 거대하게 키우거나, 풍선을 달아줘요." },
  robot: { density: 2.5, ch: "🤖", name: "로봇", size: 15, hp: 120, mass: 2.5, solid: true, creature: true, metal: true,
    info: "순찰하다 악당한테 레이저를 쏴요. 물에 젖으면 합선! 번개를 맞으면 오히려 충전돼요." },

  // animals
  cat: { ch: "🐈", name: "고양이", size: 14, hp: 25, mass: 0.8, solid: true, left: true, burn: true, creature: true, prey: true, toyLover: true,
    info: "쥐랑 물고기를 쫓아요. 강아지는 싫어해요. 가끔 낮잠을 자요." },
  mouse: { ch: "🐁", name: "쥐", size: 10, hp: 6, mass: 0.3, solid: true, left: true, burn: true, creature: true, prey: true,
    info: "쪼르르 돌아다녀요. 🧀 치즈를 좋아하고 고양이를 무서워해요." },
  frog: { ch: "🐸", name: "개구리", size: 12, hp: 12, mass: 0.5, solid: true, burn: true, creature: true, prey: true,
    info: "폴짝폴짝 뛰어다녀요. 혀를 날름 내밀어 벌을 잡아먹어요." },
  fish: { density: 1.0, ch: "🐟", name: "물고기", size: 12, hp: 10, mass: 0.5, solid: true, left: true, burn: true, creature: true, prey: true,
    info: "물 밖에선 파닥파닥! 💧를 뿌려주지 않으면 🍣가 돼요." },
  cow: { density: 0.75, ch: "🐄", name: "소", size: 22, hp: 80, mass: 4, solid: true, left: true, burn: true, creature: true, prey: true,
    info: "느긋하게 풀을 뜯어요. 가끔 💩를 싸요. UFO가 노려요." },
  penguin: { ch: "🐧", name: "펭귄", size: 14, hp: 25, mass: 0.9, solid: true, burn: true, creature: true, prey: true,
    info: "뒤뚱뒤뚱 걷다가 배로 쭉 미끄러져요. 얼음이랑 눈을 좋아해요." },
  monkey: { ch: "🐒", name: "원숭이", size: 14, hp: 30, mass: 0.9, solid: true, left: true, burn: true, creature: true, prey: true, brains: true,
    info: "장난꾸러기! 근처에 🍌를 던져요. 바나나를 밟으면 미끄러져요." },
  snail: { ch: "🐌", name: "달팽이", size: 10, hp: 8, mass: 0.5, solid: true, left: true, burn: true, creature: true, prey: true,
    info: "아주아주 느려요. 지나간 자리에 끈적한 자국을 남겨요." },
  dragon: { ch: "🐉", name: "드래곤", size: 32, hp: 260, mass: 5, solid: true, left: true, fly: true, creature: true, villain: true, threat: 120,
    info: "하늘을 날아다니며 불을 뿜어요. 히어로의 숙적이에요." },
  ufo: { ch: "🛸", name: "UFO", size: 22, hp: 100, mass: 3, solid: true, fly: true, creature: true, villain: true, threat: 100, metal: true,
    info: "하늘에서 빔을 쏴서 소랑 사람을 납치해 가요." },

  // nature and weather
  snow: { ch: "❄️", name: "눈", size: 7, hp: 1, mass: 0.1, sensor: true, g: 0.08, brush: 0.05,
    info: "꾹 누르면 눈이 펄펄. 불을 끄고, 많이 맞은 생물은 얼어요." },
  cactus: { density: 0.7, ch: "🌵", name: "선인장", size: 18, hp: 60, mass: 6, solid: true, burn: true, bounce: 0.05,
    info: "가시가 따끔! 닿은 생물은 튕겨나가고 풍선은 터져요." },
  mushroom: { ch: "🍄", name: "버섯", size: 11, hp: 5, mass: 0.3, solid: true, food: 10, giant: true,
    info: "먹으면 몸이 엄청 커져요. 잠깐 동안만요." },
  volcano: { ch: "🌋", name: "화산", size: 30, hp: 999, mass: 8, sensor: true,
    info: "땅이 흔들리더니 콰광! 불덩이랑 돌을 뿜어요." },
  cloud: { ch: "☁️", name: "비구름", size: 24, hp: 999, mass: 1, sensor: true, fly: true,
    info: "둥둥 떠다니며 비를 뿌려요. 나무랑 새싹이 좋아해요." },
  storm: { ch: "⛈️", name: "번개구름", size: 24, hp: 999, mass: 1, sensor: true, fly: true,
    info: "비를 뿌리다가 가끔 아래로 번개를 내리쳐요." },
  tornado: { ch: "🌪️", name: "회오리", size: 46, hp: 999, mass: 2, sensor: true,
    info: "거대한 회오리가 휩쓸고 다녀요. 닿는 건 다 빨아올려 빙글빙글 돌리다가 멀리 던져버려요. 물도 빨아들여요." },
  meteor: { ch: "☄️", name: "운석", size: 16, hp: 999, mass: 6, solid: true, bounce: 0,
    info: "하늘에서 비스듬히 날아와 쾅! 불바다를 만들어요." },

  // food
  banana: { ch: "🍌", name: "바나나", size: 11, hp: 5, mass: 0.3, solid: true, food: 15, slippery: true,
    info: "먹을 수도 있지만… 밟으면 미끄러져 꽈당!" },
  cheese: { ch: "🧀", name: "치즈", size: 11, hp: 5, mass: 0.3, solid: true, food: 15,
    info: "쥐가 냄새를 맡고 달려와요." },
  pizza: { ch: "🍕", name: "피자", size: 12, hp: 5, mass: 0.3, solid: true, food: 30, meat: true,
    info: "모두가 좋아해요. 사람, 강아지, 공룡까지." },
  sushi: { ch: "🍣", name: "초밥", size: 12, hp: 5, mass: 0.3, solid: true, food: 25, meat: true },

  // things
  nuke: { ch: "☢️", name: "핵폭탄", size: 16, hp: 999, mass: 2, solid: true, metal: true,
    info: "5초 뒤… 화면 전체를 날려버리는 거대한 버섯구름! 근처 모든 게 사라져요." },
  rocket: { ch: "🚀", name: "로켓", size: 14, hp: 1, mass: 1, solid: true, metal: true,
    info: "잠깐 뒤 불을 뿜으며 날아가요. 어딘가 부딪히면 펑!" },
  ball: { density: 0.3, ch: "🏀", name: "공", size: 13, hp: 999, mass: 0.5, solid: true, roll: true, bounce: 0.85, toy: true,
    info: "통통 잘 튀어요. 강아지랑 고양이가 쫓아가서 차요." },
  brick: { density: 2.5, ch: "🧱", name: "벽돌", size: 14, hp: 999, mass: 3, solid: true, bounce: 0.02,
    info: "무겁고 안 굴러가요. 쌓아서 벽을 만들어 보세요." },
  box: { density: 0.5, ch: "📦", name: "상자", size: 15, hp: 40, mass: 1.5, solid: true, burn: true, bounce: 0.05,
    info: "쌓을 수 있어요. 불에 타요." },
  gift: { density: 0.6, ch: "🎁", name: "선물", size: 14, hp: 1, mass: 0.8, solid: true, bounce: 0.2,
    info: "세게 던지거나 잠시 기다리면 열려요. 뭐가 나올까?" },
  magnet: { density: 3, ch: "🧲", name: "자석", size: 14, hp: 999, mass: 2, solid: true,
    info: "쇠붙이를 끌어당겨요. 폭탄, 로봇, 로켓, UFO까지!" },
  poop: { ch: "💩", name: "똥", size: 11, hp: 5, mass: 0.5, solid: true, roll: true, bounce: 0.1,
    info: "모두가 피해 다녀요. 강아지만 킁킁." },

  // tools
  heal: { ch: "💖", name: "치료", tool: true, brush: 0.15, info: "문지르면 생물이 다 나아요. 얼음도 녹고 불도 꺼져요." },
  hammer: { ch: "🔨", name: "망치", tool: true, brush: 0.3, info: "콩! 내려치면 다치고 기절해요. 달걀은 🍳, 얼음은 와장창." },
  wind: { ch: "💨", name: "바람", tool: true, brush: 0.02, info: "누른 채로 휙 그으면 그 방향으로 바람이 불어요." },
});

export const PALETTE = [
  { tab: "사람", items: ["person", "baby", "hero", "wizard", "robot", "zombie", "ghost"] },
  { tab: "동물", items: ["dino", "dragon", "chicken", "dog", "cat", "mouse", "frog", "fish", "cow", "penguin", "monkey", "snail", "bee"] },
  { tab: "블럭", items: ["bBrick", "bWood", "bGlass", "bDiamond", "bHoney", "bBouncy", "bTnt", "bGrass"] },
  { tab: "자연", items: ["fire", "water", "snow", "sprout", "cactus", "mushroom", "ice", "volcano"] },
  { tab: "날씨·재해", items: ["lightning", "cloud", "storm", "tornado", "meteor", "ufo", "hole"] },
  { tab: "음식", items: ["apple", "banana", "cheese", "pizza", "egg"] },
  { tab: "물건", items: ["bomb", "nuke", "rocket", "rock", "box", "ball", "balloon", "gift", "magnet", "poop"] },
  { tab: "도구", items: ["eraser", "heal", "hammer", "wind"] },
];

// ---------------------------------------------------------------- start-up state

Object.assign(INIT, {
  baby: (e) => (e.grow = rnd(22, 30)),
  wizard: (e) => (e.cd = rnd(3, 5)),
  robot: (e) => (e.cd = 0),
  cat: (e) => (e.nap = rnd(8, 15)),
  fish: (e) => (e.dry = 0),
  cow: (e) => (e.poo = rnd(10, 18)),
  monkey: (e) => (e.cd = rnd(3, 6)),
  dragon: (e) => (e.cd = rnd(2, 3)),
  ufo: (e) => { e.y = Math.min(e.y, view.ground - 70); },
  snow: (e) => { e.life = 8; e.vy = 20; },
  volcano: (e) => (e.cd = rnd(1.5, 3)),
  cloud: (e) => { e.y = Math.min(e.y, view.ground - 70); e.vx = pick([-18, 18]); },
  storm: (e) => { e.y = Math.min(e.y, view.ground - 70); e.vx = pick([-14, 14]); e.cd = rnd(2, 4); },
  tornado: (e) => { e.life = 12; e.dir = pick([-1, 1]); world.shake = Math.max(world.shake, 6); },
  meteor: (e) => {
    // it drops in from the top of the sky, a little slanted, straight at the spot you tapped. It starts on the
    // side toward the middle of the map, so the slant never pushes it out past a wall.
    const tx = e.x, ty = view.ground - e.r, y0 = e.r + 2, dir = tx < view.W / 2 ? 1 : -1;
    const room = dir > 0 ? view.W - e.r - 2 - tx : tx - e.r - 2;
    const off = Math.max(0, Math.min(Math.tan(0.35) * (ty - y0), room));
    e.x = tx + dir * off;
    e.y = y0;
    const dx = tx - e.x, dy = ty - y0, d = Math.hypot(dx, dy) || 1, sp = 420;
    e.vx = (dx / d) * sp; e.vy = (dy / d) * sp;
    e.nograv = true;
  },
  nuke: (e) => { e.fuse = 5; },
  rocket: (e) => { e.fuse = 0.8; e.heading = -Math.PI / 2 + rnd(-0.3, 0.3); },
  gift: (e) => (e.open = rnd(6, 9)),
  poop: (e) => (e.life = 25),
  box: (e) => (e.d.burnTime = 6),
});

// ---------------------------------------------------------------- how they act

Object.assign(AI, {
  baby(e, dt) {
    const th = nearest(e, isThreatTo(e));
    if (th) return flee(e, dt, th, 26);
    const food = nearest(e, (o) => o.d.food && !o.held, 60);
    if (food) { walk(e, dt, Math.sign(food.x - e.x) * 14); if (touching(e, food, 3)) eat(e, food); return; }
    const mom = nearest(e, (o) => o.type === "person", 120);
    if (!mom && Math.random() < dt * 0.4) emote(e, "😭");
    if (mom && Math.random() < dt * 0.15) emote(e, pick(["😊", "🍼"]));
    if (mom && Math.abs(mom.x - e.x) > 20) walk(e, dt, Math.sign(mom.x - e.x) * 12);
    else wander(e, dt, 8);
    e.grow -= dt;
    if (e.grow <= 0) { const p = transform(e, "person"); if (p) emote(p, "✨"); }
  },

  wizard(e, dt) {
    const th = nearest(e, isThreatTo(e));
    if (th && dist(e, th) < 50) return flee(e, dt, th, 55);
    e.cd -= dt;
    if (e.cd <= 0) {
      const t = nearest(e, (o) => o.d.creature && o.type !== "wizard" && o.type !== "ghost" && !o.held, 130);
      if (t) {
        e.cd = rnd(5, 8);
        e.face = Math.sign(t.x - e.x) || e.face;
        emote(e, "✨");
        sfx("magic", { x: e.x });
        beam({ x: e.x, y: e.y - e.h * 0.4 }, t, MAGIC, 14, 0.4);
        const big = t.mass >= 4;
        const spell = pick(big ? ["shrink", "float"] : ["frog", "frog", "giant", "float", "heal"]);
        later(0.35, () => {
          if (t.dead) return;
          poofAt(t, MAGIC, 0.6);
          if (spell === "frog" && t.type !== "frog") { const f = transform(t, "frog"); if (f) emote(f, "❓"); }
          else if (spell === "giant") makeGiant(t);
          else if (spell === "shrink") { t.hp = Math.min(t.hp, t.d.hp * 0.5); t.stun = 2; emote(t, "😵"); }
          else if (spell === "float") { const b = spawn("balloon", t.x, t.y - t.r - 12); if (b) { b.carry = t; t.carried = b; } }
          else { t.hp = t.d.hp; t.burn = 0; t.frozen = 0; emote(t, "🥰"); }
        });
        return;
      }
      e.cd = 1;
    }
    wander(e, dt, 14);
  },

  robot(e, dt) {
    if (e.wet > 0 && !e.shorted) {
      // water in the circuits
      e.shorted = 2.5;
      e.stun = 2.5;
      sfx("shock", { x: e.x });
      emote(e, "💥");
      fx(FX.hitSpark, { x: Math.round(e.x), y: Math.round(e.y), palette: ["#14143a", "#3a5ad0", "#a8d0ff", "#e4f2ff", "#ffffff"], light: 0.8 });
      return;
    }
    e.cd -= dt;
    const foe = nearest(e, (o) => o.d.villain && !o.held, 170);
    if (foe) {
      e.face = Math.sign(foe.x - e.x) || e.face;
      walk(e, dt, Math.abs(foe.x - e.x) > 60 ? e.face * 22 : 0);
      if (e.cd <= 0) {
        e.cd = e.charged > 0 ? 0.35 : 0.9;
        const eye = { x: e.x + e.face * 3, y: e.y - e.h * 0.2 };
        beam(eye, foe, ["#ff3a3a", "#ff8a8a", "#ffffff"], 16, 0.15);
        sfx("laser", { x: e.x });
        hurt(foe, 9, e);
        foe.vx += e.face * 40 / Math.sqrt(foe.mass);
        fx(FX.hitSpark, { x: Math.round(foe.x), y: Math.round(foe.y), light: 0.5 });
        if (Math.random() < 0.2) emote(e, pick(["🎯", "🤖"]));
      }
      return;
    }
    wander(e, dt, e.charged > 0 ? 40 : 18);
  },

  cat(e, dt) {
    const dog = nearest(e, (o) => o.type === "dog", 70);
    const th = dog || nearest(e, isThreatTo(e));
    if (th) { e.napping = 0; if (dog && Math.random() < dt) emote(e, "😾"); return flee(e, dt, th, 70); }
    if (e.napping > 0) {
      e.napping -= dt;
      if (Math.random() < dt * 0.8) emote(e, "💤", 0.9);
      return;
    }
    const prey = nearest(e, (o) => (o.type === "mouse" || o.type === "fish" || o.type === "chick") && !o.held && !o.carried, 160);
    if (prey) {
      walk(e, dt, Math.sign(prey.x - e.x) * 62);
      if (touching(e, prey, 3)) {
        prey.dead = true;
        sfx("chomp", { x: e.x, rate: 1.3 });
        fx(FX.hitSpark, { x: Math.round(prey.x), y: Math.round(prey.y), light: 0.5 });
        emote(e, "😼");
      }
      return;
    }
    if (playBall(e, dt, 55)) return;
    e.nap -= dt;
    if (e.nap <= 0) { e.nap = rnd(12, 20); e.napping = rnd(3, 5); e.vx = 0; return; }
    wander(e, dt, 16);
  },

  mouse(e, dt) {
    const cat = nearest(e, (o) => o.type === "cat", 90) || nearest(e, isThreatTo(e));
    if (cat) return flee(e, dt, cat, 78);
    const cheese = nearest(e, (o) => (o.type === "cheese" || o.type === "pizza") && !o.held, 240);
    if (cheese) {
      walk(e, dt, Math.sign(cheese.x - e.x) * 45);
      if (touching(e, cheese, 3)) eat(e, cheese);
      return;
    }
    // scurry, stop, sniff
    e.think -= dt;
    if (e.think <= 0) { e.think = rnd(0.3, 1.2); e.want = Math.random() < 0.4 ? 0 : pick([-1, 1]) * rnd(30, 50); }
    if (e.x < 15) e.want = 40; if (e.x > view.W - 15) e.want = -40;
    walk(e, dt, e.want, 14);
  },

  frog(e, dt) {
    const th = nearest(e, isThreatTo(e));
    const bug = nearest(e, (o) => o.type === "bee" || o.type === "snail", 120);
    if (bug && dist(e, bug) < 36) {
      // the tongue
      beam({ x: e.x, y: e.y - 2 }, bug, ["#ff6a8a", "#ff9ab0"], 8, 0.15);
      sfx("squish", { x: e.x, rate: 1.5 });
      bug.dead = true;
      emote(e, "😋");
      return;
    }
    e.think -= dt;
    if (e.onGround && e.think <= 0) {
      e.think = rnd(0.8, 1.8);
      const dir = th ? Math.sign(e.x - th.x) || 1 : bug ? Math.sign(bug.x - e.x) || 1 : pick([-1, 1]);
      const d = e.x < 20 ? 1 : e.x > view.W - 20 ? -1 : dir;
      e.vx = d * rnd(50, 80); e.vy = -rnd(170, 230); e.face = d;
      if (e.wet > 0 && Math.random() < 0.5) emote(e, "🎵");
    }
    if (e.onGround) e.vx *= 0.8;
  },

  fish(e, dt) {
    if (e.sub > 0.6 && world.water > e.h) {
      // home: swim about under the surface
      e.dry = 0;
      e.goalT = (e.goalT ?? 0) - dt;
      const top = view.ground - world.water;
      if (e.goalT <= 0 || !e.goal) { e.goalT = rnd(1.5, 3.5); e.goal = { x: rnd(e.r, view.W - e.r), y: rnd(top + e.r + 2, view.ground - e.r) }; }
      fly(e, dt, e.goal.x, Math.max(top + e.r + 2, e.goal.y), 45, 2);
      if (Math.random() < dt * 0.2) emote(e, pick(["😊", "🫧"]));
      if (Math.random() < dt * 2) part(e.x, e.y - e.r, rnd(-3, 3), -20, 0.6, "#d8f4ff", -0.05);
      return;
    }
    e.dry = e.wet > 0 ? 0 : e.dry + dt;
    if (e.dry > 25) { const s = transform(e, "sushi"); if (s) s.vy = -60; return; }
    if (e.dry > 15 && Math.random() < dt * 0.5) emote(e, pick(["😵", "💧"]));
    e.think -= dt;
    if (e.onGround && e.think <= 0) {
      // flop
      e.think = rnd(0.4, 1.1) * (e.dry > 15 ? 2 : 1);
      e.vx = rnd(-50, 50); e.vy = -rnd(90, 150); e.va = rnd(-12, 12); e.face = Math.sign(e.vx) || 1;
    }
    if (e.onGround) e.vx *= 0.85;
  },

  cow(e, dt) {
    const th = nearest(e, (o) => o.type === "dino" || o.type === "dragon" || o.type === "ufo" || o.type === "fire", 80);
    if (th) return flee(e, dt, th, 40);
    wander(e, dt, 9);
    if (Math.abs(e.vx) < 2 && Math.random() < dt * 0.3) e.peck = 0.6; // grazing
    if (Math.random() < dt * 0.06) emote(e, pick(["🎵", "🌿"]));
    e.poo -= dt;
    if (e.poo <= 0) { e.poo = rnd(15, 25); sfx("squish", { x: e.x, rate: 0.8 }); const p = spawn("poop", e.x - e.face * e.r, e.y + e.r * 0.4); if (p) p.vx = -e.face * 20; }
  },

  penguin(e, dt) {
    if (e.slide > 0) {
      e.slide -= dt;
      walk(e, dt, e.face * 110, 2);
      return;
    }
    const th = nearest(e, isThreatTo(e));
    if (th) return flee(e, dt, th, 40);
    const ice = nearest(e, (o) => o.type === "ice" || o.type === "snow", 220);
    if (ice && Math.random() < dt * 0.3) emote(e, "😍");
    if (ice && Math.abs(ice.x - e.x) > 18) walk(e, dt, Math.sign(ice.x - e.x) * 24);
    else wander(e, dt, 14);
    if (e.onGround && Math.abs(e.vx) > 10 && Math.random() < dt * 0.25) { e.slide = rnd(1, 1.8); emote(e, "😆"); }
  },

  monkey(e, dt) {
    const th = nearest(e, isThreatTo(e));
    if (th) return flee(e, dt, th, 70);
    e.cd -= dt;
    const t = nearest(e, (o) => o.d.creature && o.type !== "monkey" && !o.d.fly && !o.held, 140);
    if (t && e.cd <= 0) {
      // lob a banana at them
      e.cd = rnd(5, 9);
      e.face = Math.sign(t.x - e.x) || e.face;
      const b = spawn("banana", e.x + e.face * 6, e.y - 6);
      if (b) {
        const dx = t.x - e.x, T = 0.6;
        b.vx = dx / T; b.vy = -GRAV * T / 2; b.va = rnd(8, 14) * e.face;
      }
      emote(e, "😜");
      sfx("throw", { x: e.x });
      return;
    }
    const nana = nearest(e, (o) => o.type === "banana" && !o.held && o.t > 2, 150);
    if (nana && e.hp < e.d.hp) { walk(e, dt, Math.sign(nana.x - e.x) * 45); if (touching(e, nana, 3)) eat(e, nana); return; }
    wander(e, dt, 30);
    if (e.onGround && Math.random() < dt * 0.5) e.vy = -150;
  },

  snail(e, dt) {
    const th = nearest(e, isThreatTo(e));
    if (th) { e.vx = 0; if (Math.random() < dt) emote(e, "🫣"); return; } // hides
    wander(e, dt, 4);
    if (Math.random() < dt * 6) part(e.x - e.face * e.r * 0.6, e.y + e.r - 1, 0, 0, 3, pick(["#9ad890", "#c8f0b8"]), 0);
  },

  dragon(e, dt) {
    e.cd -= dt;
    const t = nearest(e, (o) => o.d.creature && o.type !== "dragon" && o.type !== "ghost" && !o.held, 280);
    if (t) {
      const side = Math.sign(e.x - t.x) || 1;
      fly(e, dt, t.x + side * 50, Math.min(view.ground - 40, t.y - 45) + Math.sin(e.t * 2) * 6, 70, 1.5);
      e.face = -side;
      if (e.cd <= 0 && dist(e, t) < 90) {
        e.cd = rnd(3, 5);
        emote(e, "💢");
        const mouth = { x: e.x - side * e.w * 0.4, y: e.y - e.h * 0.1 };
        sfx("growl", { x: e.x, rate: 0.8 });
        later(0.1, () => sfx("breath", { x: e.x }));
        // a stream of fire
        for (let i = 0; i < 14; i++) {
          later(i * 0.025, () => {
            const dx = t.x - mouth.x, dy = t.y - mouth.y, d = Math.hypot(dx, dy) || 1;
            for (let k = 0; k < 3; k++) part(mouth.x, mouth.y, (dx / d) * 200 + rnd(-30, 30), (dy / d) * 200 + rnd(-30, 30), rnd(0.25, 0.45), pick(["#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d"]), 0.1);
          });
        }
        later(0.35, () => {
          if (t.dead) return;
          ignite(t, 4);
          hurt(t, 10, e);
          spawn("fire", t.x + rnd(-6, 6), view.ground - 8);
        });
      }
    } else {
      e.patrol = e.patrol ?? pick([-1, 1]);
      if (e.x < 40) e.patrol = 1;
      if (e.x > view.W - 40) e.patrol = -1;
      fly(e, dt, e.x + e.patrol * 50, view.ground * 0.4 + Math.sin(e.t) * 15, 45, 1.5);
    }
  },

  ufo(e, dt) {
    const hover = Math.max(e.r + 4, Math.min(view.ground * 0.35, view.ground - 90));
    if (e.carry) {
      // reeling one in
      const c = e.carry;
      fly(e, dt, e.x, hover, 20, 3);
      if (c.dead || c.carried !== e) { e.carry = null; return; }
      if (dist(e, c) < e.r + c.r) {
        c.dead = true;
        e.carry = null;
        sfx("portal", { x: e.x, rate: 1.3 });
        fx(FX.collect, { x: Math.round(e.x), y: Math.round(e.y + 4), palette: ["#0c2010", "#1f8a48", "#5ef08a", "#c8ffd8", "#ffffff"], light: 0.8 });
        emote(e, "👽");
      }
      return;
    }
    const t = nearest(e, (o) => (o.type === "cow" ? 1 : o.d.brains) && !o.held && !o.carried && o.mass <= 4 && !o.dead) || null;
    const cow = nearest(e, (o) => o.type === "cow" && !o.held && !o.carried);
    const target = cow || t;
    if (target) {
      fly(e, dt, target.x, hover + Math.sin(e.t * 3) * 3, 70, 2);
      if (Math.abs(target.x - e.x) < 6 && target.y > e.y) {
        e.carry = target;
        target.carried = e;
        sfx("beam", { x: e.x });
        emote(target, "😱");
      }
    } else fly(e, dt, view.W / 2 + Math.sin(e.t * 0.6) * view.W * 0.35, hover, 50, 1);
  },
});

/** Dogs and cats chase a ball and kick it about. */
function playBall(e, dt, speed) {
  const ball = nearest(e, (o) => o.d.toy && !o.held, 150);
  if (!ball) return false;
  walk(e, dt, Math.sign(ball.x - e.x) * speed);
  if (touching(e, ball, 2) && Math.abs(ball.vx) < 120) {
    ball.vx = e.face * rnd(140, 220);
    ball.vy = -rnd(120, 200);
    if (Math.random() < 0.4) emote(e, pick(["😆", "⚽", "❤️"]));
  }
  return true;
}
const dogAI = AI.dog;
AI.dog = (e, dt) => {
  const busy = nearest(e, (o) => o.type === "zombie" || o.type === "ghost" || o.type === "dino" || o.type === "fire", 120);
  if (!busy && playBall(e, dt, 60)) return;
  dogAI(e, dt);
};

// ---------------------------------------------------------------- things

Object.assign(TICK, {
  snow(e, dt) {
    e.life -= dt;
    e.vx = Math.sin(e.t * 3 + e.id) * 14;
    if (e.life <= 0) { e.dead = true; return; }
    for (const o of world.ents) {
      if (o.dead || o === e || o.type === "snow" || !touching(e, o, 0)) continue;
      if (o.type === "fire") { o.life -= 2; e.dead = true; if (o.life <= 0) { o.dead = true; steam(o); } return; }
      if (o.burn > 0) { douse(o); e.dead = true; return; }
      if (o.type === "water") { o.dead = true; spawn("ice", o.x, o.y); e.dead = true; return; }
      if (o.d.creature && o.type !== "penguin" && o.type !== "ghost") {
        o.chill = (o.chill ?? 0) + 0.2;
        if (o.chill > 2.5) { o.chill = 0; freeze(o, 3); }
        else if (Math.random() < 0.15) emote(o, "🥶");
        e.dead = true;
        return;
      }
      if (o.d.solid) { e.dead = true; droplets(e.x, e.y, 2, ["#ffffff", "#d8f4ff"]); return; }
    }
    if (e.onGround) { droplets(e.x, e.y + e.r, 2, ["#ffffff", "#d8f4ff"]); e.dead = true; }
  },

  cactus(e, dt) {
    for (const o of world.ents) {
      if (o.dead || o === e || !touching(e, o, 1)) continue;
      if (o.type === "balloon") { pop(o); continue; }
      if (!o.d.creature || o.type === "ghost") continue;
      if ((o.prick ?? 0) > 0) continue;
      o.prick = 0.6;
      hurt(o, 5, e);
      sfx("smack", { x: o.x, rate: 1.4, vol: 0.6 });
      const dir = Math.sign(o.x - e.x) || 1;
      o.vx = dir * 150 / Math.sqrt(o.mass);
      o.vy = -120 / Math.sqrt(o.mass);
      emote(o, pick(["😣", "😫", "🌵"]));
      fx(FX.hitSpark, { x: Math.round((o.x + e.x) / 2), y: Math.round(o.y), light: 0.3 });
    }
  },

  volcano(e, dt) {
    e.cd -= dt;
    if (e.cd < 0.6 && e.cd > 0) world.shake = Math.max(world.shake, 1.5);
    if (Math.random() < dt * 6) part(e.x + rnd(-3, 3), e.y - e.h * 0.45, rnd(-6, 6), rnd(-30, -15), rnd(0.6, 1.2), pick(["#5a5060", "#7a7080"]), -0.02);
    if (e.cd > 0) return;
    e.cd = rnd(2.5, 4.5);
    world.shake = Math.max(world.shake, 5);
    sfx("boom", { x: e.x, vol: 0.7, rate: 0.8 });
    const top = { x: e.x, y: e.y - e.h * 0.45 };
    for (let i = 0; i < 18; i++) part(top.x, top.y, rnd(-80, 80), rnd(-260, -140), rnd(0.6, 1.1), pick(["#ffe26b", "#ff8a2a", "#f2561d", "#c9281f"]), 0.8);
    const n = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const f = spawn(Math.random() < 0.7 ? "fire" : "rock", top.x, top.y - 4);
      if (!f) continue;
      if (f.type === "rock") { f.size = 11; f.mass = 2; resize(f); }
      f.vx = rnd(-110, 110); f.vy = rnd(-300, -200);
    }
  },

  cloud(e, dt) { drift(e, dt, 0.12); },
  storm(e, dt) {
    drift(e, dt, 0.1);
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = rnd(3, 6); strike(e.x + rnd(-6, 6)); }
  },

  tornado(e, dt) {
    e.life -= dt;
    if (e.life <= 0) {
      e.dead = true;
      poofAt(e, ["#3a3440", "#5a5060", "#8a8090", "#b0a8b8", "#d0c8d8"], 0);
      for (let i = 0; i < 30; i++) part(e.x + rnd(-e.w, e.w) * 0.5, e.y + rnd(-e.h, e.h) * 0.5, rnd(-120, 120), rnd(-120, 40), rnd(0.4, 0.8), pick(DUST), 0.4);
      return;
    }
    // it wanders, changing its mind, and the ground shakes under it
    e.turn = (e.turn ?? 0) - dt;
    if (e.turn <= 0) { e.turn = rnd(1.2, 3); e.dir = pick([-1, 1]); }
    if (e.x < e.r + 4) e.dir = 1;
    if (e.x > view.W - e.r - 4) e.dir = -1;
    e.vx = e.dir * 60 + Math.sin(e.t * 2.3) * 30;
    e.face = Math.sin(e.t * 24) > 0 ? 1 : -1; // whirl
    world.shake = Math.max(world.shake, e.life < 1 ? 0 : 1.6);
    const base = e.y + e.h / 2, top = base - e.h * 3.2, R = e.w * 0.75;
    // dust kicked up at its foot and debris whipping round the funnel
    for (let i = 0; i < 4; i++) {
      part(e.x + rnd(-R, R), base - 1, rnd(-80, 80), rnd(-110, -40), rnd(0.3, 0.6), pick(DUST), 0.4);
      const h = rnd(0, 1), y = base - h * (base - top) * 0.7, w = R * (0.4 + h);
      const side = Math.random() < 0.5 ? -1 : 1;
      part(e.x + side * w, y, -side * rnd(60, 140) + e.vx, rnd(-60, -20), rnd(0.15, 0.3), pick(["#c0b8c8", "#a098a8", "#8a6a52", "#d8d0e0"]), 0);
    }
    // it drinks up the pool as spray
    if (world.water > 0.5) {
      world.water = Math.max(0, world.water - 2.5 * dt);
      for (let i = 0; i < 2; i++) part(e.x + rnd(-R, R) * 0.5, view.ground - world.water, rnd(-60, 60), rnd(-260, -160), rnd(0.4, 0.7), pick(["#9bdcff", "#d8f4ff"]), 0.6);
    }
    for (const o of world.ents) {
      if (o.dead || o === e || o.held || o.type === "tornado" || o.type === "volcano" || o.type === "cloud" || o.type === "storm" || o.type === "ufo" || o.type === "hole") continue;
      if (o.spun > 0) continue; // just thrown out; give it a moment
      const dx = e.x - o.x, height = base - o.y;
      // the funnel widens as it rises
      const reach = R * (1 + Math.max(0, height) / (base - top) * 1.2);
      if (Math.abs(dx) > reach || o.y < top - 10 || height < -10) continue;
      if (o.type === "fire") { o.dead = true; steam(o); continue; }
      const k = 1 / Math.sqrt(o.mass);
      if (o.y < top + 8) {
        // spat out of the top
        o.vx = (Math.random() < 0.5 ? -1 : 1) * rnd(260, 420) * k;
        o.vy = -rnd(60, 160) * k;
        o.spun = 1.2;
        if (o.d.creature) emote(o, pick(["😵", "😱", "🌀"]));
        continue;
      }
      // pulled in, swung round and up
      o.vx += (dx * 7 + Math.cos(e.t * 7 + o.id * 1.7) * 420) * dt * k;
      o.vy -= (GRAV + 900) * dt * k;
      o.vy = Math.max(o.vy, -260);
      o.va += 18 * dt;
      if (o.d.creature) { o.tumble = true; o.carried = null; if (Math.random() < dt * 1.5) emote(o, pick(["😵", "🌀", "😱"])); }
    }
  },

  meteor(e, dt) {
    if (Math.random() < 0.9) part(e.x + rnd(-2, 2), e.y + rnd(-2, 2), rnd(-20, 20) - e.vx * 0.2, rnd(-20, 20) - e.vy * 0.2, rnd(0.3, 0.6), pick(["#ffe26b", "#ff8a2a", "#f2561d", "#5a5060"]), 0);
    e.a = Math.atan2(e.vy, e.vx) - Math.PI * 0.75;
    // it goes off at the first thing it touches: the ground, a block, a creature, anything (impact holds the
    // hardest hit of the last frame, so a touch is never missed)
    const hit = e.t > 0.03 && (e.impact > 0 || e.onGround || e.y >= view.ground - e.r - 1 || Math.hypot(e.vx, e.vy) < 150);
    if (hit) {
      const x = e.x, y = e.y;
      explode(e, 80);
      world.shake = Math.max(world.shake, 12);
      for (let i = 0; i < 3; i++) { const f = spawn("fire", x + rnd(-25, 25), y - 4); if (f) { f.vx = rnd(-60, 60); f.vy = rnd(-120, -40); } }
    }
  },

  nuke(e, dt) {
    e.fuse -= dt;
    if (e.fuse > 0) {
      // the countdown: a beeping warning that gets faster
      e.beep = (e.beep ?? 0) - dt;
      if (e.beep <= 0) { e.beep = Math.max(0.12, e.fuse / 5); sfx("tick", { x: e.x, rate: 1.6, gap: 0 }); emote(e, e.fuse < 1.5 ? "‼️" : "⚠️", 0.3); }
      return;
    }
    const x = e.x, y = Math.min(view.ground, e.y + e.r);
    e.dead = true;
    fx(FX.nuke, { x: Math.round(x), y: Math.round(view.ground), light: 1.2 });
    sfx("boom", { x, gap: 0 }); later(0.15, () => sfx("explode", { x, gap: 0 })); later(0.4, () => sfx("thunder", { x, gap: 0 }));
    world.flash = 0.6; world.shake = 22; world.hitstop = 0.12;
    explode({ x, y, r: 8, dead: false }, Math.max(view.W, view.H) * 0.55);
    for (let i = 0; i < 10; i++) { const f = spawn("fire", x + rnd(-view.W * 0.4, view.W * 0.4), view.ground - 8); if (f) { f.vy = rnd(-200, -60); f.vx = rnd(-120, 120); } }
    // a lingering rumble and a second flash
    later(0.5, () => { world.shake = Math.max(world.shake, 14); world.flash = Math.max(world.flash, 0.25); });
    later(1.2, () => { world.shake = Math.max(world.shake, 8); });
  },
  rocket(e, dt) {
    if (e.fuse > 0) {
      e.fuse -= dt;
      e.a = e.heading + Math.PI / 4;
      if (Math.random() < 0.5) part(e.x, e.y + e.r, rnd(-10, 10), rnd(10, 30), 0.3, pick(["#c0b8c0", "#8a8090"]), -0.1);
      if (e.fuse <= 0) { e.burnTime = 2.4; e.nograv = true; emote(e, "🔥", 0.6); sfx("rocket", { x: e.x }); }
      return;
    }
    if (e.held) { e.fuse = 0.4; e.nograv = false; return; }
    e.burnTime -= dt;
    e.heading += Math.sin(e.t * 9 + e.id) * dt * 2.5;
    const sp = Math.min(260, 60 + (2.4 - e.burnTime) * 260);
    e.vx = Math.cos(e.heading) * sp;
    e.vy = Math.sin(e.heading) * sp;
    e.a = e.heading + Math.PI / 4;
    for (let i = 0; i < 2; i++) part(e.x - Math.cos(e.heading) * e.r, e.y - Math.sin(e.heading) * e.r, -Math.cos(e.heading) * 80 + rnd(-25, 25), -Math.sin(e.heading) * 80 + rnd(-25, 25), rnd(0.2, 0.4), pick(["#ffe26b", "#ffc23d", "#ff8a2a", "#c0b8c0"]), 0);
    const W = view.W, wall = e.x <= e.r + 1 || e.x >= W - e.r - 1 || e.y <= e.r + 1 || e.onGround;
    if (e.burnTime <= 0 || wall || (e.t > 1.4 && e.touched)) explode(e, 55);
  },

  gift(e, dt) {
    e.open -= dt;
    if (e.open > 0 && !(e.impactSeen > 220)) return;
    e.dead = true;
    sfx("coin", { x: e.x });
    fx(FX.collect, { x: Math.round(e.x), y: Math.round(e.y), light: 0.7 });
    poofAt(e);
    const pool = Object.keys(DEFS).filter((k) => DEFS[k].info && !DEFS[k].tool && k !== "gift" && k !== "meteor");
    const n = spawn(pick(pool), e.x, e.y - 4);
    if (n) { n.vy = -160; emote(n, pick(["🎉", "✨", "😲"])); }
  },

  magnet(e, dt) {
    for (const o of world.ents) {
      if (o.dead || o === e || !o.d.metal || o.held) continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d > 140 || d < 1) continue;
      const f = 30000 / (d * d + 600) * dt / Math.sqrt(o.mass);
      o.vx += (dx / d) * f * 12;
      o.vy += (dy / d) * f * 12;
      if (Math.random() < dt * 6) part(o.x + rnd(-3, 3), o.y + rnd(-3, 3), (dx / d) * 60, (dy / d) * 60, 0.25, pick(["#ff6a6a", "#8ab4ff"]), 0);
    }
  },

  poop(e, dt) {
    e.life -= dt;
    if (e.life <= 0) { e.dead = true; return; }
    if (Math.random() < dt * 3) part(e.x + rnd(-4, 4), e.y - e.r, rnd(-4, 4), rnd(-14, -8), 0.6, "#8a9a50", 0);
  },
});

function drift(e, dt, rate) {
  e.a = 0; e.va = 0;
  e.vy += ((view.ground * 0.25 + Math.sin(e.t * 0.8 + e.id) * 6) - e.y) * dt * 2 - e.vy * dt * 2;
  if (e.x < e.r + 2) e.vx = Math.abs(e.vx);
  if (e.x > view.W - e.r - 2) e.vx = -Math.abs(e.vx);
  if (Math.abs(e.vx) < 8) e.vx = pick([-15, 15]);
  e.rain = (e.rain ?? 0) - dt;
  if (e.rain <= 0) {
    e.rain = rate;
    const w = spawn("water", e.x + rnd(-e.w * 0.35, e.w * 0.35), e.y + e.h * 0.3);
    if (w) w.vy = 60;
  }
}

// ---------------------------------------------------------------- rules on everyone

PER.push((e, dt) => {
  if (e.prick > 0) e.prick -= dt;
  if (e.spun > 0) e.spun -= dt;
  // the pool
  if (e.sub > 0.3 && e.d.creature) {
    if (e.type === "cat" && Math.random() < dt * 1.5) emote(e, "😾");
    else if ((e.type === "frog" || e.type === "penguin" || e.type === "dog") && Math.random() < dt * 0.3) emote(e, pick(["😆", "🏊", "💦"]));
    else if (e.type === "person" && Math.random() < dt * 0.15) emote(e, pick(["🏊", "😆", "😨"]));
  }
  if (e.type === "snow" && world.water > 0.5 && e.y + e.r >= view.ground - world.water) e.dead = true;
  if (e.impact) e.impactSeen = Math.max(e.impactSeen ?? 0, e.impact);
  // the mushroom (or the wizard) wears off
  if (e.giant > 0) {
    e.giant -= dt;
    if (e.giant <= 0) { e.giant = 0; e.size = e.baseSize; e.mass = e.baseMass; resize(e); poofAt(e); emote(e, "😮"); }
  }
  if (e.charged > 0) e.charged -= dt;
  if (e.shorted > 0) {
    e.shorted -= dt;
    if (Math.random() < dt * 12) part(e.x + rnd(-e.r, e.r), e.y + rnd(-e.r, e.r), rnd(-40, 40), rnd(-60, -10), 0.2, pick(["#a8d0ff", "#ffffff", "#ffe26b"]), 0.5);
  }
  if (e.slide > 0 && !e.onGround) e.slide = 0;
  // whoever walks onto a banana goes flying
  if (e.d.creature && e.onGround && !e.tumble && !e.held && e.type !== "monkey" && Math.abs(e.vx) > 15) {
    for (const o of world.ents) {
      if (o.dead || !o.d.slippery || o.held || o.t < 0.8 || !touching(e, o, 0)) continue;
      e.tumble = true;
      e.vy = -170;
      e.vx *= 1.6;
      e.va = Math.sign(e.vx) * 9;
      o.vx = -e.vx * 0.5;
      sfx("throw", { x: e.x, rate: 1.3 });
      emote(e, pick(["😵", "🍌", "😲"]));
      break;
    }
  }
  // everyone but the dog keeps away from poop
  if (e.d.brains && e.onGround && !e.tumble && e.type !== "dog") {
    const p = nearest(e, (o) => o.type === "poop", 26);
    if (p) { e.vx += Math.sign(e.x - p.x) * 200 * dt; if (Math.random() < dt * 1.5) emote(e, "🤢"); }
  }
  if (e.type === "dog") {
    const p = nearest(e, (o) => o.type === "poop", 20);
    if (p && Math.random() < dt * 0.6) emote(e, "👃");
  }
});

// food with a twist
ON_EAT.push((e, food) => { if (food.d.giant) makeGiant(e); });

// lightning: the robot is recharged by it, clouds don't mind
Object.assign(ZAP, {
  robot(o) { o.hp = o.d.hp; o.charged = 10; o.shorted = 0; o.stun = 0; emote(o, "⚡"); fx(FX.collect, { x: Math.round(o.x), y: Math.round(o.y), palette: ["#14143a", "#3a5ad0", "#a8d0ff", "#e4f2ff", "#ffffff"], light: 0.8 }); },
  cloud() {}, storm() {}, volcano() {}, tornado() {}, magnet() {}, brick() {},
  rocket(o) { o.fuse = Math.min(o.fuse ?? 0, 0.05); },
});

// ---------------------------------------------------------------- tools

/** Tools act where you press: once on tap, again and again while held (each def's `brush`). */
export const TOOLS = {
  lightning: (x) => strike(x),
  eraser(x, y) {
    const e = entityNear(x, y, 6);
    if (e) { e.dead = true; poofAt(e); sfx("erase", { x }); return; }
    if (world.water > 0 && y > view.ground - world.water - 6) {
      // the sponge soaks up the pool
      world.water = Math.max(0, world.water - 0.6);
      sfx("drip", { x, gap: 0.12 });
      droplets(x, y, 1, ["#9bdcff", "#d8f4ff"]);
    }
  },
  heal(x, y) {
    for (const o of world.ents) {
      if (o.dead || !o.d.creature || Math.hypot(o.x - x, o.y - y) > o.r + 14) continue;
      const sick = o.hp < o.d.hp || o.burn > 0 || o.frozen > 0 || o.stun > 0 || o.infect;
      o.hp = Math.max(o.hp, o.d.hp);
      o.burn = 0; o.frozen = 0; o.stun = 0; o.infect = 0; o.chill = 0;
      if (sick) { sfx("heal", { x: o.x, gap: 0.4 }); fx(FX.bloom, { x: Math.round(o.x), y: Math.round(o.y + o.h / 2), light: 0.6 }); emote(o, "🥰"); }
    }
    droplets(x, y, 3, ["#ff8ab0", "#ffc0d8", "#ffffff"]);
  },
  hammer(x, y) {
    let any = false;
    for (const o of world.ents) {
      if (o.dead || Math.hypot(o.x - x, o.y - y) > o.r + 8) continue;
      any = true;
      if (o.type === "egg") { transform(o, "fried"); continue; }
      if (o.type === "ice") { shatter(o); continue; }
      if (o.type === "bomb") { o.fuse = 0.05; continue; }
      if (o.type === "balloon") { pop(o); continue; }
      if (o.type === "gift") { o.open = 0; continue; }
      if (o.type === "robot" || o.type === "brick" || o.type === "rock") { o.vy -= 40; emote(o, "💢"); continue; }
      o.vy = -160 / Math.sqrt(o.mass);
      if (o.d.creature) { o.stun = Math.max(o.stun, 1.2); emote(o, pick(["😵", "💫", "🤕"])); }
      hurt(o, 25);
    }
    fx(FX.bluntHit, { x: Math.round(x), y: Math.round(y + 4), light: 0.4 });
    sfx(any ? "wood" : "tap", { x });
    world.shake = Math.max(world.shake, any ? 4 : 2);
  },
  wind(x, y, p) {
    // blow along the drag, or outward from a still finger
    const sp = Math.hypot(p.vx, p.vy);
    for (const o of world.ents) {
      if (o.dead || o.held || o.type === "volcano") continue;
      const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy);
      if (d > 50) continue;
      const k = (1 - d / 50) / Math.sqrt(o.mass);
      if (sp > 40) { o.vx += (p.vx / sp) * 900 * k * 0.02; o.vy += (p.vy / sp) * 900 * k * 0.02 - 4 * k; }
      else { o.vx += (dx / (d || 1)) * 14 * k; o.vy += (dy / (d || 1)) * 14 * k - 4 * k; }
      if (o.d.creature && k > 0.3 && Math.random() < 0.05) { o.tumble = true; emote(o, "😵"); }
      if (o.type === "fire" && Math.random() < 0.05) { o.dead = true; steam(o); }
    }
    sfx("whoosh", { x, vol: 0.5, gap: 0.25, rate: 0.8 + Math.random() * 0.4 });
    const dir = sp > 40 ? [p.vx / sp, p.vy / sp] : [rnd(-1, 1), rnd(-1, 1)];
    part(x + rnd(-8, 8), y + rnd(-8, 8), dir[0] * 160, dir[1] * 160, 0.25, pick(["#ffffff", "#d8ecf8", "#b8d8ec"]), 0);
  },
};

function entityNear(x, y, pad) {
  let best = null, bd = 1e9;
  for (const e of world.ents) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r;
    if (d < pad && d < bd) { bd = d; best = e; }
  }
  return best;
}

// the dino and the zombie learn about the new menu
DEFS.zombie.info = "느릿느릿 사람·아기·원숭이를 쫓아가요. 물리면 좀비가 돼요. 불에 약해요.";
DEFS.dino.info = "크고 무거워요. 눈에 보이는 동물이랑 사람을 쫓아가 한입에 먹고 점점 커져요.";
DEFS.hero.info = "날아다니며 공룡·좀비·드래곤·UFO를 찾아가 한 방 먹여요.";

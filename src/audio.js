// Sound: CC0 effects through WebAudio (random variant, a little pitch wobble, panned to where it happened,
// rate-limited so a pile of falling apples doesn't turn into noise) and lo-fi music that crossfades.
import { view } from "./render.js";
import manifest from "../assets/audio/sfx/manifest.json";

const BASE = "assets/audio/";
const PREFS = "emojibox.audio.v1";
export const prefs = { music: true, sfx: true };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch {}
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch {} };

// how loud each kind of sound sits in the mix
const GAIN = {
  place: 0.45, grab: 0.4, throw: 0.45, click: 0.5, tick: 0.4, open: 0.45, back: 0.45, save: 0.55, delete: 0.5, whoosh: 0.5,
  thud: 0.45, tap: 0.3, rock: 0.55, metal: 0.45, glass: 0.45, shatter: 0.6, wood: 0.5, punch: 0.6, smack: 0.5, heavy: 0.65,
  chomp: 0.7, burp: 0.45, roar: 0.6, growl: 0.5, zombie: 0.35, explode: 0.75, boom: 0.85, thunder: 0.8, crackle: 0.45, shock: 0.5,
  laser: 0.35, fire: 0.4, breath: 0.5, rocket: 0.5, splash: 0.5, drip: 0.18, squish: 0.45, magic: 0.55, portal: 0.5, beam: 0.4,
  coin: 0.45, rise: 0.45, heal: 0.45, death: 0.35, pop: 0.55, pluck: 0.5, erase: 0.4, wind: 0.5,
};

let ac = null, out = null;
const buffers = {}, last = {};
let voices = 0;

async function load(file) {
  if (buffers[file] !== undefined) return;
  buffers[file] = null;
  try {
    const res = await fetch(BASE + "sfx/" + file);
    buffers[file] = await ac.decodeAudioData(await res.arrayBuffer());
  } catch { buffers[file] = null; }
}

/** Browsers only allow sound after a tap or click: call this from one. */
export function unlock() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    out = ac.createDynamicsCompressor();
    out.threshold.value = -14;
    out.ratio.value = 4;
    out.connect(ac.destination);
    for (const files of Object.values(manifest)) for (const f of files) load(f);
  }
  if (ac.state === "suspended") ac.resume();
  if (want && prefs.music && !playing) playMusic(want, true);
}

/**
 * Play a sound. o.x: where it happened (pans it), o.vol: 0..1 loudness, o.rate: pitch, o.gap: the least time
 * between two of the same kind.
 */
export function sfx(key, o = {}) {
  if (!prefs.sfx || !ac || ac.state !== "running") return;
  const files = manifest[key];
  if (!files) return;
  const now = ac.currentTime, gap = o.gap ?? 0.06;
  if (last[key] !== undefined && now - last[key] < gap) return;
  if (voices > 20) return;
  const buf = buffers[files[(Math.random() * files.length) | 0]];
  if (!buf) return;
  last[key] = now;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (o.rate ?? 1) * (0.93 + Math.random() * 0.14);
  const g = ac.createGain();
  g.gain.value = Math.min(1.2, (o.vol ?? 1) * (GAIN[key] ?? 0.5));
  let node = src.connect(g);
  if (o.x !== undefined && ac.createStereoPanner) {
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, (o.x / view.W) * 2 - 1)) * 0.6;
    node = node.connect(p);
  }
  node.connect(out);
  voices++;
  src.onended = () => voices--;
  src.start();
}

// a looping sound that swells while something is around (the tornado's wind)
const loops = {};
export function loopSound(key, level) {
  if (!ac || ac.state !== "running") return;
  let L = loops[key];
  const target = prefs.sfx ? Math.min(1, level) * (GAIN[key] ?? 0.5) : 0;
  if (!L) {
    if (target <= 0) return;
    const buf = buffers[manifest[key]?.[0]];
    if (!buf) return;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ac.createGain();
    g.gain.value = 0;
    src.connect(g).connect(out);
    src.start();
    L = loops[key] = { src, g };
  }
  L.g.gain.setTargetAtTime(target, ac.currentTime, 0.25);
  if (target <= 0 && L.g.gain.value < 0.01) { L.src.stop(); delete loops[key]; }
}

// ---------------------------------------------------------------- music

const TRACKS = { title: "title.mp3", day: "day.mp3", dusk: "dusk.mp3", night: "night.mp3" };
const MUSIC_VOL = 0.4;
const els = {};
let want = null, playing = null;

function el(name) {
  if (!els[name]) {
    const a = new Audio(BASE + "music/" + TRACKS[name]);
    a.loop = true;
    a.preload = "none";
    a.volume = 0;
    els[name] = a;
  }
  return els[name];
}
function fade(a, to, ms, done) {
  clearInterval(a._fade);
  const from = a.volume, t0 = performance.now();
  a._fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) { clearInterval(a._fade); done?.(); }
  }, 40);
}
function playMusic(name, force = false) {
  if (!force && playing === name) return;
  if (playing && playing !== name) { const old = el(playing); fade(old, 0, 900, () => old.pause()); }
  playing = name;
  const a = el(name);
  a.play().then(() => fade(a, MUSIC_VOL, 1200)).catch(() => { playing = null; });
}

/** Ask for a track (title, day, dusk, night); it starts once sound is allowed. */
export function music(name) {
  want = name;
  if (!prefs.music || !ac || ac.state !== "running") return;
  playMusic(name);
}

export function setPref(k, v) {
  prefs[k] = v;
  savePrefs();
  if (k === "music") {
    if (!v && playing) { const a = el(playing); fade(a, 0, 400, () => a.pause()); playing = null; }
    if (v && want) { unlock(); playMusic(want, true); }
  }
  if (k === "sfx" && !v) for (const key of Object.keys(loops)) loopSound(key, 0);
}

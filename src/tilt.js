// Tilt gravity: the phone's orientation sensor turns which way "down" is in the world.
import { world } from "./game.js";

export const tilt = { on: false, seen: false, target: { x: 0, y: 1 } };

/** Is there an orientation sensor API at all? (Desktops have the API but never send readings.) */
export const tiltSupported = () => typeof window !== "undefined" && "DeviceOrientationEvent" in window;

function onOrientation(ev) {
  if (ev.beta == null || ev.gamma == null) return;
  tilt.seen = true;
  const b = (ev.beta * Math.PI) / 180, g = (ev.gamma * Math.PI) / 180;
  // the pull of gravity across the screen, in the phone's own portrait axes (x right, y down)
  let x = Math.cos(b) * Math.sin(g), y = Math.sin(b);
  // turn it to match how the screen is rotated
  const a = (((screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI) / 180);
  [x, y] = [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
  const m = Math.hypot(x, y);
  // lying flat there's no clear way down: keep the last one
  if (m < 0.15) return;
  tilt.target = { x: x / m, y: y / m };
}

/**
 * Turn tilt gravity on. On iPhone and iPad this has to come from a tap, and asks the player for permission.
 * Resolves "ok", "denied" or "unsupported".
 */
export async function enableTilt() {
  if (!tiltSupported()) return "unsupported";
  const D = window.DeviceOrientationEvent;
  if (typeof D.requestPermission === "function") {
    try { if ((await D.requestPermission()) !== "granted") return "denied"; } catch { return "denied"; }
  }
  if (!tilt.on) addEventListener("deviceorientation", onOrientation);
  tilt.on = true;
  return "ok";
}
export function disableTilt() {
  removeEventListener("deviceorientation", onOrientation);
  tilt.on = false;
  tilt.target = { x: 0, y: 1 };
}
/** iOS asks before any reading arrives; elsewhere it just works. */
export const tiltNeedsTap = () => typeof window.DeviceOrientationEvent?.requestPermission === "function";

/** Ease the world's gravity toward the phone's, so a jittery sensor doesn't shake everything. */
export function updateTilt(dt) {
  const t = tilt.on ? tilt.target : { x: 0, y: 1 }, k = Math.min(1, dt * 8);
  let x = world.grav.x + (t.x - world.grav.x) * k, y = world.grav.y + (t.y - world.grav.y) * k;
  const m = Math.hypot(x, y) || 1;
  world.grav.x = x / m;
  world.grav.y = y / m;
}

import { useSyncExternalStore } from "react";
import { hasWebGL, prefersReducedMotion, qualityTier } from "../lib/device";

/**
 * Shared state for the 3D universe.
 *
 * `universe` holds React-visible state (changes cause re-renders).
 * `motion` holds values that change every frame (camera station, intro
 * progress, pointer): read directly inside useFrame, never via React
 * state, so animations don't trigger re-renders.
 */

const MODE_KEY = "aiu:mode";

function initialMode(webgl) {
  if (!webgl) return "lite";
  try {
    return localStorage.getItem(MODE_KEY) === "lite" ? "lite" : "immersive";
  } catch {
    return "immersive";
  }
}

const webgl = typeof window !== "undefined" && hasWebGL();

let state = {
  webgl,
  mode: initialMode(webgl), // "immersive" (3D) | "lite" (2D fallback)
  quality: qualityTier(),
  reducedMotion: prefersReducedMotion(),
  canvasReady: false,
  introDone: false,
  station: 0, // nearest station index, for the HUD
};

const listeners = new Set();

export const universe = {
  get: () => state,
  set(patch) {
    const next = { ...state, ...patch };
    if (Object.keys(patch).every((k) => Object.is(state[k], next[k]))) return;
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setMode(mode) {
    const value = mode === "lite" || !state.webgl ? "lite" : "immersive";
    try {
      localStorage.setItem(MODE_KEY, value);
    } catch {
      /* storage unavailable: preference just isn't remembered */
    }
    universe.set({ mode: value, introDone: value === "lite" ? true : state.introDone });
  },
};

export function useUniverse(selector) {
  return useSyncExternalStore(universe.subscribe, () => selector(state));
}

export const motion = {
  station: 0, // continuous station position driven by scroll (e.g. 0.4 = 40% from station 0 to 1)
  intro: { dolly: 1, orbit: 0.9, reveal: 0, stars: 0, grid: 0 },
  pointer: { x: 0, y: 0 },
  // Focus mode: blend 0 = follow scroll, 1 = close-up of motion.focusKey. zoom scales the distance.
  focus: { blend: 0, zoom: 1 },
  focusKey: null,
};

/** Puts every intro value at its finished state (used for skip / reduced motion / repeat visits). */
export function finishIntroValues() {
  Object.assign(motion.intro, { dolly: 0, orbit: 0, reveal: 1, stars: 1, grid: 1 });
}

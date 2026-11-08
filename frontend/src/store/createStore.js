import { useSyncExternalStore } from "react";

/**
 * Minimal external store: React components subscribe with `useStore`,
 * while 3D code can read `store.get()` inside useFrame without
 * causing any re-render.
 */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  const store = {
    get: () => state,
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : patch;
      if (Object.keys(next).every((k) => Object.is(state[k], next[k]))) return;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const useStore = (selector) => useSyncExternalStore(store.subscribe, () => selector(state));
  return [store, useStore];
}

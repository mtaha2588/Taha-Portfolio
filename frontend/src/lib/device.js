/** Device capability checks used to pick the right experience. */

export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * "high" for capable desktops, "low" for phones and modest hardware.
 * The 3D scene uses this to scale particle counts, resolution and
 * post-processing so it stays smooth everywhere.
 */
export function qualityTier() {
  if (typeof window === "undefined") return "low";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  if ((coarse && small) || cores <= 4 || memory <= 4) return "low";
  return "high";
}

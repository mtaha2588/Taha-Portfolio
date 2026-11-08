import { CanvasTexture, SRGBColorSpace } from "three";

const cache = new Map();

/** Soft radial-gradient sprite texture generated at runtime (cached), so no image downloads are needed. */
export function glowTexture(inner, outer = "rgba(0,0,0,0)") {
  const key = `${inner}|${outer}`;
  if (cache.has(key)) return cache.get(key);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

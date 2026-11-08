/**
 * Browser-side fallback for the avalanche terrain, used only when the
 * backend demo API can't be reached. Same approach as the backend
 * (ridged fractal noise around a central massif, Horn's method for
 * slope); the exact peaks differ because the random generators differ.
 */
import { mulberry32 } from "./random";

const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);

function valueNoise(seed, cells) {
  const rand = mulberry32(seed);
  const grid = Array.from({ length: cells + 1 }, () => Array.from({ length: cells + 1 }, rand));
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const xi = Math.min(Math.floor(x), cells - 1);
    const yi = Math.min(Math.floor(y), cells - 1);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const top = grid[yi][xi] + (grid[yi][xi + 1] - grid[yi][xi]) * tx;
    const bottom = grid[yi + 1][xi] + (grid[yi + 1][xi + 1] - grid[yi + 1][xi]) * tx;
    return top + (bottom - top) * ty;
  };
}

const CLASSES = [
  { id: 0, label: "< 25°" },
  { id: 1, label: "25–30°" },
  { id: 2, label: "30–45°" },
  { id: 3, label: "> 45°" },
];
const classOf = (s) => (s < 25 ? 0 : s < 30 ? 1 : s <= 45 ? 2 : 3);

export function localTerrain(size = 64, seed = 7, extentM = 8000) {
  const octaves = Array.from({ length: 5 }, (_, i) => valueNoise(seed * 31 + i, 3 * 2 ** i));
  const elevation = new Array(size * size);
  for (let r = 0; r < size; r++) {
    const v = r / (size - 1);
    for (let c = 0; c < size; c++) {
      const u = c / (size - 1);
      let ridged = 0;
      let amp = 0.5;
      let total = 0;
      for (const n of octaves) {
        const k = 1 - Math.abs(n(u, v) * 2 - 1);
        ridged += k * k * amp;
        total += amp;
        amp *= 0.5;
      }
      ridged /= total;
      const dx = u - 0.5;
      const dy = v - 0.52;
      const radial = Math.max(0, 1 - Math.hypot(dx, dy) / 0.62);
      elevation[r * size + c] = 3200 + 3400 * (0.62 * radial ** 1.6 + 0.38 * ridged * (0.35 + 0.65 * radial));
    }
  }

  const cell = extentM / (size - 1);
  const z = (r, c) => elevation[Math.min(Math.max(r, 0), size - 1) * size + Math.min(Math.max(c, 0), size - 1)];
  const slope = new Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dzdx =
        (z(r - 1, c + 1) + 2 * z(r, c + 1) + z(r + 1, c + 1) - (z(r - 1, c - 1) + 2 * z(r, c - 1) + z(r + 1, c - 1))) /
        (8 * cell);
      const dzdy =
        (z(r + 1, c - 1) + 2 * z(r + 1, c) + z(r + 1, c + 1) - (z(r - 1, c - 1) + 2 * z(r - 1, c) + z(r - 1, c + 1))) /
        (8 * cell);
      slope[r * size + c] = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
    }
  }
  const slopeClass = slope.map(classOf);
  const classes = CLASSES.map((cl) => ({
    ...cl,
    share_pct: Math.round((1000 * slopeClass.filter((x) => x === cl.id).length) / slopeClass.length) / 10,
  }));

  return {
    synthetic: true,
    seed,
    size,
    cell_size_m: cell,
    min_elevation_m: Math.min(...elevation),
    max_elevation_m: Math.max(...elevation),
    elevation_m: elevation,
    slope_deg: slope,
    slope_class: slopeClass,
    classes,
    method: "Procedural ridged-noise DEM; slope via Horn's 3x3 method (generated in the browser)",
  };
}

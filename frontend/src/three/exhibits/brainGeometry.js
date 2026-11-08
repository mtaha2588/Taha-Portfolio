import { mulberry32 } from "../../lib/random";

/**
 * Procedural "neural core": a brain-shaped point cloud (two folded
 * hemispheres + cerebellum) and filament lines joining nearby nodes,
 * plus a few fibres radiating outward. Returns flat typed arrays ready
 * for BufferGeometry attributes.
 */
export function buildBrain({ count = 5200, scale = 2.1, seed = 3 } = {}) {
  const rand = mulberry32(seed);
  const pts = [];

  // Pseudo-noise fold pattern that reads like cortical gyri.
  const fold = (x, y, z) =>
    Math.sin(x * 9.1 + 1.3) * Math.cos(y * 8.3) +
    Math.sin(z * 7.7 + 2.1) * Math.cos(x * 10.2) +
    Math.sin(y * 11.3 + z * 6.1) * 0.6;

  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const x = Math.cos(t) * s;
    let y = u;
    const z = Math.sin(t) * s;

    if (rand() < 0.09) {
      // Cerebellum: small, finely ridged lobe at the lower back.
      const r = 1 + 0.07 * Math.sin(y * 34);
      pts.push([x * 0.55 * r, -0.52 + y * 0.3 * r, -0.85 + z * 0.36 * r]);
      continue;
    }
    const r = (1 + 0.055 * fold(x, y, z)) * (1 - rand() * 0.035);
    if (y < -0.25) y = -0.25 + (y + 0.25) * 0.45; // flatter base
    const gap = Math.sign(x || 1) * 0.06; // groove between hemispheres
    pts.push([x * 0.9 * r + gap, y * 0.74 * r, z * 1.18 * r]);
  }

  const positions = new Float32Array(pts.length * 3);
  const rands = new Float32Array(pts.length);
  pts.forEach((p, i) => {
    positions.set([p[0] * scale, p[1] * scale, p[2] * scale], i * 3);
    rands[i] = rand();
  });

  // Filaments: connect each node to up to two near neighbours (spatial hash for speed).
  const cell = 0.2 * scale;
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const buckets = new Map();
  for (let i = 0; i < pts.length; i++) {
    const k = key(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(i);
  }
  const linePos = [];
  const lineT = [];
  const lineSeed = [];
  const maxD2 = (0.16 * scale) ** 2;
  const seen = new Set();
  for (let i = 0; i < pts.length; i += 2) {
    const ax = positions[i * 3];
    const ay = positions[i * 3 + 1];
    const az = positions[i * 3 + 2];
    const cx = Math.floor(ax / cell);
    const cy = Math.floor(ay / cell);
    const cz = Math.floor(az / cell);
    const near = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          for (const j of buckets.get(`${cx + dx},${cy + dy},${cz + dz}`) || []) {
            if (j === i) continue;
            const d2 =
              (positions[j * 3] - ax) ** 2 + (positions[j * 3 + 1] - ay) ** 2 + (positions[j * 3 + 2] - az) ** 2;
            if (d2 < maxD2) near.push([d2, j]);
          }
        }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, j] of near.slice(0, 2)) {
      const id = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const sd = rand();
      linePos.push(ax, ay, az, positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
      lineT.push(0, 1);
      lineSeed.push(sd, sd);
    }
  }

  // Fibres radiating out of the surface, like energy escaping the core.
  for (let k = 0; k < 140; k++) {
    const i = Math.floor(rand() * pts.length);
    const p = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const len = 1.06 + rand() * 0.28;
    const sd = rand();
    linePos.push(...p, p[0] * len, p[1] * len, p[2] * len);
    lineT.push(0, 1);
    lineSeed.push(sd, sd);
  }

  return {
    positions,
    rands,
    lines: { positions: new Float32Array(linePos), t: new Float32Array(lineT), seed: new Float32Array(lineSeed) },
  };
}

import { BufferAttribute, BufferGeometry } from "three";

/**
 * Procedural car body, lofted from cross-sections.
 *
 * The roofline is a set of control points along the car's length
 * (rear → front). Every cross-section is a rounded "superellipse"
 * whose upper part narrows to form the cabin (tumblehome). The
 * result is a smooth closed surface plus a wireframe made of section
 * rings and longitudinal lines, the look of a design-studio hologram.
 *
 * Axes: length along X (front = +X), width along Z, height along Y,
 * ground at y = 0.
 */

// u = 0 (rear) … 1 (front). Values are heights in metres-ish units.
export const BODY_TYPES = {
  coupe: {
    length: 4.5,
    width: 1.95,
    clearance: 0.14,
    wheel: 0.34,
    wheelbase: [0.18, 0.79],
    belt: 0.7,
    roof: [
      [0, 0.72],
      [0.08, 0.84],
      [0.25, 1.02],
      [0.42, 1.16],
      [0.55, 1.14],
      [0.66, 0.86],
      [0.85, 0.66],
      [1, 0.46],
    ],
  },
  sedan: {
    length: 4.8,
    width: 1.88,
    clearance: 0.17,
    wheel: 0.33,
    wheelbase: [0.19, 0.78],
    belt: 0.86,
    roof: [
      [0, 0.88],
      [0.1, 0.96],
      [0.24, 1.04],
      [0.34, 1.4],
      [0.56, 1.42],
      [0.68, 1.02],
      [0.86, 0.86],
      [1, 0.58],
    ],
  },
  suv: {
    length: 4.7,
    width: 1.98,
    clearance: 0.26,
    wheel: 0.38,
    wheelbase: [0.18, 0.79],
    belt: 1.08,
    roof: [
      [0, 1.22],
      [0.05, 1.68],
      [0.2, 1.76],
      [0.55, 1.78],
      [0.7, 1.35],
      [0.86, 1.12],
      [1, 0.82],
    ],
  },
  hatchback: {
    length: 4.05,
    width: 1.8,
    clearance: 0.16,
    wheel: 0.31,
    wheelbase: [0.17, 0.81],
    belt: 0.86,
    roof: [
      [0, 0.95],
      [0.04, 1.36],
      [0.2, 1.46],
      [0.5, 1.46],
      [0.66, 1.06],
      [0.86, 0.86],
      [1, 0.6],
    ],
  },
  minivan: {
    length: 5.0,
    width: 1.98,
    clearance: 0.18,
    wheel: 0.34,
    wheelbase: [0.17, 0.79],
    belt: 1.0,
    roof: [
      [0, 1.2],
      [0.04, 1.72],
      [0.2, 1.8],
      [0.62, 1.8],
      [0.8, 1.2],
      [0.9, 1.02],
      [1, 0.72],
    ],
  },
  truck: {
    length: 5.4,
    width: 2.0,
    clearance: 0.3,
    wheel: 0.4,
    wheelbase: [0.17, 0.78],
    belt: 1.15,
    roof: [
      [0, 1.12],
      [0.4, 1.12],
      [0.42, 1.88],
      [0.62, 1.9],
      [0.72, 1.36],
      [0.88, 1.24],
      [1, 0.95],
    ],
  },
};

const smooth = (t) => t * t * (3 - 2 * t);

function sample(points, u) {
  for (let i = 0; i < points.length - 1; i++) {
    const [u0, v0] = points[i];
    const [u1, v1] = points[i + 1];
    if (u <= u1) return v0 + (v1 - v0) * smooth((u - u0) / (u1 - u0 || 1));
  }
  return points[points.length - 1][1];
}

const sp = (v, n) => Math.sign(v) * Math.abs(v) ** (2 / n);

export function buildCar(type = "coupe", { sections = 52, ring = 32 } = {}) {
  const P = BODY_TYPES[type] ?? BODY_TYPES.coupe;
  const half = P.length / 2;
  const wheelU = P.wheelbase;

  const positions = [];
  const sectionsPts = [];
  for (let i = 0; i < sections; i++) {
    const u = i / (sections - 1);
    const x = -half + u * P.length;

    let top = sample(P.roof, u);
    // Bottom line: rises at the very ends and over the wheel arches.
    let bottom = P.clearance + 0.12 * (smooth(Math.max(0, 0.08 - u) / 0.08) + smooth(Math.max(0, u - 0.92) / 0.08));
    for (const wu of wheelU) {
      const du = Math.abs(u - wu) * P.length;
      if (du < P.wheel * 1.2)
        bottom = Math.max(bottom, P.clearance + Math.sqrt(1 - (du / (P.wheel * 1.2)) ** 2) * P.wheel * 0.85);
    }
    top = Math.max(top, bottom + 0.2);

    // Plan-view width: tapered nose and tail, end sections shrink to close the shape.
    let halfW = (P.width / 2) * (0.88 + 0.12 * Math.sin(Math.PI * u));
    halfW *= 1 - 0.2 * smooth(Math.max(0, u - 0.86) / 0.14);
    const endPinch = Math.min(1, Math.min(u, 1 - u) / 0.02 + 0.55);

    const mid = (top + bottom) / 2;
    const hh = ((top - bottom) / 2) * endPinch;
    const ringPts = [];
    for (let j = 0; j < ring; j++) {
      const a = (j / ring) * Math.PI * 2;
      const yN = sp(Math.sin(a), 4.5);
      const y = mid + hh * yN;
      // Cabin narrows above the belt line (tumblehome).
      const above = smooth(Math.min(1, Math.max(0, (y - P.belt) / Math.max(0.05, top - P.belt))));
      const w = halfW * endPinch * (1 - 0.3 * above);
      const z = w * sp(Math.cos(a), 4.5);
      ringPts.push([x, y, z]);
      positions.push(x, y, z);
    }
    sectionsPts.push(ringPts);
  }

  // Surface triangles
  const index = [];
  for (let i = 0; i < sections - 1; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j;
      const b = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + j;
      const d = (i + 1) * ring + ((j + 1) % ring);
      index.push(a, c, b, b, c, d);
    }
  }
  const surface = new BufferGeometry();
  surface.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  surface.setIndex(index);
  surface.computeVertexNormals();

  // Wireframe: every 3rd section ring + longitudinal lines every 2nd ring vertex.
  const wire = [];
  for (let i = 0; i < sections; i += 3) {
    const r = sectionsPts[i];
    for (let j = 0; j < ring; j++) wire.push(...r[j], ...r[(j + 1) % ring]);
  }
  for (let j = 0; j < ring; j += 2) {
    for (let i = 0; i < sections - 1; i++) wire.push(...sectionsPts[i][j], ...sectionsPts[i + 1][j]);
  }
  const lines = new BufferGeometry();
  lines.setAttribute("position", new BufferAttribute(new Float32Array(wire), 3));

  const wheels = [];
  for (const wu of wheelU) {
    for (const side of [-1, 1]) {
      wheels.push({ x: -half + wu * P.length, y: P.wheel, z: side * (P.width / 2 - 0.12), r: P.wheel });
    }
  }
  return { surface, lines, wheels, length: P.length, height: Math.max(...P.roof.map((p) => p[1])) };
}

/** Wheel: tyre rings + spokes, as line segments centred at the origin (axis along Z). */
export function buildWheelLines(r, spokes = 10) {
  const pts = [];
  const circle = (radius, z, seg = 40) => {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * radius, Math.sin(a0) * radius, z, Math.cos(a1) * radius, Math.sin(a1) * radius, z);
    }
  };
  for (const z of [-0.11, 0.11]) {
    circle(r, z);
    circle(r * 0.68, z, 32);
  }
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    pts.push(
      Math.cos(a) * r * 0.16,
      Math.sin(a) * r * 0.16,
      0.11,
      Math.cos(a) * r * 0.66,
      Math.sin(a) * r * 0.66,
      0.11,
    );
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(Math.cos(a) * r, Math.sin(a) * r, -0.11, Math.cos(a) * r, Math.sin(a) * r, 0.11);
  }
  circle(r * 0.16, 0.11, 16);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pts), 3));
  return g;
}

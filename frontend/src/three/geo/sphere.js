import { Vector3 } from "three";

const DEG = Math.PI / 180;

/** Latitude/longitude (degrees) → point on a sphere of radius r. */
export function latLonToVec3(lat, lon, r = 1, target = new Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return target.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Inverse of latLonToVec3 for a unit vector. Returns [lat, lon] in degrees. */
export function vec3ToLatLon(x, y, z) {
  const lat = Math.asin(Math.max(-1, Math.min(1, y))) / DEG;
  let lon = Math.atan2(z, -x) / DEG - 180;
  if (lon < -180) lon += 360;
  return [lat, lon];
}

/** Evenly distributed unit vectors on a sphere (Fibonacci lattice), as [x, y, z] triples. */
export function fibonacciSphere(count) {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    out[i * 3] = Math.cos(t) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(t) * r;
  }
  return out;
}

// Seeded PRNG lives in lib/random; re-exported here for the 3D geometry helpers.
export { mulberry32 } from "../../lib/random";

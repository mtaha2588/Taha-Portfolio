import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from "three";

/**
 * Hologram materials shared by the exhibitions.
 *
 * Both support a "materialise" sweep: geometry appears progressively
 * along one local axis as uReveal goes 0 → 1 (with a bright scan edge),
 * used when an object first appears or morphs into a different shape.
 */

const revealChunk = /* glsl */ `
  uniform float uReveal;
  uniform vec2 uRevealRange; // min/max of the local coordinate being swept
  float revealMask(float coord, out float edge) {
    float t = (coord - uRevealRange.x) / (uRevealRange.y - uRevealRange.x);
    float front = uReveal * 1.15 - 0.05;
    edge = exp(-pow((t - front) * 30.0, 2.0)) * (1.0 - step(0.999, uReveal));
    return smoothstep(front, front - 0.04, t);
  }
`;

const surfaceVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const surfaceFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uScanAxis; // 0 = x, 1 = y
  ${revealChunk}
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vLocal;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
    float coord = mix(vLocal.x, vLocal.y, uScanAxis);
    float edge;
    float shown = revealMask(coord, edge);
    // Horizontal scan lines drifting upward give the projected-hologram feel.
    float lines = 0.75 + 0.25 * step(0.5, fract(vLocal.y * 22.0 - uTime * 0.6));
    float a = (0.05 + fres * 0.55) * lines * shown + edge * 0.8;
    gl_FragColor = vec4(uColor * (1.0 + edge * 2.0), a * uOpacity);
    #include <colorspace_fragment>
  }
`;

const lineVert = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const lineFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uScanAxis;
  ${revealChunk}
  varying vec3 vLocal;
  void main() {
    float coord = mix(vLocal.x, vLocal.y, uScanAxis);
    float edge;
    float shown = revealMask(coord, edge);
    float shimmer = 0.85 + 0.15 * sin(vLocal.x * 3.0 + uTime * 2.0);
    gl_FragColor = vec4(uColor * (1.0 + edge * 2.5), (shown * shimmer + edge) * uOpacity);
    #include <colorspace_fragment>
  }
`;

function base(vertexShader, fragmentShader, { color, opacity = 1, range = [-1, 1], scanAxis = 0 }) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uReveal: { value: 1 },
      uRevealRange: { value: range },
      uScanAxis: { value: scanAxis },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

export const createHoloSurface = (opts) => base(surfaceVert, surfaceFrag, opts);
export const createHoloLines = (opts) => base(lineVert, lineFrag, opts);

/** Updates time/reveal/opacity on a list of hologram materials in one call (inside useFrame). */
export function tickHolo(materials, { time, reveal, opacity }) {
  for (const m of materials) {
    if (!m) continue;
    m.uniforms.uTime.value = time;
    if (reveal !== undefined) m.uniforms.uReveal.value = reveal;
    if (opacity !== undefined) m.userData.baseOpacity ??= m.uniforms.uOpacity.value;
    if (opacity !== undefined) m.uniforms.uOpacity.value = m.userData.baseOpacity * opacity;
  }
}

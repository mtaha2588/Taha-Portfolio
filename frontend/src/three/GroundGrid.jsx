import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color } from "three";
import { motion } from "../store/universe";

const vert = /* glsl */ `
  varying vec2 vXZ;
  void main() {
    vXZ = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fine holographic floor grid with major/minor lines. It lights up as a
// ring expanding outward from the centre during the intro (uGrid 0 → 1).
const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGrid;
  uniform float uTime;
  varying vec2 vXZ;

  float lines(vec2 p, float spacing) {
    vec2 g = abs(fract(p / spacing - 0.5) - 0.5) / fwidth(p / spacing);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    float r = length(vXZ);
    float minor = lines(vXZ, 1.0) * 0.35;
    float major = lines(vXZ, 5.0);
    float fade = smoothstep(70.0, 8.0, r);

    float front = uGrid * 75.0;
    float revealed = smoothstep(front, front - 6.0, r);
    float wave = exp(-pow((r - front) * 0.35, 2.0)) * (1.0 - step(0.999, uGrid));

    // Slow concentric pulse travelling outward from beneath the globe.
    float pulse = exp(-pow(mod(r - uTime * 2.5, 30.0) - 15.0, 2.0) * 0.08) * 0.35;

    float a = (minor + major * 0.8) * fade * revealed * (0.35 + pulse) + wave * 0.6 * fade;
    gl_FragColor = vec4(uColor, a * 0.55);
    #include <colorspace_fragment>
  }
`;

export default function GroundGrid({ y = -5.5 }) {
  const material = useRef();
  const uniforms = useMemo(
    () => ({ uColor: { value: new Color("#3b82f6") }, uGrid: { value: 0 }, uTime: { value: 0 } }),
    [],
  );

  useFrame((state) => {
    material.current.uniforms.uGrid.value = motion.intro.grid;
    material.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} renderOrder={-1}>
      <planeGeometry args={[160, 160, 1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

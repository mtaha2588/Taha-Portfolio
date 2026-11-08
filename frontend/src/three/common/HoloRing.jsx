import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide } from "three";

const vert = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uDashes;
  uniform float uSpeed;
  uniform float uFill;
  uniform vec3 uColor;
  varying vec2 vP;
  void main() {
    float ang = atan(vP.y, vP.x) / 6.2831853 + 0.5;
    float dash = step(1.0 - uFill, fract(ang * uDashes));
    float sweep = pow(fract(ang - uTime * uSpeed), 12.0);
    float a = uOpacity * (0.12 + 0.5 * dash + sweep * 1.4);
    gl_FragColor = vec4(uColor * (1.0 + sweep * 1.5), a);
    #include <colorspace_fragment>
  }
`;

/**
 * Flat holographic ring lying in the XZ plane (horizontal), with dash
 * segments and a bright sweep travelling around it. `intensity` may be
 * a number or a ref whose .current is read every frame (for hover glow).
 */
export default function HoloRing({
  radius,
  width = 0.02,
  dashes = 64,
  fill = 0.55,
  speed = 0.05,
  color = "#22d3ee",
  opacity = 0.8,
  intensity = 1,
  y = 0,
  segments = 192,
  reduced = false,
}) {
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uDashes: { value: dashes },
      uSpeed: { value: speed },
      uFill: { value: fill },
      uColor: { value: new Color(color) },
    }),
    [opacity, dashes, speed, fill, color],
  );

  useFrame((state) => {
    const k = typeof intensity === "number" ? intensity : intensity.current;
    mat.current.uniforms.uTime.value = reduced ? 3 : state.clock.elapsedTime;
    mat.current.uniforms.uOpacity.value = opacity * k;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y}>
      <ringGeometry args={[radius - width, radius + width, segments, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  );
}

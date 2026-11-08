import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, SRGBColorSpace } from "three";
import { motion } from "../store/universe";
import { mulberry32 } from "./geo/sphere";

const starVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aRand;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vTwinkle = 0.55 + 0.45 * sin(uTime * (0.4 + aRand * 1.6) + aRand * 60.0);
    gl_PointSize = aSize * uPixelRatio * (90.0 / -mv.z);
  }
`;
const starFrag = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, core * core * vTwinkle * uOpacity);
    #include <colorspace_fragment>
  }
`;

const STAR_COLORS = ["#ffffff", "#cfe6ff", "#9fd8ff", "#c4b5fd", "#7dd3fc"].map((c) => new Color(c));

function Stars({ count }) {
  const material = useRef();
  const dpr = useThree((s) => s.viewport.dpr);

  const { positions, sizes, rands, colors } = useMemo(() => {
    const rand = mulberry32(11);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rands = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Points on a large shell around the scene, so stars stay "infinitely" far away.
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const r = 90 + rand() * 110;
      const s = Math.sqrt(1 - u * u);
      positions.set([Math.cos(t) * s * r, u * r * 0.7, Math.sin(t) * s * r], i * 3);
      sizes[i] = rand() < 0.04 ? 2.4 + rand() * 2 : 0.6 + rand() * 1.1;
      rands[i] = rand();
      const c = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    return { positions, sizes, rands, colors };
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } }), []);

  useFrame((state) => {
    const u = material.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uOpacity.value = motion.intro.stars;
    u.uPixelRatio.value = dpr;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={starVert}
        fragmentShader={starFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/** Soft radial-gradient texture generated at runtime: no image download needed. */
function useGlowTexture(inner, outer) {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [inner, outer]);
}

function Nebula() {
  const violet = useGlowTexture("rgba(139,92,246,0.55)", "rgba(88,60,200,0.18)");
  const blue = useGlowTexture("rgba(79,140,255,0.5)", "rgba(40,80,200,0.15)");
  const cyan = useGlowTexture("rgba(34,211,238,0.35)", "rgba(20,120,160,0.1)");
  const group = useRef();

  const clouds = [
    { map: violet, pos: [-70, 25, -120], scale: 130, opacity: 0.55 },
    { map: blue, pos: [60, -10, -140], scale: 150, opacity: 0.5 },
    { map: cyan, pos: [10, 40, -160], scale: 110, opacity: 0.4 },
    { map: violet, pos: [90, 35, 60], scale: 120, opacity: 0.35 },
    { map: blue, pos: [-80, -30, 70], scale: 130, opacity: 0.35 },
  ];

  useFrame(() => {
    group.current.children.forEach((sprite, i) => {
      sprite.material.opacity = clouds[i].opacity * motion.intro.stars;
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale, 1]}>
          <spriteMaterial map={c.map} transparent depthWrite={false} blending={AdditiveBlending} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vAlpha;
  varying float vRand;
  void main() {
    vec3 p = position;
    // Slow drift on a small loop so the particles feel suspended in space.
    p.x += sin(uTime * 0.15 + aRand * 20.0) * 0.4;
    p.y += cos(uTime * 0.12 + aRand * 31.0) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = 0.35 + 0.5 * aRand;
    vRand = aRand;
    gl_PointSize = (1.5 + aRand * 2.5) * uPixelRatio * (10.0 / -mv.z);
  }
`;
const dustFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vRand;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(mix(uColor, uColorB, step(0.8, vRand)), smoothstep(0.5, 0.0, d) * vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

function Dust({ count }) {
  const material = useRef();
  const dpr = useThree((s) => s.viewport.dpr);
  const { positions, rands } = useMemo(() => {
    const rand = mulberry32(23);
    const positions = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 5 + rand() * 18;
      const t = rand() * Math.PI * 2;
      const u = rand() * 2 - 1;
      const s = Math.sqrt(1 - u * u);
      positions.set([Math.cos(t) * s * r, u * r * 0.6, Math.sin(t) * s * r], i * 3);
      rands[i] = rand();
    }
    return { positions, rands };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color("#5eead4") },
      uColorB: { value: new Color("#a78bfa") },
    }),
    [],
  );

  useFrame((state) => {
    const u = material.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uOpacity.value = motion.intro.stars;
    u.uPixelRatio.value = dpr;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={dustVert}
        fragmentShader={dustFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

export default function Starfield({ quality }) {
  const high = quality === "high";
  return (
    <>
      <Stars count={high ? 5000 : 2200} />
      <Nebula />
      <Dust count={high ? 700 : 300} />
    </>
  );
}

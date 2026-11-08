import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { AdditiveBlending, Color, Vector3 } from "three";
import { exhibits } from "../../store/exhibits";
import { focusExhibit } from "../../lib/focus";
import HoloRing from "../common/HoloRing";

const padVert = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Circuit-like holographic pedestal: concentric rings, radial traces and a soft core glow.
const padFrag = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  uniform float uRadius;
  uniform vec3 uColor;
  varying vec2 vP;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    float r = length(vP) / uRadius;
    if (r > 1.0) discard;
    float ang = atan(vP.y, vP.x) / 6.2831853 + 0.5;
    float rings = smoothstep(0.035, 0.0, abs(fract(r * 7.0) - 0.5) - 0.46);
    float sector = floor(ang * 72.0);
    float traceOn = step(0.62, hash(sector + 3.0));
    float trace = traceOn * smoothstep(0.012, 0.0, abs(fract(ang * 72.0) - 0.5) - 0.47) * step(0.35, r) * step(r, 0.92);
    float pulse = exp(-pow((r - fract(uTime * 0.18)) * 10.0, 2.0));
    float rim = smoothstep(0.94, 1.0, r) * (1.0 - smoothstep(0.995, 1.0, r));
    float core = smoothstep(0.55, 0.0, r) * 0.1;
    float a = (rings * 0.2 + trace * 0.22 + rim * 0.8 + core) * (0.45 + 0.55 * uGlow) + pulse * 0.2 * (rings + trace);
    gl_FragColor = vec4(uColor * (1.0 + uGlow), a * 0.5);
    #include <colorspace_fragment>
  }
`;

function Pedestal({ radius, color, glow, reduced }) {
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uRadius: { value: radius },
      uColor: { value: new Color(color) },
    }),
    [radius, color],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = reduced ? 2 : state.clock.elapsedTime;
    mat.current.uniforms.uGlow.value = glow.current;
  });
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <circleGeometry args={[radius, 96]} />
      <shaderMaterial
        ref={mat}
        vertexShader={padVert}
        fragmentShader={padFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * Wrapper shared by all three exhibitions:
 *  - floats the exhibit gently; skips rendering when the camera is far away
 *  - glowing pedestal that brightens on hover and in focus
 *  - invisible hit volume: hover = glow + pointer, click = enter focus mode,
 *    drag (while focused) = rotate the object with momentum
 *  - steps back (shrinks and sinks) while another exhibit is focused
 *  - `panels` render outside the rotating group, so they stay readable
 */
export default function Exhibit({
  ex,
  index,
  radius = 6,
  hitHeight = 6,
  color = "#22d3ee",
  reduced,
  panels,
  children,
}) {
  const group = useRef();
  const spin = useRef();
  const label = useRef();
  const glow = useRef(0);
  const dim = useRef(0);
  const drag = useRef({ active: false, x: 0, moved: 0, vel: 0 });
  const world = useMemo(() => new Vector3(...ex.position), [ex.position]);

  useEffect(() => {
    const move = (e) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.x;
      d.x = e.clientX;
      d.moved += Math.abs(dx);
      d.vel = dx * 0.006;
      spin.current.rotation.y += d.vel;
    };
    const up = () => {
      drag.current.active = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const { hovered, focused } = exhibits.get();
    const isFocused = focused === ex.key;

    dim.current += ((focused && !isFocused ? 1 : 0) - dim.current) * k;
    const t = reduced ? 0 : state.clock.elapsedTime;
    group.current.position.y = ex.position[1] + Math.sin(t * 0.5 + index * 2.1) * 0.12 - dim.current * 3;
    group.current.scale.setScalar(1 - dim.current * 0.35);
    const d = state.camera.position.distanceTo(world);
    // Only needs to be visible up to the overview shot (~61 units from the agent exhibit).
    group.current.visible = d < 64;

    glow.current += ((hovered === ex.key ? 1 : isFocused ? 0.7 : 0) - glow.current) * k;

    // Momentum after a drag; ease back to the default angle when leaving focus.
    const dr = drag.current;
    if (!dr.active) {
      if (isFocused) {
        spin.current.rotation.y += dr.vel;
        dr.vel *= 0.94;
      } else {
        spin.current.rotation.y += (0 - spin.current.rotation.y) * k * 0.5;
        dr.vel = 0;
      }
    }

    if (label.current) {
      const o = focused ? 0 : Math.min(1, Math.max(0, (d - 32) / 8));
      label.current.style.opacity = o.toFixed(3);
      label.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });

  const enter = (e) => {
    e.stopPropagation();
    if (exhibits.get().focused === ex.key) {
      document.body.style.cursor = "grab";
      return;
    }
    exhibits.set({ hovered: ex.key });
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    if (exhibits.get().hovered === ex.key) exhibits.set({ hovered: null });
    if (!drag.current.active) document.body.style.cursor = "";
  };

  return (
    <group ref={group} position={ex.position}>
      <Pedestal radius={radius} color={color} glow={glow} reduced={reduced} />
      <HoloRing
        radius={radius * 1.08}
        width={0.025}
        dashes={120}
        fill={0.4}
        speed={0.03}
        color={color}
        opacity={0.55}
        intensity={glow}
        reduced={reduced}
      />
      <group ref={spin}>{children}</group>
      {panels}

      <mesh
        position-y={hitHeight / 2}
        onPointerOver={enter}
        onPointerOut={leave}
        onPointerDown={(e) => {
          if (exhibits.get().focused !== ex.key) return;
          e.stopPropagation();
          Object.assign(drag.current, { active: true, x: e.clientX, moved: 0, vel: 0 });
          document.body.style.cursor = "grabbing";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (drag.current.moved > 6) return; // that was a rotate gesture, not a click
          focusExhibit(ex.key);
        }}
      >
        <cylinderGeometry args={[radius * 0.85, radius * 0.85, hitHeight, 24, 1]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>

      <Html position={[0, hitHeight + 1.2, 0]} center zIndexRange={[6, 0]}>
        <button
          ref={label}
          type="button"
          tabIndex={-1}
          onClick={() => focusExhibit(ex.key)}
          onPointerEnter={() => exhibits.set({ hovered: ex.key })}
          onPointerLeave={leave}
          style={{ opacity: 0 }}
          className="glass flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-fg uppercase transition-colors hover:border-cyan/60"
        >
          <span className="text-cyan">{String(index + 1).padStart(2, "0")}</span>
          {ex.label}
        </button>
      </Html>
    </group>
  );
}

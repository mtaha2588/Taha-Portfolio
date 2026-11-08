import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BackSide, Color, ConeGeometry, DoubleSide, Vector3 } from "three";
import { motion } from "../store/universe";
import { fibonacciSphere, latLonToVec3, mulberry32, vec3ToLatLon } from "./geo/sphere";
import { HUBS, LINKS, isLand } from "./geo/landmass";
import surfaceVert from "./shaders/globeSurface.vert";
import surfaceFrag from "./shaders/globeSurface.frag";
import pointsVert from "./shaders/globePoints.vert";
import softPointFrag from "./shaders/softPoint.frag";

export const GLOBE_RADIUS = 3;
const R = GLOBE_RADIUS;

const CYAN = new Color("#22d3ee");
const ELECTRIC = new Color("#4f8cff");
const VIOLET = new Color("#8b5cf6");
const ICE = new Color("#dbeafe");

/** Time source that freezes ambient motion under reduced-motion preferences. */
const clockTime = (state, reduced) => (reduced ? 6 : state.clock.elapsedTime);

// ------------------------------------------------------------------ surface

function GlobeBody({ reduced, segments }) {
  // Animate through the material's own uniforms (mat.current.uniforms): that is the
  // object three.js uploads to the GPU.
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uBody: { value: new Color("#060c1c") },
      uGrid: { value: new Color("#3b82f6") },
      uRim: { value: new Color("#38bdf8") },
    }),
    [],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = clockTime(state, reduced);
    mat.current.uniforms.uReveal.value = motion.intro.reveal;
  });
  return (
    <mesh>
      <sphereGeometry args={[R, segments, segments]} />
      <shaderMaterial ref={mat} vertexShader={surfaceVert} fragmentShader={surfaceFrag} uniforms={uniforms} />
    </mesh>
  );
}

function LandPoints({ count, reduced }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { positions, rands } = useMemo(() => {
    const dirs = fibonacciSphere(count);
    const rand = mulberry32(5);
    const pos = [];
    const rnd = [];
    for (let i = 0; i < count; i++) {
      const x = dirs[i * 3];
      const y = dirs[i * 3 + 1];
      const z = dirs[i * 3 + 2];
      const [lat, lon] = vec3ToLatLon(x, y, z);
      if (!isLand(lat, lon)) continue;
      pos.push(x * R * 1.006, y * R * 1.006, z * R * 1.006);
      rnd.push(rand());
    }
    return { positions: new Float32Array(pos), rands: new Float32Array(rnd) };
  }, [count]);

  // Animate through the material's own uniforms (mat.current.uniforms): that is the
  // object three.js uploads to the GPU.
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uSize: { value: 2.1 },
      uPixelRatio: { value: 1 },
      uColor: { value: CYAN.clone() },
      uColorB: { value: ICE.clone() },
      uOpacity: { value: 1 },
    }),
    [],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = clockTime(state, reduced);
    mat.current.uniforms.uReveal.value = motion.intro.reveal;
    mat.current.uniforms.uPixelRatio.value = dpr;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={pointsVert}
        fragmentShader={softPointFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

const atmosphereVert = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const atmosphereFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uReveal;
  varying vec3 vNormal;
  void main() {
    float i = pow(max(0.0, 0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    gl_FragColor = vec4(uColor * i * 0.9, i * uReveal);
    #include <colorspace_fragment>
  }
`;

function Atmosphere() {
  // Animate through the material's own uniforms (mat.current.uniforms): that is the
  // object three.js uploads to the GPU.
  const mat = useRef();
  const uniforms = useMemo(() => ({ uColor: { value: new Color("#3b9bff") }, uReveal: { value: 0 } }), []);
  useFrame(() => {
    mat.current.uniforms.uReveal.value = motion.intro.reveal;
  });
  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[R, 64, 64]} />
      <shaderMaterial
        ref={mat}
        vertexShader={atmosphereVert}
        fragmentShader={atmosphereFrag}
        uniforms={uniforms}
        side={BackSide}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

// ------------------------------------------------------------------ network

const arcVert = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  varying float vT;
  varying float vSeed;
  void main() {
    vT = aT;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const arcFrag = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vT;
  varying float vSeed;
  void main() {
    // A bright "packet" travels along each arc, leaving a short fading trail.
    float head = fract(uTime * (0.12 + vSeed * 0.16) + vSeed * 7.0);
    float d = vT - head;
    float trail = smoothstep(-0.22, 0.0, d) * step(d, 0.0);
    float a = (0.16 + trail * 1.3) * uReveal;
    vec3 col = mix(uColorA, uColorB, vSeed) * (1.0 + trail * 1.5);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

function slerpInto(a, b, t, out) {
  const dot = Math.min(1, Math.max(-1, a.dot(b)));
  const omega = Math.acos(dot);
  if (omega < 1e-5) return out.copy(a);
  const s = Math.sin(omega);
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - t) * omega) / s)
    .addScaledVector(b, Math.sin(t * omega) / s);
}

function NetworkArcs({ reduced }) {
  const { positions, ts, seeds } = useMemo(() => {
    const hub = Object.fromEntries(HUBS.map((h) => [h.id, latLonToVec3(h.lat, h.lon, 1)]));
    const rand = mulberry32(9);
    const SEG = 64;
    const pos = [];
    const t = [];
    const s = [];
    const p0 = new Vector3();
    const p1 = new Vector3();
    for (const [from, to] of LINKS) {
      const a = hub[from];
      const b = hub[to];
      const lift = 0.08 + (1 - a.dot(b)) * 0.22;
      const seed = rand();
      for (let i = 0; i < SEG; i++) {
        const t0 = i / SEG;
        const t1 = (i + 1) / SEG;
        slerpInto(a, b, t0, p0).multiplyScalar(R * (1.01 + lift * Math.sin(Math.PI * t0)));
        slerpInto(a, b, t1, p1).multiplyScalar(R * (1.01 + lift * Math.sin(Math.PI * t1)));
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        t.push(t0, t1);
        s.push(seed, seed);
      }
    }
    return { positions: new Float32Array(pos), ts: new Float32Array(t), seeds: new Float32Array(s) };
  }, []);

  // Animate through the material's own uniforms (mat.current.uniforms): that is the
  // object three.js uploads to the GPU.
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uColorA: { value: CYAN.clone() },
      uColorB: { value: VIOLET.clone() },
    }),
    [],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = clockTime(state, reduced);
    // Arcs light up after the surface has mostly materialised.
    mat.current.uniforms.uReveal.value = Math.max(0, (motion.intro.reveal - 0.55) / 0.45);
  });

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aT" args={[ts, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={arcVert}
        fragmentShader={arcFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
  );
}

function HubMarkers({ reduced }) {
  const refs = useRef([]);
  const hubs = useMemo(
    () =>
      HUBS.map((h) => {
        const pos = latLonToVec3(h.lat, h.lon, R * 1.012);
        const out = pos.clone().multiplyScalar(2);
        return { ...h, pos, out };
      }),
    [],
  );

  useFrame((state) => {
    const t = clockTime(state, reduced);
    const reveal = Math.max(0, (motion.intro.reveal - 0.6) / 0.4);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const [ring, dot] = g.children;
      const phase = (t * 0.6 + i * 0.37) % 1;
      const base = hubs[i].primary ? 1.6 : 1;
      ring.scale.setScalar(base * (0.6 + phase * 1.6));
      ring.material.opacity = (1 - phase) * 0.8 * reveal;
      dot.material.opacity = reveal;
    });
  });

  return hubs.map((h, i) => (
    <group
      key={h.id}
      position={h.pos}
      ref={(el) => {
        refs.current[i] = el;
        el?.lookAt(h.out);
      }}
    >
      <mesh>
        <ringGeometry args={[0.07, 0.085, 32]} />
        <meshBasicMaterial
          color={h.primary ? VIOLET : CYAN}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[h.primary ? 0.05 : 0.032, 16]} />
        <meshBasicMaterial color={h.primary ? "#e9d5ff" : "#e0f2fe"} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  ));
}

// ------------------------------------------------------------------ data streams

const streamVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec3 aAxis;
  attribute float aRadius;
  attribute float aSpeed;
  attribute float aPhase;
  attribute float aTrail;
  varying float vAlpha;
  varying float vRand;
  void main() {
    vec3 axis = normalize(aAxis);
    vec3 u = normalize(cross(axis, abs(axis.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
    vec3 v = cross(axis, u);
    float ang = aPhase + uTime * aSpeed - aTrail * 0.55;
    vec3 p = (u * cos(ang) + v * sin(ang)) * aRadius;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = pow(1.0 - aTrail, 1.6);
    vRand = fract(aPhase * 3.7);
    gl_PointSize = mix(3.2, 0.8, aTrail) * uPixelRatio * (14.0 / -mv.z);
  }
`;

function DataStreams({ streams, perStream, reduced }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const attrs = useMemo(() => {
    const rand = mulberry32(31);
    const n = streams * perStream;
    const axis = new Float32Array(n * 3);
    const radius = new Float32Array(n);
    const speed = new Float32Array(n);
    const phase = new Float32Array(n);
    const trail = new Float32Array(n);
    let k = 0;
    for (let s = 0; s < streams; s++) {
      const ax = [rand() - 0.5, 0.6 + rand(), rand() - 0.5];
      const r = R * (1.2 + rand() * 0.55);
      const sp = (0.18 + rand() * 0.22) * (rand() > 0.5 ? 1 : -1);
      const ph = rand() * Math.PI * 2;
      for (let i = 0; i < perStream; i++, k++) {
        axis.set(ax, k * 3);
        radius[k] = r;
        speed[k] = sp;
        phase[k] = ph;
        trail[k] = i / perStream;
      }
    }
    return { axis, radius, speed, phase, trail, dummy: new Float32Array(n * 3) };
  }, [streams, perStream]);

  // Animate through the material's own uniforms (mat.current.uniforms): that is the
  // object three.js uploads to the GPU.
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new Color("#67e8f9") },
      uColorB: { value: new Color("#c4b5fd") },
      uOpacity: { value: 0 },
    }),
    [],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = clockTime(state, reduced);
    mat.current.uniforms.uPixelRatio.value = dpr;
    mat.current.uniforms.uOpacity.value = Math.max(0, (motion.intro.reveal - 0.4) / 0.6);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attrs.dummy, 3]} />
        <bufferAttribute attach="attributes-aAxis" args={[attrs.axis, 3]} />
        <bufferAttribute attach="attributes-aRadius" args={[attrs.radius, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[attrs.speed, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[attrs.phase, 1]} />
        <bufferAttribute attach="attributes-aTrail" args={[attrs.trail, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={streamVert}
        fragmentShader={softPointFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

// ------------------------------------------------------------------ orbit rings & satellites

const ringVert = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ringFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uDashes;
  uniform float uSpeed;
  uniform vec3 uColor;
  varying vec2 vP;
  void main() {
    float ang = atan(vP.y, vP.x) / 6.2831853 + 0.5;
    float dash = step(0.45, fract(ang * uDashes));
    float sweep = pow(fract(ang - uTime * uSpeed), 10.0);
    float a = uOpacity * (0.18 + 0.32 * dash + sweep * 1.2);
    gl_FragColor = vec4(uColor * (1.0 + sweep), a);
    #include <colorspace_fragment>
  }
`;

function OrbitRing({ radius, width = 0.012, dashes, speed, color, opacityScale = 1, reduced }) {
  // Animate through the material's own uniforms (mat.current.uniforms): that is the
  // object three.js uploads to the GPU.
  const mat = useRef();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uDashes: { value: dashes },
      uSpeed: { value: speed },
      uColor: { value: new Color(color) },
    }),
    [dashes, speed, color],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = clockTime(state, reduced);
    mat.current.uniforms.uOpacity.value = Math.max(0, (motion.intro.reveal - 0.3) / 0.7) * opacityScale;
  });
  return (
    <mesh>
      <ringGeometry args={[radius - width, radius + width, 256, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={ringVert}
        fragmentShader={ringFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  );
}

const beamVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const beamFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float towardSurface = 1.0 - vUv.y;
    float bands = 0.6 + 0.4 * step(0.5, fract(vUv.y * 14.0 - uTime * 1.6));
    float a = (0.015 + 0.085 * towardSurface) * bands * uOpacity;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

/** A satellite travelling along a tilted orbit, projecting a scanning beam onto the globe. */
function Satellite({ radius, tilt, speed, phase, color, reduced }) {
  const ring = useRef();
  const sat = useRef();
  const beam = useRef();
  const spot = useRef();
  const tmp = useMemo(
    () => ({ world: new Vector3(), center: new Vector3(), dir: new Vector3(), out: new Vector3() }),
    [],
  );

  // Cone with its apex at the satellite and its open base pointing along +Z (toward the globe after lookAt).
  const beamGeometry = useMemo(() => {
    const g = new ConeGeometry(0.62, 1, 40, 1, true);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, 0.5);
    return g;
  }, []);
  useEffect(() => () => beamGeometry.dispose(), [beamGeometry]);

  const mat = useRef();
  const beamUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new Color(color) } }),
    [color],
  );

  useFrame((state) => {
    const t = clockTime(state, reduced);
    const a = phase + t * speed;
    sat.current.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);

    sat.current.getWorldPosition(tmp.world);
    ring.current.parent.getWorldPosition(tmp.center);
    const dist = tmp.world.distanceTo(tmp.center);

    beam.current.position.copy(sat.current.position);
    beam.current.lookAt(tmp.center);
    beam.current.scale.set(1, 1, dist - R * 1.01);

    tmp.dir.copy(tmp.world).sub(tmp.center).normalize();
    spot.current.position.copy(tmp.dir).multiplyScalar(R * 1.015);
    spot.current.lookAt(tmp.out.copy(tmp.center).addScaledVector(tmp.dir, R * 3));

    const vis = Math.max(0, (motion.intro.reveal - 0.7) / 0.3);
    mat.current.uniforms.uTime.value = t;
    mat.current.uniforms.uOpacity.value = vis;
    spot.current.material.opacity = 0.45 * vis;
    sat.current.children[0].material.opacity = vis;
  });

  return (
    <>
      <group ref={ring} rotation={tilt}>
        <OrbitRing
          radius={radius}
          width={0.008}
          dashes={90}
          speed={speed / 6.283}
          color={color}
          opacityScale={0.7}
          reduced={reduced}
        />
        <group ref={sat}>
          <mesh>
            <octahedronGeometry args={[0.09, 0]} />
            <meshBasicMaterial color="#e0f7ff" transparent />
          </mesh>
        </group>
        <mesh ref={beam} geometry={beamGeometry}>
          <shaderMaterial
            ref={mat}
            vertexShader={beamVert}
            fragmentShader={beamFrag}
            uniforms={beamUniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
          />
        </mesh>
      </group>
      {/* Footprint of the scan on the globe surface */}
      <mesh ref={spot}>
        <ringGeometry args={[0.38, 0.46, 48]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
      </mesh>
    </>
  );
}

// ------------------------------------------------------------------ assembly

export default function HoloGlobe({ quality, reduced, position = [0, 0, 0] }) {
  const high = quality === "high";
  const spin = useRef();
  const drag = useRef({ active: false, x: 0, y: 0, vx: 0, tiltX: 0 });

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      d.vx = dx * 0.005;
      spin.current.rotation.y += dx * 0.005;
      d.tiltX = Math.max(-0.6, Math.min(0.6, d.tiltX + dy * 0.003));
    };
    const onUp = () => {
      drag.current.active = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  useFrame((_, dt) => {
    const d = drag.current;
    const g = spin.current;
    if (!d.active) {
      g.rotation.y += reduced ? d.vx : dt * 0.045 + d.vx;
      d.vx *= 0.94; // momentum after a drag
    }
    g.rotation.x += (d.tiltX - g.rotation.x) * 0.08;
  });

  return (
    <group position={position}>
      {/* Earth-like axial tilt */}
      <group rotation-z={0.38}>
        <group ref={spin} rotation-y={Math.PI - 0.4}>
          <GlobeBody reduced={reduced} segments={high ? 96 : 64} />
          <LandPoints count={high ? 14000 : 7000} reduced={reduced} />
          <NetworkArcs reduced={reduced} />
          <HubMarkers reduced={reduced} />
        </group>
      </group>

      <Atmosphere />
      <DataStreams streams={high ? 9 : 5} perStream={high ? 90 : 60} reduced={reduced} />

      {/* Equatorial HUD ring with tick marks, plus two satellite orbits */}
      <group rotation-x={Math.PI / 2 - 0.42}>
        <OrbitRing radius={R * 1.42} dashes={180} speed={0.02} color="#38bdf8" reduced={reduced} />
        <OrbitRing
          radius={R * 1.5}
          width={0.004}
          dashes={24}
          speed={-0.015}
          color="#8b5cf6"
          opacityScale={0.6}
          reduced={reduced}
        />
      </group>
      <Satellite radius={R * 1.62} tilt={[1.1, 0.3, 0]} speed={0.22} phase={0.4} color="#22d3ee" reduced={reduced} />
      <Satellite
        radius={R * 1.78}
        tilt={[-0.9, -0.5, 0.2]}
        speed={-0.16}
        phase={2.6}
        color="#a78bfa"
        reduced={reduced}
      />

      {/* Invisible grab handle so visitors can spin the globe (mouse or touch). */}
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          Object.assign(drag.current, { active: true, x: e.clientX, y: e.clientY, vx: 0 });
          document.body.style.cursor = "grabbing";
        }}
        onPointerOver={() => {
          if (!drag.current.active) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!drag.current.active) document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[R * 1.05, 24, 24]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

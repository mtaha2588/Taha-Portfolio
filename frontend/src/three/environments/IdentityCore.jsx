import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import { universe } from "../../store/universe";
import { profile } from "../../data/profile";
import { fibonacciSphere } from "../geo/sphere";
import HoloRing from "../common/HoloRing";
import HoloPanel, { PanelTitle } from "../common/HoloPanel";
import EnvGroup from "./EnvGroup";
import { ENVIRONMENTS } from "./layout";

const ENV = ENVIRONMENTS.about;
const add = { transparent: true, depthWrite: false, blending: AdditiveBlending };
const CORE_Y = 2.2;

/** Double helix of data points with rungs: the "identity strand". */
function Helix() {
  const { strand, rungs } = useMemo(() => {
    const pts = [];
    const rung = [];
    const N = 90;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const a = t * Math.PI * 6;
      const y = -2 + t * 8.4;
      const p1 = [Math.cos(a) * 2.6, y, Math.sin(a) * 2.6];
      const p2 = [Math.cos(a + Math.PI) * 2.6, y, Math.sin(a + Math.PI) * 2.6];
      pts.push(...p1, ...p2);
      if (i % 3 === 0) rung.push(...p1, ...p2);
    }
    return { strand: new Float32Array(pts), rungs: new Float32Array(rung) };
  }, []);
  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[strand, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#a5f3fc" size={0.09} sizeAttenuation {...add} opacity={0.9} />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[rungs, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8b5cf6" {...add} opacity={0.22} />
      </lineSegments>
    </>
  );
}

function Gyroscope() {
  const rings = useRef([]);
  const core = useMemo(() => fibonacciSphere(500).map((v) => v * 1.1), []);
  const coreRef = useRef();
  useFrame((state) => {
    if (universe.get().reducedMotion) return;
    const t = state.clock.elapsedTime;
    const [a, b, c] = rings.current;
    a.rotation.set(t * 0.35, 0, t * 0.1);
    b.rotation.set(0, t * 0.45, Math.PI / 3);
    c.rotation.set(Math.PI / 2, t * 0.25, -t * 0.3);
    coreRef.current.rotation.y = t * 0.2;
  });
  const colors = ["#22d3ee", "#8b5cf6", "#38bdf8"];
  return (
    <group position-y={CORE_Y}>
      {[1.7, 2.0, 2.3].map((r, i) => (
        <mesh key={r} ref={(el) => (rings.current[i] = el)}>
          <torusGeometry args={[r, 0.012, 8, 160]} />
          <meshBasicMaterial color={colors[i]} {...add} opacity={0.75} />
        </mesh>
      ))}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[core, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#c4b5fd" size={0.05} sizeAttenuation {...add} opacity={0.85} />
      </points>
      <mesh>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial color="#e0f2fe" {...add} opacity={0.7} />
      </mesh>
    </group>
  );
}

/** JSON view of the real profile data, styled like a code editor (as in the design reference). */
function IdentityJson() {
  const data = {
    name: profile.name,
    role: profile.title.split(" | "),
    focus: profile.about.interests,
    availability: profile.availability.open ? "open · remote" : "not currently",
  };
  const json = JSON.stringify(data, null, 2);
  return (
    <HoloPanel position={[4.4, 0.6, 1.4]} width={260} near={24}>
      <PanelTitle>
        identity.json <span className="text-fg-subtle">● ● ●</span>
      </PanelTitle>
      <pre className="text-[9px] leading-snug whitespace-pre-wrap text-cyan-100/90">
        {json.split("\n").map((line, i) => (
          <span key={i} className="block">
            <span className="mr-2 inline-block w-3 text-right text-fg-subtle/60">{i + 1}</span>
            {line}
          </span>
        ))}
      </pre>
    </HoloPanel>
  );
}

function IdentityCard() {
  return (
    <HoloPanel position={[4.0, 4.6, 0.4]} width={230} near={24} accent="violet">
      <PanelTitle>Digital identity</PanelTitle>
      <p className="font-display text-[15px] text-fg">{profile.name}</p>
      <p className="mt-0.5 text-cyan">{profile.title}</p>
      {profile.availability.open && (
        <p className="mt-2 flex items-center gap-1.5 text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {profile.availability.label}
        </p>
      )}
    </HoloPanel>
  );
}

export default function IdentityCore({ reduced }) {
  const helix = useRef();
  useFrame((state) => {
    if (!reduced) helix.current.rotation.y = state.clock.elapsedTime * 0.15;
  });
  return (
    <EnvGroup env={ENV}>
      <HoloRing
        y={0}
        radius={3.4}
        width={0.03}
        dashes={90}
        fill={0.4}
        speed={0.03}
        color="#8b5cf6"
        opacity={0.6}
        reduced={reduced}
      />
      <HoloRing
        y={0}
        radius={3.8}
        width={0.008}
        dashes={1}
        fill={1}
        speed={-0.02}
        color="#22d3ee"
        opacity={0.35}
        reduced={reduced}
      />
      <group ref={helix}>
        <Helix />
      </group>
      <Gyroscope />
      <IdentityCard />
      <IdentityJson />
    </EnvGroup>
  );
}

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, Vector3 } from "three";
import { exhibits, useExhibits } from "../../store/exhibits";
import { universe } from "../../store/universe";
import { SKILL_AREAS } from "../../data/skills";
import EnvGroup, { NearLabel } from "./EnvGroup";
import { ENVIRONMENTS } from "./layout";

const ENV = ENVIRONMENTS.skills;
const add = { transparent: true, depthWrite: false, blending: AdditiveBlending };

// Areas on a tilted ellipse around a central core; alternate depth adds parallax.
const AREA_POS = SKILL_AREAS.map((_, i) => {
  const a = (i / SKILL_AREAS.length) * Math.PI * 2 + 0.3;
  return new Vector3(Math.cos(a) * 7.4, Math.sin(a) * 4.3, i % 2 ? 1.4 : -1.4);
});

// Areas sharing a skill are linked (e.g. Python Development ↔ Automation Engineering).
const LINKS = (() => {
  const out = [];
  for (let i = 0; i < SKILL_AREAS.length; i++)
    for (let j = i + 1; j < SKILL_AREAS.length; j++) {
      const shared = SKILL_AREAS[i].skills.filter((s) => SKILL_AREAS[j].skills.includes(s));
      if (shared.length) out.push([i, j]);
    }
  return out;
})();

const linkVert = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  varying float vT;
  varying float vSeed;
  void main() { vT = aT; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const linkFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vT;
  varying float vSeed;
  void main() {
    float head = fract(uTime * 0.25 + vSeed);
    float pulse = exp(-pow((vT - head) * 12.0, 2.0));
    gl_FragColor = vec4(uColor * (1.0 + pulse * 2.0), (0.14 + pulse * 0.8) * uOpacity);
    #include <colorspace_fragment>
  }
`;

function Links() {
  const mat = useRef();
  const { positions, ts, seeds } = useMemo(() => {
    const pos = [];
    const t = [];
    const s = [];
    LINKS.forEach(([i, j], k) => {
      const a = AREA_POS[i];
      const b = AREA_POS[j];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      t.push(0, 1);
      s.push(k * 0.37, k * 0.37);
    });
    // Spokes from the central core to every area
    AREA_POS.forEach((p, k) => {
      pos.push(0, 0, 0, p.x, p.y, p.z);
      t.push(0, 1);
      s.push(0.5 + k * 0.21, 0.5 + k * 0.21);
    });
    return { positions: new Float32Array(pos), ts: new Float32Array(t), seeds: new Float32Array(s) };
  }, []);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new Color("#67e8f9") }, uOpacity: { value: 1 } }),
    [],
  );
  useFrame((state) => {
    mat.current.uniforms.uTime.value = universe.get().reducedMotion ? 0 : state.clock.elapsedTime;
    mat.current.uniforms.uOpacity.value = exhibits.get().skillArea ? 0.45 : 1;
  });
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aT" args={[ts, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={mat} vertexShader={linkVert} fragmentShader={linkFrag} uniforms={uniforms} {...add} />
    </lineSegments>
  );
}

function AreaNode({ area, position }) {
  const selectedId = useExhibits((s) => s.skillArea);
  const selected = selectedId === area.id;
  const dimmed = selectedId && !selected;
  const core = useRef();
  const orbit = useRef();
  const halo = useRef();
  const s = useRef(1);

  useFrame((state, dt) => {
    const target = selected ? 1.5 : dimmed ? 0.7 : 1;
    s.current += (target - s.current) * (1 - Math.exp(-dt * 6));
    core.current.scale.setScalar(s.current);
    halo.current.material.opacity = selected ? 0.35 : dimmed ? 0.06 : 0.16;
    if (!universe.get().reducedMotion) orbit.current.rotation.z = state.clock.elapsedTime * (selected ? 0.6 : 0.2);
  });

  const select = (e) => {
    e.stopPropagation();
    exhibits.set({ skillArea: selected ? null : area.id });
  };

  return (
    <group position={position}>
      <group ref={core}>
        <mesh>
          <sphereGeometry args={[0.3, 20, 20]} />
          <meshBasicMaterial color={area.color} />
        </mesh>
        <mesh ref={halo}>
          <sphereGeometry args={[0.75, 20, 20]} />
          <meshBasicMaterial color={area.color} {...add} opacity={0.16} />
        </mesh>
      </group>
      {/* Skill satellites orbiting the area node */}
      <group ref={orbit}>
        {area.skills.map((skill, i) => {
          const a = (i / area.skills.length) * Math.PI * 2;
          return (
            <group key={skill} position={[Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0]}>
              <mesh>
                <sphereGeometry args={[0.075, 10, 10]} />
                <meshBasicMaterial color="#e0f2fe" {...add} opacity={dimmed ? 0.25 : 0.9} />
              </mesh>
              {selected && (
                <NearLabel position={[0, -0.28, 0]} near={40} className="!text-[9px] !tracking-[0.12em] text-cyan-100">
                  {skill}
                </NearLabel>
              )}
            </group>
          );
        })}
      </group>
      <NearLabel position={[0, -1.85, 0]} near={40} className={dimmed ? "text-fg-subtle" : "text-fg"}>
        {area.title}
      </NearLabel>
      <mesh
        onClick={select}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function SkillsConstellation() {
  const group = useRef();
  useFrame((state) => {
    if (universe.get().reducedMotion) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.1) * 0.18;
    group.current.rotation.x = Math.sin(t * 0.07) * 0.06;
  });
  return (
    <EnvGroup env={ENV} maxDistance={52}>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[0.6, 1]} />
          <meshBasicMaterial color="#a5f3fc" wireframe {...add} opacity={0.6} />
        </mesh>
        <Links />
        {SKILL_AREAS.map((area, i) => (
          <AreaNode key={area.id} area={area} position={AREA_POS[i]} />
        ))}
      </group>
    </EnvGroup>
  );
}

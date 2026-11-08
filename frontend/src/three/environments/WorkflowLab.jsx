import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  EdgesGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  Vector3,
} from "three";
import { exhibits, useExhibits } from "../../store/exhibits";
import { universe } from "../../store/universe";
import { LAB_STAGES } from "../../data/workflowLab";
import HoloRing from "../common/HoloRing";
import HoloPanel, { PanelTitle } from "../common/HoloPanel";
import EnvGroup, { NearLabel } from "./EnvGroup";
import { ENVIRONMENTS } from "./layout";

const ENV = ENVIRONMENTS.lab;
// Stages on a gentle arc, the middle one furthest from the camera.
const STAGE_POS = LAB_STAGES.map((_, i) => {
  const x = (i - 2) * 4.2;
  return new Vector3(x, 0, (x * x) / 22 - 2.2);
});
const add = { transparent: true, depthWrite: false, blending: AdditiveBlending };
// Ambient glyph motion stops under the OS reduced-motion preference.
const clock = (s) => (universe.get().reducedMotion ? 0 : s.clock.elapsedTime);

function useEdges(factory) {
  const g = useMemo(() => new EdgesGeometry(factory()), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

/* ---- one distinct holographic glyph per stage ---- */

function CollectGlyph({ color, glow }) {
  const disc = useEdges(() => new CylinderGeometry(0.75, 0.75, 0.32, 28, 1));
  const ref = useRef();
  useFrame((s) => (ref.current.rotation.y = clock(s) * 0.3));
  return (
    <group ref={ref}>
      {[0, 0.45, 0.9].map((y) => (
        <lineSegments key={y} geometry={disc} position-y={y}>
          <lineBasicMaterial color={color} {...add} opacity={0.5 + glow * 0.4} />
        </lineSegments>
      ))}
    </group>
  );
}

function ProcessGlyph({ color, glow }) {
  const outer = useEdges(() => new BoxGeometry(1.4, 1.4, 1.4));
  const inner = useEdges(() => new BoxGeometry(0.75, 0.75, 0.75));
  const a = useRef();
  const b = useRef();
  useFrame((s) => {
    const t = clock(s);
    a.current.rotation.set(t * 0.25, t * 0.35, 0);
    b.current.rotation.set(-t * 0.6, -t * 0.4, t * 0.2);
  });
  return (
    <group position-y={0.6}>
      <lineSegments ref={a} geometry={outer}>
        <lineBasicMaterial color={color} {...add} opacity={0.45 + glow * 0.4} />
      </lineSegments>
      <lineSegments ref={b} geometry={inner}>
        <lineBasicMaterial color="#e0f2fe" {...add} opacity={0.6 + glow * 0.4} />
      </lineSegments>
    </group>
  );
}

function AnalyseGlyph({ color, glow }) {
  const net = useEdges(() => new IcosahedronGeometry(0.85, 1));
  const ref = useRef();
  useFrame((s) => (ref.current.rotation.y = clock(s) * 0.4));
  return (
    <group ref={ref} position-y={0.7}>
      <lineSegments geometry={net}>
        <lineBasicMaterial color={color} {...add} opacity={0.45 + glow * 0.45} />
      </lineSegments>
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#e0e7ff" {...add} opacity={0.6 + glow * 0.4} />
      </mesh>
    </group>
  );
}

function DecideGlyph({ color, glow }) {
  const diamond = useEdges(() => new OctahedronGeometry(0.7, 0));
  const ref = useRef();
  useFrame((s) => (ref.current.rotation.y = clock(s) * 0.5));
  const branches = [-0.9, 0, 0.9];
  return (
    <group position-y={0.7}>
      <lineSegments ref={ref} geometry={diamond} scale={[1, 1.35, 1]}>
        <lineBasicMaterial color={color} {...add} opacity={0.5 + glow * 0.4} />
      </lineSegments>
      {branches.map((x, i) => (
        <group key={x}>
          <mesh position={[x * 1.1, 1.35, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial
              color={i === 1 ? "#f5f3ff" : color}
              {...add}
              opacity={i === 1 ? 0.9 : 0.4 + glow * 0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function OutputGlyph({ color, glow }) {
  const plate = useEdges(() => new BoxGeometry(1.0, 1.3, 0.02));
  const ref = useRef();
  useFrame((s) => (ref.current.position.y = 0.75 + Math.sin(clock(s) * 1.2) * 0.08));
  return (
    <group>
      <group ref={ref}>
        {[0, 1, 2].map((i) => (
          <lineSegments key={i} geometry={plate} position={[i * 0.16 - 0.16, i * 0.12, -i * 0.18]}>
            <lineBasicMaterial color={color} {...add} opacity={0.45 + glow * 0.4} />
          </lineSegments>
        ))}
      </group>
      <mesh position-y={3}>
        <cylinderGeometry args={[0.05, 0.3, 4, 12, 1, true]} />
        <meshBasicMaterial color={color} {...add} opacity={0.06 + glow * 0.12} />
      </mesh>
    </group>
  );
}

const GLYPHS = {
  collect: CollectGlyph,
  process: ProcessGlyph,
  analyse: AnalyseGlyph,
  decide: DecideGlyph,
  output: OutputGlyph,
};

function Stage({ stage, index, position }) {
  const selected = useExhibits((s) => s.labStage === stage.id);
  const glowRef = useRef(0.3);
  const scaleRef = useRef();
  const Glyph = GLYPHS[stage.id];

  useFrame((_, dt) => {
    glowRef.current += ((selected ? 1 : 0.3) - glowRef.current) * (1 - Math.exp(-dt * 5));
    scaleRef.current.scale.setScalar(0.9 + glowRef.current * 0.25);
  });

  return (
    <group position={position}>
      <group ref={scaleRef}>
        <Glyph color={stage.color} glow={selected ? 1 : 0.3} />
      </group>
      <HoloRing
        y={0.01}
        radius={1.25}
        width={0.02}
        dashes={36}
        fill={0.5}
        speed={0.08}
        color={stage.color}
        opacity={0.75}
        intensity={glowRef}
      />
      <HoloRing
        y={0.01}
        radius={1.5}
        width={0.006}
        dashes={1}
        fill={1}
        speed={-0.05}
        color={stage.color}
        opacity={0.35}
        intensity={glowRef}
      />
      <NearLabel position={[0, -0.55, 0.6]} className={selected ? "text-fg" : "text-fg-muted"}>
        <span style={{ color: stage.color }}>{String(index + 1).padStart(2, "0")}</span> {stage.title}
      </NearLabel>
      <mesh
        position-y={0.8}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "")}
        onClick={(e) => {
          e.stopPropagation();
          exhibits.set({ labStage: stage.id });
        }}
      >
        <sphereGeometry args={[1.3, 12, 12]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Data packets flowing along the conveyor; "Run pipeline" sends one bright packet end to end. */
function Conveyor({ reduced }) {
  const curve = useMemo(() => new CatmullRomCurve3(STAGE_POS.map((p) => p.clone().setY(0.9))), []);
  const tube = useMemo(() => new BufferGeometry().setFromPoints(curve.getPoints(160)), [curve]);
  useEffect(() => () => tube.dispose(), [tube]);
  const N = 40;
  const positions = useMemo(() => new Float32Array(N * 3), []);
  const points = useRef();
  const runner = useRef();
  const labRun = useExhibits((s) => s.labRun);
  const runStart = useRef(-1);
  const tmp = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (labRun > 0) runStart.current = performance.now();
  }, [labRun]);

  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      curve.getPoint((i / N + t * 0.04) % 1, tmp);
      positions.set([tmp.x, tmp.y, tmp.z], i * 3);
    }
    points.current.geometry.attributes.position.needsUpdate = true;

    const k = runStart.current < 0 ? 2 : (performance.now() - runStart.current) / 5000;
    runner.current.visible = k <= 1;
    if (k <= 1) {
      curve.getPoint(Math.min(1, k), tmp);
      runner.current.position.copy(tmp);
      runner.current.scale.setScalar(1 + Math.sin(k * Math.PI * 10) * 0.25);
    }
  });

  return (
    <>
      <line geometry={tube}>
        <lineBasicMaterial color="#38bdf8" {...add} opacity={0.35} />
      </line>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#a5f3fc" size={0.12} sizeAttenuation {...add} />
      </points>
      <mesh ref={runner} visible={false}>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  );
}

function StagePanel() {
  const id = useExhibits((s) => s.labStage);
  const i = LAB_STAGES.findIndex((s) => s.id === id);
  const stage = LAB_STAGES[i];
  if (!stage) return null;
  const p = STAGE_POS[i];
  return (
    <HoloPanel position={[p.x, 3.4, p.z]} width={230} near={32} scale={1.1}>
      <PanelTitle>
        Stage {String(i + 1).padStart(2, "0")} <span className="text-fg-subtle">{stage.short}</span>
      </PanelTitle>
      <p className="font-display text-[13px] text-fg">{stage.title}</p>
      <ul className="mt-1.5 space-y-0.5">
        {stage.techniques.map((t) => (
          <li key={t}>▸ {t}</li>
        ))}
      </ul>
    </HoloPanel>
  );
}

export default function WorkflowLab({ reduced }) {
  return (
    <EnvGroup env={ENV}>
      <HoloRing
        y={-0.02}
        radius={12}
        width={0.03}
        dashes={160}
        fill={0.35}
        speed={0.015}
        color="#3b82f6"
        opacity={0.45}
        reduced={reduced}
      />
      <HoloRing
        y={-0.02}
        radius={12.6}
        width={0.008}
        dashes={1}
        fill={1}
        speed={-0.01}
        color="#22d3ee"
        opacity={0.3}
        reduced={reduced}
      />
      {LAB_STAGES.map((stage, i) => (
        <Stage key={stage.id} stage={stage} index={i} position={STAGE_POS[i]} />
      ))}
      <Conveyor reduced={reduced} />
      <StagePanel />
    </EnvGroup>
  );
}

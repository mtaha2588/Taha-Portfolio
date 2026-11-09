import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HTML_LAYER } from "../common/htmlLayer";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  EdgesGeometry,
  IcosahedronGeometry,
  QuadraticBezierCurve3,
  Vector3,
} from "three";
import { exhibits, useExhibits } from "../../store/exhibits";
import { mulberry32 } from "../../lib/random";
import HoloRing from "../common/HoloRing";
import HoloPanel, { PanelRow, PanelTitle } from "../common/HoloPanel";
import Exhibit from "./Exhibit";
import { EXHIBITS } from "./layout";
import { buildBrain } from "./brainGeometry";

const EX = EXHIBITS.agent;
const CORE_Y = 2.3;
const BRAIN_CENTER = new Vector3(0, CORE_Y, 0);

const STAGES = [
  { id: "input", label: "Input", pos: new Vector3(-4.7, 1.3, 1.2), color: "#22d3ee" },
  { id: "processing", label: "Processing", pos: new Vector3(-2.1, 4.6, -0.8), color: "#818cf8" },
  { id: "decision", label: "Decision", pos: new Vector3(2.1, 4.6, -0.8), color: "#a78bfa" },
  { id: "output", label: "Output", pos: new Vector3(4.7, 1.3, 1.2), color: "#67e8f9" },
];

/** Which stage the 3D scene should highlight right now, and how far the run has progressed. */
function runState() {
  const { agentRun, agentStep } = exhibits.get();
  if (!agentRun || agentStep < 0) return { active: null, reached: -1 };
  const step = agentRun.steps[Math.min(agentStep, agentRun.steps.length - 1)];
  return { active: step.stage, reached: STAGES.findIndex((s) => s.id === step.stage) };
}

// ------------------------------------------------------------------ neural core

const pointVert = /* glsl */ `
  uniform float uTime;
  uniform float uActivity;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vAlpha;
  varying float vMix;
  void main() {
    vec3 p = position;
    p += normalize(p) * sin(uTime * 1.5 + aRand * 30.0) * 0.015 * (1.0 + uActivity * 2.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float spark = step(0.985, fract(aRand * 91.0 + uTime * (0.2 + uActivity * 0.6)));
    vAlpha = (0.45 + 0.35 * sin(uTime * 2.0 + aRand * 50.0)) * (0.6 + uActivity * 0.6) + spark;
    vMix = aRand;
    gl_PointSize = (1.4 + aRand * 1.8 + spark * 2.5) * uPixelRatio * (14.0 / -mv.z);
  }
`;
const pointFrag = /* glsl */ `
  uniform vec3 uViolet;
  uniform vec3 uCyan;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    vec3 col = mix(uViolet, uCyan, step(0.72, vMix));
    gl_FragColor = vec4(col, smoothstep(0.5, 0.0, d) * vAlpha);
    #include <colorspace_fragment>
  }
`;
const filamentVert = /* glsl */ `
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
const filamentFrag = /* glsl */ `
  uniform float uTime;
  uniform float uActivity;
  uniform vec3 uViolet;
  uniform vec3 uCyan;
  varying float vT;
  varying float vSeed;
  void main() {
    // Signals firing along filaments; more frequent while a workflow runs.
    float head = fract(uTime * (0.4 + vSeed * 0.8) * (1.0 + uActivity * 1.5) + vSeed * 13.0);
    float sig = exp(-pow((vT - head) * 9.0, 2.0)) * step(0.55 - uActivity * 0.35, fract(vSeed * 7.3));
    float a = 0.08 + 0.05 * uActivity + sig * 0.9;
    vec3 col = mix(uViolet, uCyan, sig);
    gl_FragColor = vec4(col * (1.0 + sig), a);
    #include <colorspace_fragment>
  }
`;

function NeuralCore({ quality, reduced }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const pointsMat = useRef();
  const linesMat = useRef();
  const coreRef = useRef();
  const group = useRef();
  const activity = useRef(0.2);
  const brain = useMemo(() => buildBrain({ count: quality === "high" ? 5200 : 2800 }), [quality]);

  const pointUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uPixelRatio: { value: 1 },
      uViolet: { value: new Color("#8b5cf6") },
      uCyan: { value: new Color("#67e8f9") },
    }),
    [],
  );
  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uViolet: { value: new Color("#7c3aed") },
      uCyan: { value: new Color("#a5f3fc") },
    }),
    [],
  );

  useFrame((state, dt) => {
    const t = reduced ? 2 : state.clock.elapsedTime;
    const target = runState().active ? 1 : exhibits.get().hovered === "agent" ? 0.45 : 0.2;
    activity.current += (target - activity.current) * (1 - Math.exp(-dt * 3));
    for (const m of [pointsMat.current, linesMat.current]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uActivity.value = activity.current;
    }
    pointsMat.current.uniforms.uPixelRatio.value = dpr;
    // Three-quarter view shows the brain's profile; a slow sway keeps it alive.
    group.current.rotation.y = -0.95 + (reduced ? 0 : Math.sin(t * 0.12) * 0.3);
    const pulse = 1 + Math.sin(t * 3) * 0.08 * (0.5 + activity.current);
    coreRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={group} position={BRAIN_CENTER}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[brain.positions, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[brain.rands, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={pointsMat}
          vertexShader={pointVert}
          fragmentShader={pointFrag}
          uniforms={pointUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[brain.lines.positions, 3]} />
          <bufferAttribute attach="attributes-aT" args={[brain.lines.t, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[brain.lines.seed, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={linesMat}
          vertexShader={filamentVert}
          fragmentShader={filamentFrag}
          uniforms={lineUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      {/* Processing core glowing at the centre */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.2, 2]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.7} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.12} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ workflow stages

function StageNode({ stage, index, reduced }) {
  const group = useRef();
  const wire = useRef();
  const core = useRef();
  const label = useRef();
  const glow = useRef(0.3);
  const world = useMemo(() => new Vector3(), []);
  const edges = useMemo(() => new EdgesGeometry(new IcosahedronGeometry(0.42, 0)), []);
  useEffect(() => () => edges.dispose(), [edges]);

  useFrame((state, dt) => {
    const { active, reached } = runState();
    const target = active === stage.id ? 1.6 : reached > index ? 0.75 : 0.35;
    glow.current += (target - glow.current) * (1 - Math.exp(-dt * 6));
    const t = reduced ? 0 : state.clock.elapsedTime;
    wire.current.rotation.set(t * 0.4 + index, t * 0.6, 0);
    wire.current.material.opacity = Math.min(1, 0.35 + glow.current * 0.45);
    core.current.scale.setScalar(0.6 + glow.current * 0.45);
    core.current.material.opacity = Math.min(1, 0.3 + glow.current * 0.5);

    group.current.getWorldPosition(world);
    const d = state.camera.position.distanceTo(world);
    if (label.current) label.current.style.opacity = Math.min(1, Math.max(0, (24 - d) / 6)).toFixed(3);
  });

  return (
    <group ref={group} position={stage.pos}>
      <lineSegments ref={wire} geometry={edges}>
        <lineBasicMaterial color={stage.color} transparent depthWrite={false} blending={AdditiveBlending} />
      </lineSegments>
      <mesh ref={core}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color={stage.color} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <HoloRing
        y={-0.55}
        radius={0.62}
        width={0.012}
        dashes={24}
        fill={0.5}
        speed={0.12}
        color={stage.color}
        opacity={0.7}
        intensity={glow}
        reduced={reduced}
      />
      <Html portal={HTML_LAYER} position={[0, 0.85, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <p
          ref={label}
          style={{ opacity: 0 }}
          className="font-mono text-[10px] tracking-[0.25em] whitespace-nowrap text-fg uppercase [text-shadow:0_0_12px_rgba(139,92,246,0.9)]"
        >
          <span className="text-violet-300">{String(index + 1).padStart(2, "0")}</span> {stage.label}
        </p>
      </Html>
    </group>
  );
}

/** Particles streaming Input → Processing → Decision → Output, arcing past the core. */
function WorkflowFlow({ reduced }) {
  const points = useRef();
  const curves = useMemo(
    () =>
      STAGES.slice(0, -1).map((s, i) => {
        const a = s.pos;
        const b = STAGES[i + 1].pos;
        const mid = a.clone().add(b).multiplyScalar(0.5).lerp(BRAIN_CENTER, 0.35);
        return new QuadraticBezierCurve3(a.clone(), mid, b.clone());
      }),
    [],
  );
  const lineGeos = useMemo(() => curves.map((c) => new BufferGeometry().setFromPoints(c.getPoints(48))), [curves]);
  useEffect(() => () => lineGeos.forEach((g) => g.dispose()), [lineGeos]);

  const N = 90;
  const particles = useMemo(() => {
    const rand = mulberry32(17);
    return Array.from({ length: N }, () => ({ curve: Math.floor(rand() * 3), t: rand(), speed: 0.12 + rand() * 0.18 }));
  }, []);
  const positions = useMemo(() => new Float32Array(N * 3), []);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    const { active, reached } = runState();
    const boost = active ? 3 : 1;
    particles.forEach((p, i) => {
      if (!reduced) p.t += dt * p.speed * boost;
      if (p.t > 1) {
        p.t -= 1;
        p.curve = (p.curve + 1) % 3;
      }
      curves[p.curve].getPoint(p.t, tmp);
      positions.set([tmp.x, tmp.y, tmp.z], i * 3);
    });
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.material.size = active ? 0.16 : 0.1;
    points.current.material.opacity = reached >= 0 || exhibits.get().hovered === "agent" ? 1 : 0.6;
  });

  return (
    <>
      {lineGeos.map((g, i) => (
        <line key={i} geometry={g}>
          <lineBasicMaterial
            color={i === 1 ? "#a78bfa" : "#67e8f9"}
            transparent
            opacity={0.25}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </line>
      ))}
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#cffafe"
          size={0.1}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
}

function AgentPanels() {
  const run = useExhibits((s) => s.agentRun);
  const step = useExhibits((s) => s.agentStep);
  const rot = EX.azimuth;
  const current = run && step >= 0 ? run.steps[Math.min(step, run.steps.length - 1)] : null;
  const total = run ? run.steps.reduce((sum, s) => sum + s.duration_ms, 0) : 0;
  return (
    <>
      <HoloPanel position={[4.8, -0.1, 2.8]} rotationY={rot} width={225} accent="violet" scale={0.85}>
        <PanelTitle>Neural processes</PanelTitle>
        <PanelRow label="Engine" value="Rule-based tools" />
        <PanelRow label="Workflows" value="Triage · Sales summary" />
        <PanelRow label="Stages" value="4 · logged per step" />
        <PanelRow label="LLM layer" value="Planned" />
      </HoloPanel>
      <HoloPanel position={[5.0, 4.1, 1.4]} rotationY={rot} width={225} accent="violet" scale={0.8}>
        <PanelTitle>
          Execution log <span className="text-fg-subtle">{run ? `#${run.run_id}` : "IDLE"}</span>
        </PanelTitle>
        {run ? (
          <>
            {run.steps.map((s, i) => (
              <p
                key={s.index}
                className={`flex justify-between gap-2 py-0.5 ${i <= step ? "text-fg" : "text-fg-subtle/60"}`}
              >
                <span className="truncate">
                  {i === step ? "▸ " : ""}
                  {s.tool}
                </span>
                <span className="text-violet-300">{s.stage}</span>
              </p>
            ))}
            <PanelRow label="Total compute" value={`${total.toFixed(2)} ms`} />
          </>
        ) : (
          <p className="text-fg-subtle">Run a workflow from the panel to watch each stage execute here.</p>
        )}
      </HoloPanel>
      {current && (
        <HoloPanel position={[0, 6.6, -1.6]} rotationY={rot} width={260} accent="violet">
          <PanelTitle>
            Step {current.index} · {current.stage}
          </PanelTitle>
          <p className="text-fg">{current.description}</p>
          <p className="mt-1 text-cyan">→ {current.output_summary}</p>
        </HoloPanel>
      )}
    </>
  );
}

export default function AgentExhibit({ quality, reduced }) {
  return (
    <Exhibit ex={EX} index={1} radius={6.2} hitHeight={6.5} color="#8b5cf6" reduced={reduced} panels={<AgentPanels />}>
      {/* Light column rising from the pedestal into the core */}
      <mesh position-y={1.2}>
        <cylinderGeometry args={[1.3, 2.2, 2.4, 32, 1, true]} />
        <meshBasicMaterial color="#6d28d9" transparent opacity={0.07} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <NeuralCore quality={quality} reduced={reduced} />
      <WorkflowFlow reduced={reduced} />
      {STAGES.map((s, i) => (
        <StageNode key={s.id} stage={s} index={i} reduced={reduced} />
      ))}
    </Exhibit>
  );
}

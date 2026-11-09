import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HTML_LAYER } from "../common/htmlLayer";
import { AdditiveBlending, Color, Vector3 } from "three";
import { exhibits, useExhibits } from "../../store/exhibits";
import { SAMPLE_INVENTORY } from "../../data/sampleInventory";
import { createHoloLines, createHoloSurface, tickHolo } from "../common/holoMaterials";
import HoloRing from "../common/HoloRing";
import HoloPanel, { PanelRow, PanelTitle } from "../common/HoloPanel";
import Exhibit from "./Exhibit";
import { EXHIBITS } from "./layout";
import { buildCar, buildWheelLines } from "./carGeometry";

const EX = EXHIBITS.car;
const TEAL = "#5eead4";
const STAGE_COLORS = { Hot: "#c084fc", Warm: "#22d3ee", Nurture: "#3b82f6" };

const money = (n) => `$${n.toLocaleString("en-US")}`;

function useInventory() {
  return useExhibits((s) => s.inventory) ?? SAMPLE_INVENTORY;
}

// ------------------------------------------------------------------ hologram car

function HoloCar({ type, scale = 1, opacity = 1, mirrored = false, reduced, highlight }) {
  const car = useMemo(() => buildCar(type), [type]);
  const wheelGeo = useMemo(() => buildWheelLines(car.wheels[0].r), [car]);
  const range = useMemo(() => [-car.length / 2, car.length / 2], [car]);
  const mats = useMemo(
    () => ({
      surface: createHoloSurface({ color: TEAL, opacity: 0.75 * opacity, range }),
      lines: createHoloLines({ color: TEAL, opacity: 0.6 * opacity, range }),
      wheels: createHoloLines({ color: "#99f6e4", opacity: 0.7 * opacity, range }),
    }),
    [opacity, range],
  );
  const wheelRefs = useRef([]);
  const reveal = useRef(0);

  useEffect(
    () => () => {
      car.surface.dispose();
      car.lines.dispose();
      wheelGeo.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [car, wheelGeo, mats],
  );
  // Re-materialise whenever the body type changes.
  useEffect(() => {
    reveal.current = 0;
  }, [type]);

  useFrame((state, dt) => {
    reveal.current = reduced ? 1 : Math.min(1, reveal.current + dt * 0.7);
    const h = typeof highlight === "object" ? highlight.current : (highlight ?? 1);
    tickHolo(Object.values(mats), { time: state.clock.elapsedTime, reveal: reveal.current, opacity: h });
    if (!reduced) wheelRefs.current.forEach((w) => w && (w.rotation.z -= dt * 1.4));
  });

  return (
    <group scale={[scale, mirrored ? -scale : scale, scale]}>
      <mesh geometry={car.surface} material={mats.surface} />
      <lineSegments geometry={car.lines} material={mats.lines} />
      {car.wheels.map((w, i) => (
        <lineSegments
          key={i}
          ref={(el) => (wheelRefs.current[i] = el)}
          geometry={wheelGeo}
          material={mats.wheels}
          position={[w.x, w.y, w.z]}
        />
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ showroom

const floorVert = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const floorFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vP;
  void main() {
    float fade = smoothstep(7.5, 2.0, length(vP * vec2(0.8, 1.15)));
    // Two glowing lane strips like the studio floor, plus a faint tile grid.
    float lanes = smoothstep(0.06, 0.0, abs(abs(vP.y) - 3.0)) * 0.9;
    vec2 g = abs(fract(vP / 1.2 - 0.5) - 0.5) / fwidth(vP / 1.2);
    float grid = (1.0 - min(min(g.x, g.y), 1.0)) * 0.12;
    float run = exp(-pow(mod(vP.x - uTime * 2.0, 14.0) - 7.0, 2.0) * 0.5) * lanes;
    vec3 base = vec3(0.01, 0.04, 0.05);
    vec3 col = base + vec3(0.37, 0.92, 0.83) * (lanes * 0.5 + grid + run);
    // Mostly opaque so the mirrored car underneath reads as a soft reflection.
    gl_FragColor = vec4(col, fade * 0.82);
    #include <colorspace_fragment>
  }
`;

function ShowroomFloor({ reduced }) {
  const mat = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((state) => {
    mat.current.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.01} renderOrder={2}>
      <planeGeometry args={[16, 11]} />
      <shaderMaterial
        ref={mat}
        vertexShader={floorVert}
        fragmentShader={floorFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function CeilingStrips() {
  return [-1.6, 0, 1.6].map((z) => (
    <group key={z} position={[0, 7.2, z]}>
      <mesh>
        <boxGeometry args={[6, 0.03, 0.1]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.45} />
      </mesh>
      <mesh position-y={-1.4}>
        <cylinderGeometry args={[0.2, 1.4, 2.8, 4, 1, true]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.025} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  ));
}

/** The six sample-inventory vehicles as selectable miniatures on an arc behind the main car. */
function InventoryArc({ reduced }) {
  const inventory = useInventory();
  const selected = useExhibits((s) => s.selectedVehicle);
  const vehicles = inventory.vehicles;
  const base = EX.azimuth + Math.PI; // opposite the camera, so the arc sits behind the main car
  return vehicles.map((v, i) => {
    const a = base + (i / (vehicles.length - 1) - 0.5) * 2.1;
    const pos = [Math.sin(a) * 6.4, 2.8 + Math.sin(i * 1.7) * 0.25, Math.cos(a) * 6.4];
    return (
      <Miniature
        key={v.id}
        vehicle={v}
        position={pos}
        faceAngle={a + Math.PI}
        selected={v.id === selected}
        reduced={reduced}
      />
    );
  });
}

function Miniature({ vehicle, position, faceAngle, selected, reduced }) {
  const group = useRef();
  const glow = useRef(selected ? 1.4 : 0.6);
  const hover = useRef(false);
  const label = useRef();
  const world = useMemo(() => new Vector3(), []);

  useFrame((state, dt) => {
    const target = selected ? 1.5 : hover.current ? 1.1 : 0.55;
    glow.current += (target - glow.current) * (1 - Math.exp(-dt * 6));
    if (!reduced) group.current.rotation.y += dt * (selected ? 0.6 : 0.25);
    group.current.getWorldPosition(world);
    const d = state.camera.position.distanceTo(world);
    if (label.current) label.current.style.opacity = Math.min(1, Math.max(0, (22 - d) / 5)).toFixed(3);
  });

  return (
    <group position={position} rotation-y={faceAngle}>
      <group ref={group}>
        <HoloCar type={vehicle.body_type} scale={0.3} opacity={0.9} reduced={reduced} highlight={glow} />
      </group>
      <HoloRing
        y={-0.02}
        radius={0.85}
        width={0.01}
        dashes={20}
        fill={0.5}
        speed={0.1}
        color={selected ? "#c084fc" : TEAL}
        opacity={0.7}
        intensity={glow}
        reduced={reduced}
      />
      <mesh
        position-y={0.3}
        onPointerOver={(e) => {
          e.stopPropagation();
          hover.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hover.current = false;
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          exhibits.set({ selectedVehicle: vehicle.id });
        }}
      >
        <boxGeometry args={[1.8, 0.8, 1]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <Html portal={HTML_LAYER} position={[0, -0.35, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <p
          ref={label}
          style={{ opacity: 0 }}
          className={`text-center font-mono text-[9px] tracking-wider whitespace-nowrap uppercase ${selected ? "text-violet-200" : "text-teal-100/80"}`}
        >
          {vehicle.name}
          <br />
          <span className="text-fg-subtle">{money(vehicle.price)}</span>
        </p>
      </Html>
    </group>
  );
}

/** Demo leads orbiting the car as data nodes, connected to it by pulsing lines. */
function LeadNetwork({ reduced }) {
  const pipeline = useExhibits((s) => s.pipeline);
  const pulse = useExhibits((s) => s.leadPulse);
  const lastLead = useExhibits((s) => s.lastLead);

  const nodes = useMemo(() => {
    if (!pipeline) return [];
    const list = [];
    for (const [stage, count] of Object.entries(pipeline.by_stage)) {
      for (let i = 0; i < Math.min(count, 12); i++) list.push(stage);
    }
    return list
      .slice(0, 30)
      .map((stage, i) => ({ stage, phase: i * 2.399, r: 4.2 + (i % 3) * 0.45, y: 1.1 + ((i * 7) % 5) * 0.32 }));
  }, [pipeline]);

  const nodePos = useMemo(() => new Float32Array(Math.max(1, nodes.length) * 3), [nodes]);
  const nodeCol = useMemo(() => {
    const arr = new Float32Array(Math.max(1, nodes.length) * 3);
    nodes.forEach((n, i) => {
      const c = new Color(STAGE_COLORS[n.stage]);
      arr.set([c.r, c.g, c.b], i * 3);
    });
    return arr;
  }, [nodes]);
  const linkPos = useMemo(() => new Float32Array(Math.max(1, nodes.length) * 6), [nodes]);
  const pointsRef = useRef();
  const linesRef = useRef();
  const flyer = useRef();
  const flyStart = useRef(-1);

  useEffect(() => {
    if (pulse > 0) flyStart.current = performance.now();
  }, [pulse]);

  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime;
    nodes.forEach((n, i) => {
      const a = n.phase + t * 0.12;
      const x = Math.cos(a) * n.r;
      const z = Math.sin(a) * n.r;
      nodePos.set([x, n.y, z], i * 3);
      linkPos.set([x, n.y, z, 0, 0.8, 0], i * 6);
    });
    if (pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
    if (linesRef.current) {
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.material.opacity = 0.12 + 0.06 * Math.sin(t * 2);
    }

    // A newly created lead flies in from the edge of the showroom to the car.
    if (flyer.current) {
      const k = flyStart.current < 0 ? 2 : (performance.now() - flyStart.current) / 1600;
      flyer.current.visible = k <= 1;
      if (k <= 1) {
        const e = 1 - (1 - k) ** 3;
        flyer.current.position.set(7 * (1 - e), 3.5 * (1 - e) + 0.9 * e + Math.sin(e * Math.PI) * 1.5, -4 * (1 - e));
        flyer.current.scale.setScalar(1 + Math.sin(e * Math.PI) * 0.8);
      }
    }
  });

  const flyColor = lastLead ? STAGE_COLORS[lastLead.stage] : TEAL;

  return (
    <>
      {nodes.length > 0 && (
        <>
          <points ref={pointsRef} frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
              <bufferAttribute attach="attributes-color" args={[nodeCol, 3]} />
            </bufferGeometry>
            <pointsMaterial
              size={0.2}
              vertexColors
              sizeAttenuation
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </points>
          <lineSegments ref={linesRef} frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[linkPos, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={TEAL} transparent opacity={0.15} depthWrite={false} blending={AdditiveBlending} />
          </lineSegments>
        </>
      )}
      <mesh ref={flyer} visible={false}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color={flyColor} />
      </mesh>
    </>
  );
}

/** Holographic bar chart of the live lead pipeline (Hot / Warm / Nurture). */
function PipelineBars() {
  const pipeline = useExhibits((s) => s.pipeline);
  const bars = useRef([]);
  const stages = ["Hot", "Warm", "Nurture"];
  const max = pipeline ? Math.max(1, ...stages.map((s) => pipeline.by_stage[s] || 0)) : 1;

  useFrame((_, dt) => {
    stages.forEach((s, i) => {
      const b = bars.current[i];
      if (!b) return;
      const target = 0.08 + 2.2 * ((pipeline?.by_stage[s] || 0) / max);
      b.scale.y += (target - b.scale.y) * (1 - Math.exp(-dt * 3));
      b.position.y = b.scale.y / 2;
    });
  });

  const rightX = Math.cos(EX.azimuth);
  const rightZ = -Math.sin(EX.azimuth);
  return (
    <group position={[rightX * 4.6 + 1.2, 0, rightZ * 4.6 + 1.6]} rotation-y={EX.azimuth}>
      {stages.map((s, i) => (
        <mesh key={s} ref={(el) => (bars.current[i] = el)} position={[(i - 1) * 0.42, 0.05, 0]} scale={[1, 0.1, 1]}>
          <boxGeometry args={[0.26, 1, 0.26]} />
          <meshBasicMaterial
            color={STAGE_COLORS[s]}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function CarPanels() {
  const inventory = useInventory();
  const selectedId = useExhibits((s) => s.selectedVehicle);
  const pipeline = useExhibits((s) => s.pipeline);
  const lastLead = useExhibits((s) => s.lastLead);
  const v = inventory.vehicles.find((x) => x.id === selectedId) ?? inventory.vehicles[0];
  const rot = EX.azimuth;
  return (
    <>
      <HoloPanel position={[2.46, 0.9, 2.38]} rotationY={rot} width={220} accent="teal" scale={0.7}>
        <PanelTitle>
          Vehicle{" "}
          <span className="text-fg-subtle">{inventory.source === "local" ? "SAMPLE · LOCAL" : "SAMPLE DATA"}</span>
        </PanelTitle>
        <p className="mb-1 font-display text-[13px] text-fg">{v.name}</p>
        <PanelRow label="Year" value={v.year} />
        <PanelRow label="Body" value={v.body_type} />
        <PanelRow label="Fuel" value={v.fuel} />
        <PanelRow label="Mileage" value={`${v.mileage_km.toLocaleString("en-US")} km`} />
        <PanelRow label="Price" value={money(v.price)} />
      </HoloPanel>
      <HoloPanel position={[4.3, 4.7, 1.9]} rotationY={rot} width={220} accent="teal" scale={0.8}>
        <PanelTitle>
          Lead pipeline <span className="text-fg-subtle">{pipeline ? "LIVE" : "OFFLINE"}</span>
        </PanelTitle>
        {pipeline ? (
          <>
            {["Hot", "Warm", "Nurture"].map((s) => (
              <PanelRow
                key={s}
                label={<span style={{ color: STAGE_COLORS[s] }}>● {s}</span>}
                value={pipeline.by_stage[s] ?? 0}
              />
            ))}
            <PanelRow label="Total demo leads" value={pipeline.total_leads} />
            <PanelRow label="Avg score" value={pipeline.average_score ?? "–"} />
            {lastLead && (
              <p className="mt-1 text-violet-200">
                Latest: score {lastLead.score} → {lastLead.stage}
              </p>
            )}
          </>
        ) : (
          <p className="text-fg-subtle">Start the backend to see live demo leads.</p>
        )}
      </HoloPanel>
    </>
  );
}

function MainCar({ reduced, reflection }) {
  const inventory = useInventory();
  const selectedId = useExhibits((s) => s.selectedVehicle);
  const vehicle = inventory.vehicles.find((x) => x.id === selectedId) ?? inventory.vehicles[0];
  const spin = useRef();
  useFrame((_, dt) => {
    if (!reduced) spin.current.rotation.y += dt * 0.16;
  });
  return (
    <group ref={spin}>
      <HoloCar type={vehicle.body_type} scale={1.0} reduced={reduced} />
      {/* Fake reflection: a faint mirrored copy under the semi-transparent floor (high tier only) */}
      {reflection && <HoloCar type={vehicle.body_type} scale={1.0} opacity={0.22} mirrored reduced={reduced} />}
    </group>
  );
}

export default function CarExhibit({ quality, reduced }) {
  return (
    <Exhibit ex={EX} index={2} radius={6.6} hitHeight={4.5} color={TEAL} reduced={reduced} panels={<CarPanels />}>
      <ShowroomFloor reduced={reduced} />
      <HoloRing
        y={0.03}
        radius={3.7}
        width={0.02}
        dashes={72}
        fill={0.5}
        speed={0.04}
        color={TEAL}
        opacity={0.7}
        reduced={reduced}
      />
      <HoloRing
        y={0.03}
        radius={4.0}
        width={0.008}
        dashes={1}
        fill={1}
        speed={-0.03}
        color="#99f6e4"
        opacity={0.45}
        reduced={reduced}
      />
      <MainCar reduced={reduced} reflection={quality === "high"} />
      <CeilingStrips />
      <InventoryArc reduced={reduced} />
      <LeadNetwork reduced={reduced} />
      <PipelineBars />
    </Exhibit>
  );
}

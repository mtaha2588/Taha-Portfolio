import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, PlaneGeometry } from "three";
import { useExhibits, exhibits } from "../../store/exhibits";
import { glowTexture } from "../common/glowTexture";
import HoloRing from "../common/HoloRing";
import HoloPanel, { PanelRow, PanelTitle } from "../common/HoloPanel";
import Exhibit from "./Exhibit";
import { EXHIBITS } from "./layout";

const EX = EXHIBITS.avalanche;
const SIZE = 9; // world units across
const HEIGHT = 4.8; // vertical exaggeration of the relief
const R = SIZE / 2;

const terrainVert = /* glsl */ `
  attribute float aH;
  attribute float aRisk;
  attribute float aSlope;
  varying float vH;
  varying float vRisk;
  varying float vSlope;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;
  void main() {
    vH = aH;
    vRisk = aRisk;
    vSlope = aSlope;
    vUv = uv;
    vPos = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const terrainFrag = /* glsl */ `
  uniform float uTime;
  uniform float uRisk;
  uniform float uReveal;
  uniform float uCells;
  uniform float uRadius;
  varying float vH;
  varying float vRisk;
  varying float vSlope;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec2 vUv;

  float aaLine(float x) {
    float w = fwidth(x);
    return 1.0 - smoothstep(0.0, w * 1.2, abs(fract(x - 0.5) - 0.5));
  }

  void main() {
    float r = length(vPos.xz);
    if (r > uRadius) discard;

    vec3 n = normalize(vNormal);
    float diffuse = max(dot(n, normalize(vec3(-0.45, 0.85, 0.35))), 0.0) * 0.85 + 0.15;

    // Rock → snow by altitude and flatness (snow settles on gentler, higher ground).
    vec3 rock = mix(vec3(0.02, 0.06, 0.14), vec3(0.08, 0.2, 0.36), vH);
    float snow = smoothstep(0.52, 0.86, vH + (n.y - 0.78) * 0.5);
    vec3 col = mix(rock, vec3(0.72, 0.84, 1.0), snow * 0.85) * diffuse;

    // Survey wireframe on the DEM cell grid, plus elevation contours.
    float grid = max(aaLine(vUv.x * uCells), aaLine(vUv.y * uCells));
    float contour = aaLine(vH * 16.0);
    col += vec3(0.12, 0.5, 0.95) * grid * 0.28;
    col += vec3(0.2, 0.85, 1.0) * contour * 0.4;

    // Avalanche start-zone slopes (30–45°) from the backend's slope classification.
    float risk = smoothstep(0.35, 0.8, vRisk) * uRisk;
    col = mix(col, col * 0.7 + vec3(0.55, 0.38, 0.95) * 0.4, risk * 0.55);

    // Satellite scan sweeping across the terrain.
    float sx = mod(uTime * 1.1, uRadius * 2.8) - uRadius * 1.4;
    float scan = exp(-pow((vPos.x - sx) * 2.4, 2.0));
    col += vec3(0.35, 0.9, 1.0) * scan * 0.55;

    // Materialise from the ground up, and fade the edge into the void.
    float shown = smoothstep(uReveal * 1.1, uReveal * 1.1 - 0.06, vH);
    float edge = smoothstep(uRadius, uRadius * 0.78, r);
    gl_FragColor = vec4(col, edge * shown);
    #include <colorspace_fragment>
  }
`;

function buildTerrain(terrain) {
  const n = terrain.size;
  const geo = new PlaneGeometry(SIZE, SIZE, n - 1, n - 1);
  geo.rotateX(-Math.PI / 2);
  const min = terrain.min_elevation_m;
  const span = terrain.max_elevation_m - min || 1;
  const pos = geo.attributes.position;
  const h = new Float32Array(n * n);
  const risk = new Float32Array(n * n);
  const slope = new Float32Array(n * n);
  // PlaneGeometry vertices run row by row from the far (north) edge, matching the DEM's row order.
  for (let i = 0; i < n * n; i++) {
    // A gentle power curve sharpens the summits into ridged peaks.
    const norm = ((terrain.elevation_m[i] - min) / span) ** 1.35;
    // Sink the outer ring slightly so the massif rises out of the base disc.
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const fall = Math.max(0, Math.hypot(x, z) / R - 0.75) * 1.2;
    pos.setY(i, norm * HEIGHT - fall);
    h[i] = norm;
    risk[i] = terrain.slope_class[i] === 2 ? 1 : 0;
    slope[i] = terrain.slope_deg[i];
  }
  geo.setAttribute("aH", new BufferAttribute(h, 1));
  geo.setAttribute("aRisk", new BufferAttribute(risk, 1));
  geo.setAttribute("aSlope", new BufferAttribute(slope, 1));
  geo.computeVertexNormals();

  // Data pillars on the highest start-zone cells (well spread out).
  const candidates = [];
  for (let i = 0; i < n * n; i++) {
    if (terrain.slope_class[i] === 2) candidates.push(i);
  }
  candidates.sort((a, b) => terrain.elevation_m[b] - terrain.elevation_m[a]);
  const pillars = [];
  for (const i of candidates) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    if (Math.hypot(p[0], p[2]) > R * 0.8) continue;
    if (pillars.every((q) => Math.hypot(q.p[0] - p[0], q.p[2] - p[2]) > 1.4)) {
      pillars.push({ p, slope: terrain.slope_deg[i] });
    }
    if (pillars.length >= 7) break;
  }
  return { geo, pillars };
}

function Pillar({ p, delay, reduced }) {
  const beam = useRef();
  const cap = useRef();
  useFrame((state) => {
    const t = reduced ? 1 : state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + delay * 3);
    beam.current.material.opacity = 0.18 + pulse * 0.25;
    cap.current.scale.setScalar(0.8 + pulse * 0.5);
  });
  return (
    <group position={p}>
      <mesh ref={beam} position-y={0.7}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 6, 1, true]} />
        <meshBasicMaterial color="#c4b5fd" transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <mesh ref={cap} position-y={1.42}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#ede9fe" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[0.12, 0.16, 24]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.8} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}

function Terrain({ reduced }) {
  const terrain = useExhibits((s) => s.terrain);
  const mat = useRef();
  const reveal = useRef(0);
  const built = useMemo(() => (terrain ? buildTerrain(terrain) : null), [terrain]);
  useEffect(() => () => built?.geo.dispose(), [built]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRisk: { value: 1 },
      uReveal: { value: 0 },
      uCells: { value: 63 },
      uRadius: { value: R },
    }),
    [],
  );

  useFrame((state, dt) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value = reduced ? 2 : state.clock.elapsedTime;
    u.uCells.value = (terrain?.size ?? 64) - 1;
    const riskTarget = exhibits.get().showRisk ? 1 : 0;
    u.uRisk.value += (riskTarget - u.uRisk.value) * (1 - Math.exp(-dt * 5));
    reveal.current = Math.min(1, reveal.current + dt * 0.45);
    u.uReveal.value = reduced ? 1 : reveal.current;
  });

  if (!built) return null;
  return (
    <group>
      <mesh geometry={built.geo}>
        <shaderMaterial
          ref={mat}
          vertexShader={terrainVert}
          fragmentShader={terrainFrag}
          uniforms={uniforms}
          transparent
        />
      </mesh>
      {built.pillars.map((pl, i) => (
        <Pillar key={i} p={pl.p} delay={i} reduced={reduced} />
      ))}
    </group>
  );
}

function Mist() {
  const tex = glowTexture("rgba(140,190,255,0.32)", "rgba(60,110,200,0.08)");
  const clouds = [
    [-3.8, 0.6, 2.2, 5],
    [3.6, 0.8, 1.4, 5.5],
    [0.5, 0.5, -3.8, 6],
    [-2, 0.3, -2.5, 4],
  ];
  return clouds.map(([x, y, z, s], i) => (
    <sprite key={i} position={[x, y, z]} scale={[s * 1.6, s * 0.7, 1]}>
      <spriteMaterial map={tex} transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} />
    </sprite>
  ));
}

function TerrainPanels() {
  const terrain = useExhibits((s) => s.terrain);
  if (!terrain) return null;
  const start = terrain.classes.find((c) => c.id === 2);
  const rot = EX.azimuth;
  return (
    <>
      <HoloPanel position={[-5.6, 4.4, 0.8]} rotationY={rot} width={230}>
        <PanelTitle>
          DEM input <span className="text-fg-subtle">{terrain.source === "api" ? "LIVE API" : "LOCAL"}</span>
        </PanelTitle>
        <PanelRow label="Grid" value={`${terrain.size} × ${terrain.size}`} />
        <PanelRow label="Coverage" value="8 × 8 km (synthetic)" />
        <PanelRow
          label="Elevation"
          value={`${Math.round(terrain.min_elevation_m)}–${Math.round(terrain.max_elevation_m)} m`}
        />
        <PanelRow label="Method" value="Horn 3×3 slope" />
      </HoloPanel>
      <HoloPanel position={[5.4, 4.8, -0.6]} rotationY={rot} width={230} accent="violet">
        <PanelTitle>Slope analysis</PanelTitle>
        {terrain.classes.map((c) => (
          <div key={c.id} className="py-0.5">
            <div className="flex justify-between">
              <span className={c.id === 2 ? "text-violet-300" : "text-fg-subtle"}>{c.label}</span>
              <span className="text-fg">{c.share_pct}%</span>
            </div>
            <div className="mt-0.5 h-1 rounded bg-white/5">
              <div
                className={`h-1 rounded ${c.id === 2 ? "bg-violet-400" : "bg-cyan/60"}`}
                style={{ width: `${c.share_pct}%` }}
              />
            </div>
          </div>
        ))}
        <p className="mt-2 text-[9px] text-fg-subtle">
          {start?.share_pct}% of cells fall in the 30–45° start-zone band.
        </p>
      </HoloPanel>
      <HoloPanel position={[5.6, 1.3, 2.4]} rotationY={rot} width={210}>
        <PanelTitle>Model layer</PanelTitle>
        <PanelRow label="Classifiers" value="Random Forest · SVM" />
        <PanelRow label="Inputs" value="DEM · satellite · weather" />
        <PanelRow label="Status" value="In development" />
      </HoloPanel>
    </>
  );
}

export default function AvalancheExhibit({ reduced }) {
  return (
    <Exhibit
      ex={EX}
      index={0}
      radius={6}
      hitHeight={5}
      color="#22d3ee"
      reduced={reduced}
      panels={
        <group position-y={0.35}>
          <TerrainPanels />
        </group>
      }
    >
      <group position-y={0.35}>
        <Terrain reduced={reduced} />
        {/* Concentric scanning rings around the massif, as in a survey hologram */}
        <HoloRing
          y={1.0}
          radius={5.0}
          width={0.018}
          dashes={1}
          fill={1}
          speed={0.06}
          color="#38bdf8"
          opacity={0.55}
          reduced={reduced}
        />
        <HoloRing
          y={1.18}
          radius={5.15}
          width={0.012}
          dashes={1}
          fill={1}
          speed={-0.045}
          color="#22d3ee"
          opacity={0.4}
          reduced={reduced}
        />
        <HoloRing
          y={1.34}
          radius={5.3}
          width={0.01}
          dashes={1}
          fill={1}
          speed={0.035}
          color="#67e8f9"
          opacity={0.3}
          reduced={reduced}
        />
        <HoloRing
          y={0.05}
          radius={5.6}
          width={0.06}
          dashes={96}
          fill={0.35}
          speed={0.02}
          color="#3b82f6"
          opacity={0.6}
          reduced={reduced}
        />
        <Mist />
      </group>
    </Exhibit>
  );
}

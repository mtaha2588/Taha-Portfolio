import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import { useExhibits } from "../../store/exhibits";
import HoloRing from "../common/HoloRing";
import EnvGroup from "./EnvGroup";
import { ENVIRONMENTS } from "./layout";

const ENV = ENVIRONMENTS.contact;
const add = { transparent: true, depthWrite: false, blending: AdditiveBlending };
const TOP = 4.6;

/**
 * Transmission beacon: a spire with a rotating crystal that sends signal
 * waves outward. A successful contact-form submission fires a burst.
 */
export default function ContactBeacon({ reduced }) {
  const crystal = useRef();
  const waves = useRef([]);
  const burst = useRef();
  const pulse = useExhibits((s) => s.contactPulse);
  const burstStart = useRef(-1);

  useEffect(() => {
    if (pulse > 0) burstStart.current = performance.now();
  }, [pulse]);

  useFrame((state, dt) => {
    const t = reduced ? 0 : state.clock.elapsedTime;
    if (!reduced) crystal.current.rotation.y += dt * 0.8;
    crystal.current.position.y = TOP + Math.sin(t * 1.4) * 0.12;

    // Expanding signal rings, staggered.
    waves.current.forEach((w, i) => {
      if (!w) return;
      const p = reduced ? 0.4 + i * 0.15 : (t * 0.35 + i / waves.current.length) % 1;
      w.scale.setScalar(0.6 + p * 9);
      w.material.opacity = (1 - p) * 0.5;
    });

    const k = burstStart.current < 0 ? 2 : (performance.now() - burstStart.current) / 1800;
    burst.current.visible = k <= 1;
    if (k <= 1) {
      burst.current.scale.setScalar(0.5 + (1 - (1 - k) ** 3) * 8);
      burst.current.material.opacity = (1 - k) * 0.85;
      crystal.current.scale.setScalar(1 + (1 - k) * 0.8);
    } else {
      crystal.current.scale.setScalar(1);
    }
  });

  return (
    <EnvGroup env={ENV}>
      <HoloRing
        y={0}
        radius={2.6}
        width={0.03}
        dashes={48}
        fill={0.5}
        speed={0.05}
        color="#22d3ee"
        opacity={0.7}
        reduced={reduced}
      />
      <HoloRing
        y={0}
        radius={3.1}
        width={0.008}
        dashes={1}
        fill={1}
        speed={-0.03}
        color="#8b5cf6"
        opacity={0.4}
        reduced={reduced}
      />

      {/* Spire */}
      <mesh position-y={TOP / 2}>
        <cylinderGeometry args={[0.04, 0.22, TOP, 12, 1, true]} />
        <meshBasicMaterial color="#38bdf8" {...add} opacity={0.5} wireframe />
      </mesh>
      {[0.25, 0.5, 0.75].map((f) => (
        <mesh key={f} position-y={TOP * f} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.6 - f * 0.35, 0.01, 6, 48]} />
          <meshBasicMaterial color="#67e8f9" {...add} opacity={0.7} />
        </mesh>
      ))}

      {/* Crystal emitter */}
      <group ref={crystal} position-y={TOP}>
        <mesh scale={[1, 1.5, 1]}>
          <octahedronGeometry args={[0.45, 0]} />
          <meshBasicMaterial color="#a5f3fc" wireframe {...add} opacity={0.9} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Upward transmission beam */}
      <mesh position-y={TOP + 9}>
        <cylinderGeometry args={[0.04, 0.12, 18, 8, 1, true]} />
        <meshBasicMaterial color="#22d3ee" {...add} opacity={0.18} />
      </mesh>

      {/* Signal waves around the crystal */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => (waves.current[i] = el)} position-y={TOP} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.98, 1, 96]} />
          <meshBasicMaterial color={i % 2 ? "#8b5cf6" : "#22d3ee"} {...add} side={DoubleSide} />
        </mesh>
      ))}

      {/* Burst on a successful submission */}
      <mesh ref={burst} position-y={TOP} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.9, 1, 128]} />
        <meshBasicMaterial color="#a5f3fc" {...add} side={DoubleSide} />
      </mesh>
    </EnvGroup>
  );
}

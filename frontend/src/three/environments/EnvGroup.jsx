import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HTML_LAYER } from "../common/htmlLayer";
import { Vector3 } from "three";

/**
 * Positions an environment and turns it to face its camera station
 * (local +Z points at the camera). Skips rendering when the camera is
 * far away, which keeps the frame rate high elsewhere in the universe.
 */
export default function EnvGroup({ env, maxDistance = 48, children }) {
  const group = useRef();
  const world = useMemo(() => new Vector3(...env.position), [env.position]);
  useFrame(({ camera }) => {
    group.current.visible = camera.position.distanceTo(world) < maxDistance;
  });
  return (
    <group ref={group} position={env.position} rotation-y={env.azimuth}>
      {children}
    </group>
  );
}

/**
 * Small HTML label in 3D space that fades in only when the camera is
 * near (DOM labels don't disappear with their parent's `visible`, so
 * the fade is handled here).
 */
export function NearLabel({ position, near = 30, className = "", children }) {
  const group = useRef();
  const el = useRef();
  const world = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    if (!el.current) return;
    group.current.getWorldPosition(world);
    const o = Math.min(1, Math.max(0, (near - camera.position.distanceTo(world)) / 5));
    el.current.style.opacity = o.toFixed(3);
    el.current.style.visibility = o < 0.02 ? "hidden" : "";
  });
  return (
    <group ref={group} position={position}>
      <Html portal={HTML_LAYER} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={el}
          style={{ opacity: 0 }}
          className={`font-mono text-[10px] tracking-[0.22em] whitespace-nowrap uppercase ${className}`}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

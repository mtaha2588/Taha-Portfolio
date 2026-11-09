import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HTML_LAYER } from "./htmlLayer";
import { Vector3 } from "three";

/**
 * A glass information panel floating in 3D space. It is real DOM, so the
 * text stays crisp at any distance; it is hidden from screen readers
 * because the same information is in the accessible HTML panel on the
 * page. It fades in only when the camera comes close, so distant
 * exhibitions stay uncluttered.
 */
export default function HoloPanel({
  position,
  rotationY = 0,
  width = 250,
  near = 26,
  scale = 1,
  accent = "cyan",
  children,
}) {
  const group = useRef();
  const el = useRef();
  const world = useMemo(() => new Vector3(), []);

  useFrame(({ camera }) => {
    if (!group.current || !el.current) return;
    group.current.getWorldPosition(world);
    const d = camera.position.distanceTo(world);
    const o = Math.min(1, Math.max(0, (near - d) / 6));
    el.current.style.opacity = o.toFixed(3);
    // "" (not "visible") so the panel still inherits "hidden" when the whole 3D stage is hidden.
    el.current.style.visibility = o < 0.02 ? "hidden" : "";
  });

  const border = accent === "violet" ? "border-violet/40" : accent === "teal" ? "border-teal-300/40" : "border-cyan/40";

  return (
    <group ref={group} position={position} rotation-y={rotationY} scale={scale}>
      <Html portal={HTML_LAYER} transform distanceFactor={5} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={el}
          aria-hidden="true"
          style={{ width, opacity: 0, visibility: "hidden" }}
          className={`rounded-xl border ${border} bg-[#050a18]/70 p-3 font-mono text-[10px] leading-relaxed text-fg-muted shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)] backdrop-blur-md`}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}

/** Small helpers for consistent panel typography. */
export function PanelTitle({ children }) {
  return (
    <p className="mb-2 flex items-center justify-between text-[9px] tracking-[0.25em] text-cyan uppercase">
      {children}
    </p>
  );
}
export function PanelRow({ label, value }) {
  return (
    <p className="flex justify-between gap-3 border-t border-white/5 py-1">
      <span className="text-fg-subtle">{label}</span>
      <span className="text-right text-fg">{value}</span>
    </p>
  );
}

import { useId, useMemo, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

/**
 * Floating holographic glass slab (styles in index.css, ".holo-*").
 *
 * - Resting perspective (turned slightly toward the 3D scene on the right)
 *   plus a subtle tilt that follows the mouse on desktop.
 * - Gentle floating motion that pauses while the pointer is over the
 *   panel (steady text to read, steady buttons to click); an orbit ring
 *   and floor glow sit behind it.
 * - Tilt and motion are disabled for touch devices and reduced motion,
 *   so text is always flat and readable there.
 */
export default function HoloGlassPanel({ children, className = "" }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const canTilt = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches,
    [],
  );
  const tilt = canTilt && !reduce;
  const [hovered, setHovered] = useState(false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 18 });
  const sy = useSpring(py, { stiffness: 110, damping: 18 });
  // Resting pose ≈ 7° toward the scene; the pointer adds at most ±3°.
  const rotateY = useTransform(sx, (v) => 7 + v * 3);
  const rotateX = useTransform(sy, (v) => 1.5 - v * 2.5);

  const onMove = (e) => {
    if (!tilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
    setHovered(false);
  };

  return (
    <div
      className={`holo-scene ${className}`}
      onPointerMove={onMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={onLeave}
    >
      <div className="holo-base" aria-hidden="true" />

      {/* Orbit ring passing behind the slab */}
      <svg className="holo-orbit" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-orbit`} x1="0" x2="1">
            <stop offset="0" stopColor="#00e5ff" />
            <stop offset="0.5" stopColor="#2563ff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <ellipse
          cx="200"
          cy="50"
          rx="196"
          ry="44"
          fill="none"
          stroke={`url(#${uid}-orbit)`}
          strokeWidth="1.6"
          opacity="0.75"
          vectorEffect="non-scaling-stroke"
        />
        <ellipse
          className="holo-orbit-sweep"
          cx="200"
          cy="50"
          rx="196"
          ry="44"
          fill="none"
          stroke="#a5f3fc"
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <motion.div
        animate={reduce || hovered ? { y: 0 } : { y: [0, -8, 0] }}
        transition={hovered ? { duration: 0.6, ease: "easeOut" } : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div className="holo-slab" style={tilt ? { rotateX, rotateY } : undefined}>
          {tilt && <div className="holo-slab-depth" aria-hidden="true" />}
          <div className="holo-slab-face">
            <div className="holo-sheen" aria-hidden="true" />
            <div className="holo-streak" aria-hidden="true" />
            <span className="holo-corner top-3 left-3 rounded-tl-md border-t border-l" aria-hidden="true" />
            <span className="holo-corner right-3 bottom-3 rounded-br-md border-r border-b" aria-hidden="true" />
            <div className="relative">{children}</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

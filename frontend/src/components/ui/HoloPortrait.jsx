import { useId, useMemo, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import portrait from "../../assets/portrait/taha-portrait.webp";
import { profile } from "../../data/profile";

/**
 * Holographic 3D portrait card (styles: ".hp-*" in index.css).
 *
 * Layers sit at different depths inside a card that tilts toward the
 * pointer, so the backdrop, the photo and the HUD move with real
 * parallax. Hologram effects (scan lines, scanning beam, tint, sheen)
 * are masked to the silhouette and kept subtle so the photo stays
 * natural and professional. Tilt and motion are off for touch devices
 * and reduced-motion users.
 */
export default function HoloPortrait({ className = "" }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const scene = useRef(null);
  const canTilt = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches, []);
  const tilt = canTilt && !reduce;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 16 });
  const sy = useSpring(py, { stiffness: 120, damping: 16 });
  const rotateY = useTransform(sx, (v) => v * 11);
  const rotateX = useTransform(sy, (v) => -v * 9);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    // The light glint follows the pointer even when tilt is disabled.
    scene.current?.style.setProperty("--hp-x", `${(nx * 100).toFixed(1)}%`);
    scene.current?.style.setProperty("--hp-y", `${(ny * 100).toFixed(1)}%`);
    if (!tilt) return;
    px.set((nx - 0.5) * 2);
    py.set((ny - 0.5) * 2);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  const silhouette = {
    maskImage: `url(${portrait})`,
    WebkitMaskImage: `url(${portrait})`,
  };
  const firstName = profile.name.split(" ")[0];

  return (
    <figure ref={scene} className={`hp-scene ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div className="hp-card" style={tilt ? { rotateX, rotateY } : undefined}>
          <div className="hp-clip">
            <div className="hp-backdrop" aria-hidden="true" />
            <svg className="hp-rings" viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <linearGradient id={`${uid}-ring`} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#00e5ff" />
                  <stop offset="0.5" stopColor="#2563ff" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <g className="hp-spin">
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke={`url(#${uid}-ring)`}
                  strokeWidth="0.8"
                  strokeDasharray="2 5"
                  opacity="0.8"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="0.6"
                  strokeDasharray="40 14 6 14"
                  opacity="0.6"
                />
              </g>
              <g className="hp-spin-rev">
                <circle
                  cx="100"
                  cy="100"
                  r="64"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="0.8"
                  strokeDasharray="60 30"
                  opacity="0.55"
                />
                <circle cx="100" cy="8" r="2" fill="#a5f3fc" />
              </g>
            </svg>
            <div className="hp-column" aria-hidden="true" />

            <div className="hp-figure">
              <img src={portrait} alt={`Portrait of ${profile.name}`} className="hp-photo" width="640" height="651" />
              <div className="hp-fx hp-tint" style={silhouette} aria-hidden="true" />
              <div className="hp-fx hp-scanlines" style={silhouette} aria-hidden="true" />
              <div className="hp-fx hp-scanbeam" style={silhouette} aria-hidden="true" />
              <div className="hp-fx hp-sheen" style={silhouette} aria-hidden="true" />
            </div>
          </div>

          <div className="hp-hud" aria-hidden="true">
            <span className="hp-corner top-3 left-3 rounded-tl-md border-t-2 border-l-2" />
            <span className="hp-corner top-3 right-3 rounded-tr-md border-t-2 border-r-2" />
            <span className="hp-corner bottom-3 left-3 rounded-bl-md border-b-2 border-l-2" />
            <span className="hp-corner right-3 bottom-3 rounded-br-md border-r-2 border-b-2" />
            <p className="absolute top-5 left-6 font-mono text-[9px] tracking-[0.3em] text-holo-cyan uppercase">
              Holo-ID · {profile.initials}-01
            </p>
            <div className="hp-plate px-3.5 py-2.5">
              <p className="font-display text-[15px] leading-tight font-semibold text-fg">{profile.name}</p>
              <p className="mt-0.5 font-mono text-[9px] tracking-[0.14em] text-holo-cyan uppercase">
                AI Developer · Automation Engineer
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
      <div className="hp-base" aria-hidden="true" />
      <figcaption className="sr-only">
        {firstName}: {profile.title}
      </figcaption>
    </figure>
  );
}

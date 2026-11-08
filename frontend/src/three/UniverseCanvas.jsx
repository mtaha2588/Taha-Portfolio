import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { motion, universe, useUniverse } from "../store/universe";
import { useExhibits } from "../store/exhibits";
import CameraRig from "./CameraRig";
import Starfield from "./Starfield";
import HoloGlobe from "./HoloGlobe";
import GroundGrid from "./GroundGrid";
import AvalancheExhibit from "./exhibits/AvalancheExhibit";
import AgentExhibit from "./exhibits/AgentExhibit";
import CarExhibit from "./exhibits/CarExhibit";
import WorkflowLab from "./environments/WorkflowLab";
import SkillsConstellation from "./environments/SkillsConstellation";
import IdentityCore from "./environments/IdentityCore";
import ContactBeacon from "./environments/ContactBeacon";
import Effects from "./Effects";

/** Tells the rest of the app the GPU has rendered its first real frame (shaders compiled). */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) universe.set({ canvasReady: true });
  });
  return null;
}

/**
 * The fixed, full-screen WebGL layer behind the page. Loaded lazily, so
 * three.js only downloads for visitors who get the 3D experience.
 */
export default function UniverseCanvas({ active = true }) {
  const quality = useUniverse((s) => s.quality);
  const reduced = useUniverse((s) => s.reducedMotion);
  const high = quality === "high";
  // While inspecting an exhibit, touch drags rotate it instead of scrolling the page.
  const focused = useExhibits((s) => s.focused);
  const [dpr, setDpr] = useState(high ? 1.75 : 1.25);
  const [effects, setEffects] = useState(high);

  // Normalised pointer position for camera parallax.
  useEffect(() => {
    const onMove = (e) => {
      motion.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      motion.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, dpr]}
      camera={{ fov: 42, near: 0.1, far: 600, position: [0, 7, 45] }}
      gl={{ antialias: !effects, powerPreference: "high-performance", alpha: false, stencil: false }}
      style={{ touchAction: focused ? "none" : "pan-y" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#02040a", 1);
        // Performance auditing: open the site with ?stats to expose renderer.info in the console.
        if (new URLSearchParams(window.location.search).has("stats")) window.__aiuRenderer = gl;
      }}
      aria-hidden="true"
    >
      {/* Adaptive quality: lower resolution, then drop post-processing, if the frame rate struggles. */}
      <PerformanceMonitor
        onDecline={() => {
          setDpr((d) => Math.max(1, d - 0.25));
          if (dpr <= 1.25) setEffects(false);
        }}
        onIncline={() => setDpr((d) => Math.min(high ? 2 : 1.5, d + 0.25))}
        flipflops={3}
        onFallback={() => {
          setDpr(1);
          setEffects(false);
        }}
      />
      <ReadySignal />
      <CameraRig />
      <Starfield quality={quality} />
      <HoloGlobe quality={quality} reduced={reduced} />
      <GroundGrid />
      <AvalancheExhibit reduced={reduced} />
      <AgentExhibit quality={quality} reduced={reduced} />
      <CarExhibit quality={quality} reduced={reduced} />
      <WorkflowLab reduced={reduced} />
      <SkillsConstellation />
      <IdentityCore reduced={reduced} />
      <ContactBeacon reduced={reduced} />
      {effects && <Effects />}
    </Canvas>
  );
}

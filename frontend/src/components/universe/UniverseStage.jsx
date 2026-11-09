import { Component, Suspense, lazy, useState } from "react";
import { universe, useUniverse } from "../../store/universe";
import BackgroundCanvas from "../layout/BackgroundCanvas";
import { HTML_LAYER } from "../../three/common/htmlLayer";

// three.js + scene code lives in its own chunk, downloaded only in 3D mode.
const UniverseCanvas = lazy(() => import("../../three/UniverseCanvas"));

/** If WebGL fails at runtime (lost context, driver issue), fall back to the 2D site. */
class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("3D scene failed, switching to the 2D version:", error);
    universe.set({ webgl: false, mode: "lite", introDone: true });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Mounted once for the whole app (see App.jsx). Once the 3D scene has
 * started it is never torn down: on other pages, or when the visitor
 * switches "3D Off", it is only hidden and paused (frameloop "never").
 * Tearing it down mid-render crashed React (removeChild) because the
 * scene's floating HTML panels live in their own DOM roots.
 */
export default function UniverseStage({ active = true }) {
  const mode = useUniverse((s) => s.mode);
  const immersive = mode === "immersive";
  // The canvas is only created the first time 3D is actually wanted (never for no-WebGL devices).
  const [started, setStarted] = useState(immersive);
  if (immersive && !started) setStarted(true);

  const showCanvas = active && immersive;
  return (
    <>
      {active && !immersive && <BackgroundCanvas />}
      {started && (
        <div
          className="fixed inset-0 z-0 bg-[#02040a]"
          style={{ visibility: showCanvas ? "visible" : "hidden" }}
          aria-hidden={!showCanvas}
        >
          <WebGLBoundary>
            <Suspense fallback={null}>
              <UniverseCanvas active={showCanvas} />
            </Suspense>
          </WebGLBoundary>
          {/* Stable container for the scene's HTML labels and panels (see three/common/htmlLayer.js).
              The ref is attached before the lazily loaded scene renders its first frame. */}
          <div
            ref={(el) => {
              if (el) HTML_LAYER.current = el;
            }}
            className="pointer-events-none absolute inset-0 overflow-hidden"
          />
        </div>
      )}
    </>
  );
}

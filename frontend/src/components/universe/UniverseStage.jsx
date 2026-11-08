import { Component, Suspense, lazy } from "react";
import { universe, useUniverse } from "../../store/universe";
import BackgroundCanvas from "../layout/BackgroundCanvas";

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
 * Mounted once for the whole app (see App.jsx) and only hidden + paused on
 * other pages. Returning to the universe is then instant, and the 3D scene
 * is never torn down mid page-transition.
 */
export default function UniverseStage({ active = true }) {
  const mode = useUniverse((s) => s.mode);
  if (mode === "lite") return active ? <BackgroundCanvas /> : null;
  return (
    <div
      className="fixed inset-0 z-0 bg-[#02040a]"
      style={{ visibility: active ? "visible" : "hidden" }}
      aria-hidden={!active}
    >
      <WebGLBoundary>
        <Suspense fallback={null}>
          <UniverseCanvas active={active} />
        </Suspense>
      </WebGLBoundary>
    </div>
  );
}

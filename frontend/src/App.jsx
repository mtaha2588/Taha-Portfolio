import { StrictMode, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import UniverseStage from "./components/universe/UniverseStage";
import UniversePage from "./pages/UniversePage";
import ProjectPage from "./pages/ProjectPage";
import NotFoundPage from "./pages/NotFoundPage";

/** Fades between pages and starts each new page at the top (or at its #hash). */
function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") return; // the universe page manages its own scroll
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {/* The 3D stage sits outside StrictMode: StrictMode's development-only double
          mount breaks drei's <Html> overlays (each is its own React root). All page
          content below is still checked by StrictMode. */}
      <UniverseStage active={location.pathname === "/"} />
      <StrictMode>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<UniversePage />} />
              <Route path="/projects/:slug" element={<ProjectPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </StrictMode>
    </>
  );
}

export default function App() {
  return (
    // reducedMotion="user": Framer Motion honours the OS "reduce motion" setting everywhere.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </MotionConfig>
  );
}

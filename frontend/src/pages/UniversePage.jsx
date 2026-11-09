import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, universe, useUniverse } from "../store/universe";
import { exhibits, useExhibits } from "../store/exhibits";
import { focusExhibit, lockScroll } from "../lib/focus";
import FocusOverlay from "../components/universe/FocusOverlay";
import { useScrollStations } from "../hooks/useScrollStations";
import { usePageTitle } from "../hooks/usePageTitle";
import { useExhibitData } from "../hooks/useExhibitData";
import { EXHIBITS } from "../three/exhibits/layout";
import Intro from "../components/universe/Intro";
import Hud from "../components/universe/Hud";
import HeroSection from "../components/sections/HeroSection";
import ExhibitionsOverview from "../components/sections/ExhibitionsOverview";
import ExhibitSection from "../components/sections/ExhibitSection";
import SlopeAssessor from "../components/demos/SlopeAssessor";
import WorkflowRunner from "../components/demos/WorkflowRunner";
import LeadSimulator from "../components/demos/LeadSimulator";
import LabSection from "../components/sections/LabSection";
import SkillsSection from "../components/sections/SkillsSection";
import AboutSection from "../components/sections/AboutSection";
import ContactSection from "../components/sections/ContactSection";
import Footer from "../components/layout/Footer";

/**
 * The main experience. Layers, back to front:
 *   UniverseStage - fixed WebGL canvas (or the CSS backdrop in 2D mode)
 *   <main>        - scrollable HTML sections; each one is a camera station
 *   Hud           - fixed navigation & readouts
 *   Intro         - the cinematic opening overlay
 */
export default function UniversePage() {
  usePageTitle();
  useExhibitData();
  const mode = useUniverse((s) => s.mode);
  const immersive = mode === "immersive";

  useEffect(() => {
    if (!immersive) universe.set({ introDone: true });
  }, [immersive]);

  useScrollStations(immersive);

  const focused = useExhibits((s) => s.focused);
  const introDone = useUniverse((s) => s.introDone);
  const { hash, search } = useLocation();
  const navigate = useNavigate(); // stable across renders
  const focusParam = new URLSearchParams(search).get("focus");

  // Arriving with #section (e.g. "Back to the universe" from a case study): scroll there.
  useEffect(() => {
    if (!introDone || !hash) return;
    const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(id);
  }, [introDone, hash]);

  // Arriving with ?focus=<exhibit> ("Explore in 3D" on a case study): fly straight into focus mode.
  useEffect(() => {
    if (!introDone || !focusParam || !immersive) return;
    const id = setTimeout(() => {
      focusExhibit(focusParam);
      navigate({ pathname: "/", search: "" }, { replace: true });
    }, 300);
    return () => clearTimeout(id);
  }, [introDone, focusParam, immersive, navigate]);

  // Leaving the page must never leave scrolling locked or the camera in focus mode.
  useEffect(
    () => () => {
      exhibits.set({ focused: null, hovered: null });
      Object.assign(motion.focus, { blend: 0, zoom: 1 });
      motion.focusKey = null;
      lockScroll(false);
      document.documentElement.style.overflow = "";
      document.body.style.cursor = "";
    },
    [],
  );

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-ink-800 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      {/* HUD comes first in the DOM so keyboard users reach the navigation right after the skip link. */}
      <Hud />
      <main
        id="main"
        aria-hidden={focused ? true : undefined}
        // pointer-events-none on <main> itself: only its panels take clicks, so pointer events reach the 3D scene behind it.
        className={`pointer-events-none relative z-10 transition-opacity duration-700 ${focused ? "opacity-0 [&_*]:!pointer-events-none" : "opacity-100"}`}
      >
        <HeroSection />
        <ExhibitionsOverview />
        <ExhibitSection ex={EXHIBITS.avalanche} station={2} number="01" demo={<SlopeAssessor />} />
        <ExhibitSection ex={EXHIBITS.agent} station={3} number="02" demo={<WorkflowRunner />} variant="holo" />
        <ExhibitSection ex={EXHIBITS.car} station={4} number="03" demo={<LeadSimulator />} />
        <LabSection />
        <SkillsSection />
        <AboutSection />
        <ContactSection />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <FocusOverlay />
      {immersive && <Intro />}
    </>
  );
}

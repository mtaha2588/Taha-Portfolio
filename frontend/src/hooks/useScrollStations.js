import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, universe } from "../store/universe";

gsap.registerPlugin(ScrollTrigger);

/**
 * Connects page scrolling to the 3D camera.
 *
 * Every <section data-station="N"> gets a GSAP ScrollTrigger. While a
 * section passes through the middle of the screen, its progress is
 * turned into a continuous station value (e.g. 1.3 = 30% of the way
 * from station 1 to 2), which CameraRig reads every frame.
 */
export function useScrollStations(enabled) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const sections = [...document.querySelectorAll("[data-station]")];
    const last = sections.length - 1;

    const triggers = sections.map((section) => {
      const index = Number(section.dataset.station);
      const update = (self) => {
        const value = Math.min(Math.max(index + self.progress - 0.5, 0), last);
        motion.station = value;
        universe.set({ station: Math.round(value) });
      };
      return ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onUpdate: update,
        onToggle: (self) => self.isActive && update(self),
      });
    });

    ScrollTrigger.refresh();
    return () => triggers.forEach((t) => t.kill());
  }, [enabled]);
}

export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

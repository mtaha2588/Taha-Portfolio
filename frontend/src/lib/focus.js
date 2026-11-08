import gsap from "gsap";
import { exhibits } from "../store/exhibits";
import { motion, universe } from "../store/universe";
import { EXHIBITS } from "../three/exhibits/layout";

/**
 * Focus (inspect) mode controller.
 *
 * Entering: the page jumps to the exhibit's section (so leaving returns
 * there), scrolling locks, and GSAP tweens motion.focus.blend 0 → 1, which
 * CameraRig uses to glide from the scroll pose to a close-up.
 */
const duration = () => (universe.get().reducedMotion ? 0.01 : 1.6);

// A dedicated class (not the inline style the intro also uses), so nothing else can undo the lock.
export function lockScroll(on) {
  document.documentElement.classList.toggle("scroll-locked", on);
}

export function focusExhibit(key) {
  const ex = EXHIBITS[key];
  if (!ex || universe.get().mode !== "immersive") return;
  if (!exhibits.get().focused) {
    document.getElementById(ex.sectionId)?.scrollIntoView({ behavior: "auto", block: "start" });
  }
  motion.focusKey = key;
  motion.focus.zoom = 1;
  exhibits.set({ focused: key, hovered: null });
  lockScroll(true);
  gsap.to(motion.focus, { blend: 1, duration: duration(), ease: "power3.inOut", overwrite: true });
}

export function exitFocus() {
  if (!exhibits.get().focused) return;
  exhibits.set({ focused: null });
  lockScroll(false);
  gsap.to(motion.focus, {
    blend: 0,
    duration: duration() * 0.85,
    ease: "power3.inOut",
    overwrite: true,
    onComplete: () => {
      motion.focusKey = null;
    },
  });
}

export function zoomFocus(delta) {
  motion.focus.zoom = Math.min(1.45, Math.max(0.65, motion.focus.zoom + delta));
}

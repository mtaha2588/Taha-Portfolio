import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { profile } from "../../data/profile";
import { finishIntroValues, motion, universe, useUniverse } from "../../store/universe";

const SEEN_KEY = "aiu:intro-seen";
const BRAND = "AI INTELLIGENCE UNIVERSE";

function introSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Cinematic opening, about five seconds long:
 *  stars fade in → floor grid lights up → globe materialises from the south pole
 *  → camera sweeps in from deep space → title text resolves out of blur.
 *
 * A GSAP timeline animates both the 3D values (motion.intro) and the text.
 * Skippable with the button or the Escape key. Plays in full once per browser
 * session; repeat visits and reduced-motion users get a quick fade instead.
 */
export default function Intro() {
  const ready = useUniverse((s) => s.canvasReady);
  const done = useUniverse((s) => s.introDone);
  const reduced = useUniverse((s) => s.reducedMotion);
  const [full] = useState(() => !introSeen() && !reduced);
  const [timedOut, setTimedOut] = useState(false);
  const root = useRef(null);
  const timeline = useRef(null);

  // Lock scrolling and start at the top while the intro runs.
  useLayoutEffect(() => {
    if (done) return;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [done]);

  // If the GPU is very slow to start, don't keep visitors waiting.
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 7000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (done || !(ready || timedOut)) return;

    const finish = () => {
      finishIntroValues();
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      universe.set({ introDone: true });
    };

    if (!full) {
      // Short version: bring the world up quickly, no title sequence.
      const tl = gsap.timeline({ onComplete: finish });
      tl.to(motion.intro, {
        stars: 1,
        grid: 1,
        reveal: 1,
        dolly: 0,
        orbit: 0,
        duration: reduced ? 0.01 : 1.4,
        ease: "power2.out",
      });
      timeline.current = tl;
      return () => tl.kill();
    }

    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(motion.intro, { stars: 1, duration: 1.6, ease: "power1.inOut" }, 0)
      .to(motion.intro, { grid: 1, duration: 3.2, ease: "power2.inOut" }, 0.5)
      .to(motion.intro, { reveal: 1, duration: 2.9, ease: "power2.inOut" }, 0.7)
      .to(motion.intro, { dolly: 0, orbit: 0, duration: 4.6, ease: "power3.inOut" }, 0.15)
      .fromTo(
        q(".intro-char"),
        { opacity: 0, y: 14, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.035, ease: "power3.out" },
        1.0,
      )
      .fromTo(q(".intro-rule"), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 1.6)
      .fromTo(
        q(".intro-line"),
        { opacity: 0, y: 10, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.35, ease: "power2.out" },
        2.1,
      )
      .to(q(".intro-text"), { opacity: 0, y: -12, filter: "blur(8px)", duration: 0.7, ease: "power2.in" }, 4.4)
      .to(q(".intro-skip"), { opacity: 0, duration: 0.4 }, 4.4);
    timeline.current = tl;
    return () => tl.kill();
  }, [ready, timedOut, done, full, reduced]);

  useEffect(() => {
    if (done) return;
    const onKey = (e) => e.key === "Escape" && timeline.current?.progress(1);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done]);

  if (done) return null;

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-live="polite"
    >
      {!ready && !timedOut && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-40 overflow-hidden bg-white/10">
            <div className="h-full w-1/3 animate-[intro-load_1.2s_ease-in-out_infinite] bg-cyan" />
          </div>
          <p className="font-mono text-[11px] tracking-[0.35em] text-fg-subtle">INITIALISING UNIVERSE</p>
        </div>
      )}

      {full && (
        <div className="intro-text text-center">
          <h1 className="font-display text-[clamp(1.6rem,5.2vw,4.25rem)] font-semibold tracking-[0.18em] text-fg">
            {BRAND.split("").map((ch, i) => (
              <span key={i} className="intro-char inline-block opacity-0" aria-hidden="true">
                {ch === " " ? " " : ch}
              </span>
            ))}
            <span className="sr-only">{BRAND}</span>
          </h1>
          <div className="intro-rule mx-auto mt-6 h-px w-48 origin-center scale-x-0 bg-gradient-to-r from-transparent via-cyan to-transparent" />
          <p className="intro-line mt-6 font-display text-lg text-fg opacity-0 sm:text-2xl">{profile.headline}</p>
          <p className="intro-line mt-3 font-mono text-[11px] tracking-[0.2em] text-cyan uppercase opacity-0 sm:text-xs">
            {profile.title}
          </p>
        </div>
      )}

      {(ready || timedOut) && (
        <button
          type="button"
          onClick={() => timeline.current?.progress(1)}
          className="intro-skip glass pointer-events-auto absolute right-5 bottom-6 rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-fg-muted uppercase transition-colors hover:text-fg sm:right-8 sm:bottom-8"
        >
          Skip intro <span className="hidden text-fg-subtle sm:inline">· Esc</span>
        </button>
      )}
    </div>
  );
}

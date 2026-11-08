import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Minus, Move3d, Plus } from "lucide-react";
import { useExhibits } from "../../store/exhibits";
import { exitFocus, focusExhibit, zoomFocus } from "../../lib/focus";
import { EXHIBIT_LIST, EXHIBITS } from "../../three/exhibits/layout";
import { useProjects } from "../../hooks/useProjects";
import StatusBadge from "../ui/StatusBadge";

/**
 * Controls shown while an exhibition is in focus mode. Keyboard:
 * Esc = back to the universe, ← / → = previous / next exhibition.
 * Mouse wheel zooms; drag on the object rotates it.
 */
export default function FocusOverlay() {
  const focused = useExhibits((s) => s.focused);
  const { projects } = useProjects();
  const backRef = useRef(null);
  const ex = focused ? EXHIBITS[focused] : null;
  const project = ex && projects.find((p) => p.slug === ex.slug);
  const i = ex ? EXHIBIT_LIST.indexOf(ex) : -1;
  const prev = i >= 0 ? EXHIBIT_LIST[(i + EXHIBIT_LIST.length - 1) % EXHIBIT_LIST.length] : null;
  const next = i >= 0 ? EXHIBIT_LIST[(i + 1) % EXHIBIT_LIST.length] : null;

  useEffect(() => {
    if (!focused) return;
    backRef.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") exitFocus();
      if (e.key === "ArrowLeft") focusExhibit(prev.key);
      if (e.key === "ArrowRight") focusExhibit(next.key);
    };
    const onWheel = (e) => zoomFocus(e.deltaY * 0.0008);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, [focused, prev, next]);

  return (
    <AnimatePresence>
      {ex && project && (
        <motion.div
          key="focus"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pointer-events-none fixed inset-0 z-40"
          role="dialog"
          aria-label={`Inspecting ${project.title} in 3D`}
        >
          <div className="pointer-events-auto absolute top-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-ink-950/60 px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] whitespace-nowrap text-fg-muted uppercase backdrop-blur lg:top-24">
            <Move3d size={13} className="text-cyan" aria-hidden="true" />
            Drag to rotate<span className="hidden sm:inline"> · Scroll to zoom · Esc to exit</span>
          </div>

          <div className="pointer-events-auto absolute inset-x-3 bottom-4 mx-auto max-w-4xl sm:bottom-6">
            <div className="glass gradient-border flex flex-wrap items-center gap-3 rounded-2xl !bg-ink-950/75 p-3 sm:flex-nowrap sm:gap-4 sm:p-4">
              <button ref={backRef} type="button" onClick={exitFocus} className="btn-ghost !px-3 !py-2 !text-sm">
                <ArrowLeft size={16} />
                <span className="sm:hidden">Back</span>
                <span className="hidden sm:inline">Back to universe</span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] tracking-[0.25em] whitespace-nowrap text-fg-subtle uppercase">
                  Exhibit {String(i + 1).padStart(2, "0")} / {String(EXHIBIT_LIST.length).padStart(2, "0")}
                </p>
                <p className="truncate font-display text-base font-semibold text-fg sm:text-lg">{project.title}</p>
              </div>
              <StatusBadge status={project.status} className="hidden shrink-0 lg:inline-flex" />

              <div className="flex items-center gap-1">
                <IconButton label="Zoom out" onClick={() => zoomFocus(0.12)}>
                  <Minus size={16} />
                </IconButton>
                <IconButton label="Zoom in" onClick={() => zoomFocus(-0.12)}>
                  <Plus size={16} />
                </IconButton>
                <IconButton label={`Previous: ${prev.label}`} onClick={() => focusExhibit(prev.key)}>
                  <ChevronLeft size={16} />
                </IconButton>
                <IconButton label={`Next: ${next.label}`} onClick={() => focusExhibit(next.key)}>
                  <ChevronRight size={16} />
                </IconButton>
              </div>

              <Link to={`/projects/${project.slug}`} onClick={exitFocus} className="btn-primary !px-3 !py-2 !text-sm">
                Case study <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line-strong text-fg-muted transition-colors hover:border-cyan/50 hover:text-fg"
    >
      {children}
    </button>
  );
}
